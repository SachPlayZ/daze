import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readSession } from "../../../../../../apps/api/src/auth";
import { historicalReplayNotifications } from "../../../../../../apps/api/src/historical-replay-notifications";
import { buildHistoricalReplayReadModel, quickPickHistoricalReplay, validateHistoricalReplayDraft } from "../../../../../../apps/api/src/historical-replay";
import { capabilityRegistry } from "../../../../../../packages/config/src/capabilities";
import { rankEntries } from "../../../../../../packages/domain/src/ranking";
import { fullReplay, type LockedTeam } from "../../../../../../packages/scoring/src/projector";
import { entryTotal, ledgerRowIdentity } from "../../../../../../packages/scoring/src";
import { parseLineupAction } from "../../../../../../packages/txline-client/src/lineup";
import { normalizeSoccerHistoricalActions } from "../../../../../../packages/txline-client/src/soccer-normalizer";
import { pointImpactMessage } from "../../../../../../packages/telegram/src";
import { db } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

type Draft = { playerIds: string[]; captainId: string; viceCaptainId: string; formation: "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "3-4-3" | "5-3-2" };
const formations = new Set<Draft["formation"]>(["4-4-2", "4-3-3", "4-5-1", "3-5-2", "3-4-3", "5-3-2"]);

async function history(fixtureId: string): Promise<unknown[]> {
  const source = path.resolve(process.cwd(), "..", `tests/provider-fixtures/txline-devnet/scores-historical-${fixtureId}.json`);
  const parsed = JSON.parse(await readFile(source, "utf8")) as { payload?: unknown };
  if (!Array.isArray(parsed.payload)) throw new Error("Historical fixture payload is invalid.");
  return parsed.payload;
}

function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const team = value as Partial<Draft>;
  return Array.isArray(team.playerIds) && team.playerIds.every((id) => typeof id === "string") && typeof team.captainId === "string" && typeof team.viceCaptainId === "string" && typeof team.formation === "string" && formations.has(team.formation as Draft["formation"]);
}

function walletFromRequest(request: Request): string | null {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) return null;
  const token = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith("daze_session="))?.slice("daze_session=".length);
  return readSession(token, secret)?.wallet ?? null;
}

async function telegramForReplay(wallet: string): Promise<string | null> {
  const pool = db();
  if (!pool) return null;
  const result = await pool.query<{ telegram_user_id: string }>(
    `select tl.telegram_user_id from telegram_links tl left join notification_preferences np on np.wallet = tl.wallet
     where tl.wallet = $1 and coalesce(np.paused, false) = false and coalesce(np.point_impacts, true) = true`,
    [wallet],
  );
  return result.rows[0]?.telegram_user_id ?? null;
}

export async function POST(request: Request, context: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await context.params;
  if (!/^\d+$/.test(fixtureId)) return NextResponse.json({ message: "Historical fixture is unavailable." }, { status: 404 });
  try {
    const body = await request.json() as { cursor?: unknown; team?: unknown; command?: unknown; sessionId?: unknown };
    const command = body.command === "START_TELEGRAM" || body.command === "ADVANCE" || body.command === "RESET" || body.command === "STOP_TELEGRAM" ? body.command : null;
    const raw = await history(fixtureId);
    const replay = buildHistoricalReplayReadModel(raw);
    const lineupRecord = [...raw].reverse().find((action) => action && typeof action === "object" && !Array.isArray(action) && (action as Record<string, unknown>).Action === "lineups" && (action as Record<string, unknown>).Confirmed === true);
    if (!lineupRecord) throw new Error("Historical replay has no confirmed lineup.");
    const events = normalizeSoccerHistoricalActions(raw, parseLineupAction(lineupRecord));
    let sessionId: string | null = null;
    let wallet: string | null = null;
    let telegramUserId: string | null = null;
    let cursor = typeof body.cursor === "number" && Number.isInteger(body.cursor) && body.cursor >= 0 ? body.cursor : 0;
    let userTeam = isDraft(body.team) && validateHistoricalReplayDraft(raw, body.team).valid ? body.team : quickPickHistoricalReplay(raw, "4-3-3", Number(fixtureId));

    if (command) {
      wallet = walletFromRequest(request);
      const pool = db();
      if (!wallet) return NextResponse.json({ message: "Connect the wallet linked to Telegram before starting notification mode." }, { status: 401 });
      if (!pool) return NextResponse.json({ message: "Replay notifications need the configured database." }, { status: 503 });
      if (command === "START_TELEGRAM") {
        telegramUserId = await telegramForReplay(wallet);
        if (!telegramUserId) return NextResponse.json({ message: "Link Telegram and enable point-impact notifications before starting this replay." }, { status: 409 });
        sessionId = randomUUID();
        await pool.query(
          `insert into historical_replay_sessions (id, fixture_id, wallet, team_json, cursor, telegram_enabled) values ($1, $2, $3, $4, 0, true)`,
          [sessionId, fixtureId, wallet, JSON.stringify(userTeam)],
        );
        cursor = 0;
      } else if (command === "STOP_TELEGRAM") {
        if (typeof body.sessionId !== "string" || !body.sessionId) return NextResponse.json({ message: "Replay notification session is required." }, { status: 400 });
        const session = await pool.query<{ team_json: Draft; cursor: number }>(
          "select team_json, cursor from historical_replay_sessions where id = $1 and fixture_id = $2 and wallet = $3",
          [body.sessionId, fixtureId, wallet],
        );
        if (!session.rows[0]) return NextResponse.json({ message: "Replay notification session is unavailable." }, { status: 404 });
        await pool.query("update historical_replay_sessions set telegram_enabled = false, updated_at = now() where id = $1 and wallet = $2", [body.sessionId, wallet]);
        userTeam = session.rows[0].team_json;
        cursor = session.rows[0].cursor;
        sessionId = null;
      } else {
        if (typeof body.sessionId !== "string" || !body.sessionId) return NextResponse.json({ message: "Replay notification session is required." }, { status: 400 });
        const session = await pool.query<{ team_json: Draft; cursor: number; telegram_enabled: boolean }>(
          "select team_json, cursor, telegram_enabled from historical_replay_sessions where id = $1 and fixture_id = $2 and wallet = $3",
          [body.sessionId, fixtureId, wallet],
        );
        if (!session.rows[0]?.telegram_enabled) return NextResponse.json({ message: "Replay notification session is unavailable." }, { status: 404 });
        sessionId = body.sessionId;
        userTeam = session.rows[0].team_json;
        cursor = command === "ADVANCE" ? session.rows[0].cursor + 1 : 0;
        telegramUserId = command === "ADVANCE" ? await telegramForReplay(wallet) : null;
        if (command === "ADVANCE" && !telegramUserId) return NextResponse.json({ message: "Telegram is no longer linked or point-impact notifications are paused." }, { status: 409 });
      }
    }
    const seeded = [11, 29, 47].map((seed) => quickPickHistoricalReplay(raw, "4-3-3", seed));
    const userEntryId = sessionId ? `historical:${sessionId}:you` : "You";
    const teams: LockedTeam[] = [{ entryId: userEntryId, ...userTeam }, ...seeded.map((team, index) => ({ entryId: `Judge ${index + 1}`, ...team }))];
    const at = Math.min(cursor, events.length);
    const capabilities = { STARTING_APPEARANCE: "VERIFIED", SUBSTITUTE_APPEARANCE: "VERIFIED", APPEARANCE_60_REACHED: "VERIFIED", GOAL: "VERIFIED", PENALTY_GOAL: capabilityRegistry.PENALTY_GOAL.state, OWN_GOAL: capabilityRegistry.OWN_GOAL.state, YELLOW_CARD: capabilityRegistry.YELLOW_CARD.state, DIRECT_RED_CARD: capabilityRegistry.RED_CARD.state, SECOND_YELLOW_ADJUSTMENT: capabilityRegistry.SECOND_YELLOW.state, CLEAN_SHEET: "VERIFIED", GOALS_CONCEDED: "VERIFIED" } as const;
    const previous = fullReplay(events.slice(0, Math.max(0, at - 1)), replay.players, teams, capabilities);
    const state = fullReplay(events.slice(0, at), replay.players, teams, capabilities);
    const priorRows = new Set(previous.rows.map(ledgerRowIdentity));
    const newRows = state.rows.filter((row) => !priorRows.has(ledgerRowIdentity(row)));
    const playerNames = new Map(replay.players.map((player) => [player.fixturePlayerId, player.preferredName]));
    const totals = teams.map((team) => ({ entryId: team.entryId, points: entryTotal(state.rows.filter((row) => row.entryId === team.entryId)), nonCaptainPoints: 0, selectedPlayerGoals: state.rows.filter((row) => !row.reversed && row.entryId === team.entryId && row.action === "GOAL" && row.playerId !== team.captainId).length, lockedAt: new Date(1782853200000 + team.entryId.length).toISOString(), entryHash: team.entryId }));
    const leaderboard = rankEntries(totals).map((entry) => ({ entryId: entry.entryId === userEntryId ? "You" : entry.entryId, rank: entry.rank, points: entry.points }));
    const latest = events[at - 1];
    const impacts = newRows.filter((row) => row.entryId === userEntryId && !row.reversed).map((row) => ({ playerName: playerNames.get(row.playerId) ?? "Selected player", action: row.action.replaceAll("_", " "), appliedPoints: row.appliedPoints }));
    const yourTotal = leaderboard.find((entry) => entry.entryId === "You");
    const telegramPreview = impacts[0] && yourTotal ? pointImpactMessage({ minute: latest && "elapsedSec" in latest ? Math.max(1, Math.ceil(latest.elapsedSec / 60)) : null, action: impacts[0].action, playerName: impacts[0].playerName, basePoints: newRows.find((row) => row.entryId === userEntryId)?.basePoints ?? 0, appliedPoints: impacts[0].appliedPoints, previousTotal: entryTotal(previous.rows.filter((row) => row.entryId === userEntryId)), nextTotal: yourTotal.points, previousRank: null, nextRank: yourTotal.rank, contestUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/replay/${fixtureId}` }) : null;

    if (command === "ADVANCE" && sessionId && wallet && telegramUserId) {
      const pool = db()!;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const locked = await client.query<{ cursor: number }>("select cursor from historical_replay_sessions where id = $1 and wallet = $2 for update", [sessionId, wallet]);
        if (locked.rows[0]?.cursor !== at - 1) { await client.query("ROLLBACK"); return NextResponse.json({ message: "Replay event order changed. Refresh and try again." }, { status: 409 }); }
        const priorRank = rankEntries(totals.map((total) => ({ ...total, points: entryTotal(previous.rows.filter((row) => row.entryId === total.entryId)) }))).find((entry) => entry.entryId === userEntryId)?.rank ?? null;
        const notifications = historicalReplayNotifications({ telegramUserId, sessionId, entryId: userEntryId, rows: newRows, playerNames, minute: latest && "elapsedSec" in latest ? Math.max(1, Math.ceil(latest.elapsedSec / 60)) : null, previousTotal: entryTotal(previous.rows.filter((row) => row.entryId === userEntryId)), nextTotal: yourTotal?.points ?? 0, previousRank: priorRank, nextRank: yourTotal?.rank ?? null, contestUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/replay/${fixtureId}` });
        for (const notification of notifications) await client.query(
          `insert into notification_outbox (idempotency_key, payload, committed_at, wallet, telegram_user_id) values ($1, $2, now(), $3, $4) on conflict (idempotency_key) do nothing`,
          [notification.idempotencyKey, JSON.stringify({ text: notification.text, kind: notification.kind, historical: true, replaySessionId: sessionId }), wallet, telegramUserId],
        );
        await client.query("update historical_replay_sessions set cursor = $1, updated_at = now() where id = $2", [at, sessionId]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    }
    if (command === "RESET" && sessionId && wallet) await db()!.query("update historical_replay_sessions set cursor = 0, updated_at = now() where id = $1 and wallet = $2", [sessionId, wallet]);
    return NextResponse.json({ historical: true, cursor: at, totalEvents: events.length, final: at === events.length, event: latest && { kind: latest.kind, elapsedSec: "elapsedSec" in latest ? latest.elapsedSec : null }, impacts, leaderboard, telegramPreview, telegramSessionId: sessionId, telegramEnabled: Boolean(sessionId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Replay Theatre could not prepare this captured sequence." }, { status: 503 });
  }
}
