import { NextResponse } from "next/server";
import { readSession } from "../../../../../apps/api/src/auth";
import { db } from "../../../../lib/db";
import { decodeOddsSnapshot, extractMatchOdds, type MatchOdds } from "../../../../../packages/txline-client/src/odds-normalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletFromRequest(request: Request, secret: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("daze_session="))
    ?.slice("daze_session=".length);
  return readSession(token, secret)?.wallet ?? null;
}

const trunc = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fixtureId = url.searchParams.get("fixtureId");
  if (!fixtureId || !/^\d+$/.test(fixtureId)) {
    return NextResponse.json({ error: "A fixtureId query param is required" }, { status: 400 });
  }

  const secret = process.env.AUTH_SESSION_SECRET;
  const wallet = secret ? walletFromRequest(request, secret) : null;

  const pool = db();
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const contestRow = await pool.query<{ id: string }>(
      "select id from contests where fixture_id = $1 and status in ('CREATED', 'LOCKED', 'SETTLED') limit 1",
      [fixtureId],
    );
    const contestId = contestRow.rows[0]?.id;
    if (!contestId) return NextResponse.json({ error: "This fixture has no contest yet" }, { status: 503 });

    // Feed state from fixtures table
    const fixtureRow = await pool.query<{ feed_state: string; updated_at: string; players_json: unknown }>(
      "select feed_state, updated_at, players_json from fixtures where id = $1",
      [fixtureId],
    );
    const fixture = fixtureRow.rows[0];
    const feedState = fixture?.feed_state ?? "UNKNOWN";
    const updatedAt = fixture?.updated_at ? new Date(fixture.updated_at) : null;
    const ageSec = updatedAt ? (Date.now() - updatedAt.getTime()) / 1000 : null;
    const feedStale = ageSec !== null && ageSec > 120;
    let feedLabel: string;
    if (!updatedAt) {
      feedLabel = "Feed state unknown";
    } else if (feedStale) {
      feedLabel = "Feed delayed";
    } else if (feedState === "LIVE") {
      feedLabel = "Live via TxLINE devnet";
    } else {
      feedLabel = `TxLINE feed · ${feedState.toLowerCase().replace(/_/g, " ")}`;
    }

    // Player name map from fixtures.players_json
    const playersArr = Array.isArray(fixture?.players_json)
      ? (fixture.players_json as { fixturePlayerId: string; preferredName: string }[])
      : [];
    const playerMap = new Map(playersArr.map((p) => [p.fixturePlayerId, p.preferredName]));

    // Top 10 leaderboard by rank
    const topRows = await pool.query<{ entry_id: string; wallet: string; total: number; rank: number }>(
      "select entry_id, wallet, total, rank from entry_totals where contest_id = $1 order by rank asc nulls last, total desc limit 10",
      [contestId],
    );

    // Requesting user's own row when outside top 10
    let myRow: { entry_id: string; wallet: string; total: number; rank: number } | null = null;
    if (wallet) {
      const alreadyInTop = topRows.rows.some((r) => r.wallet === wallet);
      if (!alreadyInTop) {
        const entryId = `${contestId}:${wallet}`;
        const myResult = await pool.query<{ entry_id: string; wallet: string; total: number; rank: number }>(
          "select entry_id, wallet, total, rank from entry_totals where entry_id = $1",
          [entryId],
        );
        myRow = myResult.rows[0] ?? null;
      }
    }

    // Settlement record, if this contest has published one (schema-only until a real settlement runs)
    const settlementRow = await pool.query<{ tx_signature: string; merkle_root: string; published_at: string }>(
      "select tx_signature, merkle_root, published_at from contest_settlements where contest_id = $1",
      [contestId],
    );
    const settlement = settlementRow.rows[0] ?? null;

    // Market Pulse: periodic odds snapshots for display only — never referenced by scoring, ledger, or settlement (ADR 0011)
    const oddsResult = await pool.query<{ snapshot_ts: string; raw_json: unknown[] }>(
      "select snapshot_ts, raw_json from fixture_odds_snapshots where fixture_id = $1 order by snapshot_ts asc",
      [fixtureId],
    );
    const oddsSnapshots = oddsResult.rows;
    const matchOddsAt = (snapshot: { snapshot_ts: string; raw_json: unknown[] }): MatchOdds | null =>
      Array.isArray(snapshot.raw_json) ? extractMatchOdds(decodeOddsSnapshot(snapshot.raw_json), new Date(snapshot.snapshot_ts).toISOString()) : null;
    const ODDS_STALE_MS = 5 * 60_000;
    function bracketOdds(providerTimestamp: string | null): { odds_before: MatchOdds | null; odds_after: MatchOdds | null; odds_stale: boolean } {
      if (!providerTimestamp || oddsSnapshots.length === 0) return { odds_before: null, odds_after: null, odds_stale: false };
      const eventMs = new Date(providerTimestamp).getTime();
      let beforeSnap: { snapshot_ts: string; raw_json: unknown[] } | null = null;
      let afterSnap: { snapshot_ts: string; raw_json: unknown[] } | null = null;
      for (const snapshot of oddsSnapshots) {
        const snapMs = new Date(snapshot.snapshot_ts).getTime();
        if (snapMs < eventMs) beforeSnap = snapshot;
        else if (!afterSnap) afterSnap = snapshot;
      }
      const odds_before = beforeSnap ? matchOddsAt(beforeSnap) : null;
      let odds_after = afterSnap ? matchOddsAt(afterSnap) : null;
      let odds_stale = false;
      if (afterSnap && new Date(afterSnap.snapshot_ts).getTime() - eventMs > ODDS_STALE_MS) {
        odds_after = null;
        odds_stale = true;
      }
      return { odds_before, odds_after, odds_stale };
    }

    // Personal impact timeline (last 30 ledger rows, newest first), joined to its raw TxLINE provenance
    let impacts: {
      rule_code: string;
      player_id: string;
      player_name: string;
      base_points: number;
      applied_points: number;
      provisional: boolean;
      created_at: string;
      source_event_key: string;
      content_hash: string | null;
      provider_timestamp: string | null;
      proof_status: "provisional" | "settled" | "reconciled";
      tx_signature: string | null;
      odds_before: MatchOdds | null;
      odds_after: MatchOdds | null;
      odds_stale: boolean;
    }[] = [];
    if (wallet) {
      const entryId = `${contestId}:${wallet}`;
      const ledger = await pool.query<{
        rule_code: string;
        player_id: string;
        base_points: number;
        applied_points: number;
        provisional: boolean;
        created_at: string;
        source_event_key: string;
        content_hash: string | null;
        provider_timestamp: string | null;
      }>(
        `select fl.rule_code, fl.player_id, fl.base_points, fl.applied_points, fl.provisional, fl.created_at, fl.source_event_key,
                rpe.content_hash, rpe.provider_timestamp
         from fantasy_ledger fl
         left join normalized_events ne on ne.fixture_id = $2 and ne.source_event_key = fl.source_event_key and ne.revision = fl.source_revision
         left join raw_provider_events rpe on rpe.id = ne.raw_event_id
         where fl.entry_id = $1
         order by fl.created_at desc limit 30`,
        [entryId, fixtureId],
      );
      impacts = ledger.rows.map((r) => ({
        ...r,
        player_name: playerMap.get(r.player_id) ?? r.player_id,
        proof_status: r.provisional ? "provisional" : settlement ? "settled" : "reconciled",
        tx_signature: r.provisional ? null : (settlement?.tx_signature ?? null),
        ...bracketOdds(r.provider_timestamp),
      }));
    }

    const myTotal = wallet
      ? (topRows.rows.find((r) => r.wallet === wallet)?.total ?? myRow?.total ?? null)
      : null;
    const myRank = wallet
      ? (topRows.rows.find((r) => r.wallet === wallet)?.rank ?? myRow?.rank ?? null)
      : null;

    // Total entrant count
    const countResult = await pool.query<{ count: string }>(
      "select count(*) as count from entry_totals where contest_id = $1",
      [contestId],
    );
    const entrantCount = parseInt(countResult.rows[0]?.count ?? "0", 10);

    return NextResponse.json({
      feedLabel,
      feedStale,
      feedState,
      fixtureId,
      leaderboard: topRows.rows.map((r) => ({
        rank: r.rank,
        wallet: trunc(r.wallet),
        total: r.total,
        isMe: wallet ? r.wallet === wallet : false,
      })),
      myRow: myRow
        ? { rank: myRow.rank, wallet: trunc(myRow.wallet), total: myRow.total, isMe: true }
        : null,
      myTotal,
      myRank,
      impacts,
      entrantCount,
    });
  } catch (err) {
    console.error("[contest/live]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
