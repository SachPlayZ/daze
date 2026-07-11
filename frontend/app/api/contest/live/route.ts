import { NextResponse } from "next/server";
import { readSession } from "../../../../../apps/api/src/auth";
import { db } from "../../../../lib/db";

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
  const contestId = process.env.NEXT_PUBLIC_FANTASY_CONTEST_ID;
  const fixtureId = process.env.NEXT_PUBLIC_FANTASY_FIXTURE_ID;
  if (!contestId || !fixtureId) {
    return NextResponse.json({ error: "Contest not configured" }, { status: 503 });
  }

  const secret = process.env.AUTH_SESSION_SECRET;
  const wallet = secret ? walletFromRequest(request, secret) : null;

  const pool = db();
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
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

    // Personal impact timeline (last 30 ledger rows, newest first)
    let impacts: {
      rule_code: string;
      player_id: string;
      player_name: string;
      base_points: number;
      applied_points: number;
      provisional: boolean;
      created_at: string;
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
      }>(
        "select rule_code, player_id, base_points, applied_points, provisional, created_at from fantasy_ledger where entry_id = $1 order by created_at desc limit 30",
        [entryId],
      );
      impacts = ledger.rows.map((r) => ({
        ...r,
        player_name: playerMap.get(r.player_id) ?? r.player_id,
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
