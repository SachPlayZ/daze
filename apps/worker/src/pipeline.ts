import type { Pool } from "pg";
import { TxlineClient } from "../../../packages/txline-client/src/index";
import { normalizeSoccerScoreAction } from "../../../packages/txline-client/src/soccer-normalizer";
import type { CapturedLineupPlayer } from "../../../packages/txline-client/src/lineup";
import type { NormalizedSoccerEvent } from "../../../packages/domain/src/events";
import type { FixturePlayer } from "../../../packages/domain/src/index";
import { ingestProviderMessage } from "./ingestion";
import { postgresIngestionStore } from "./store";
import { initialFixtureScoreState, fullReplay, projectEvent, activeSeconds, type FixtureScoreState, type LockedTeam } from "../../../packages/scoring/src/projector";
import { entryTotal, ledgerRowIdentity, type LedgerRow } from "../../../packages/scoring/src/index";
import { pointImpactMessage } from "../../../packages/telegram/src/index";
import { scoringCapabilities } from "./capabilities";
import { loadFixtureLineup } from "./lineup";

export type FixtureRuntime = { fixtureId: string; players: FixturePlayer[]; captured: CapturedLineupPlayer[]; state: FixtureScoreState };

const runtimes = new Map<string, FixtureRuntime>();

async function lockedTeamsFor(pool: Pool, contestId: string): Promise<LockedTeam[]> {
  const result = await pool.query<{ contest_id: string; wallet: string; canonical_json: { playerIds: string[]; captainId: string; viceCaptainId: string } }>(
    "select contest_id, wallet, canonical_json from locked_teams where contest_id = $1",
    [contestId],
  );
  return result.rows.map((row) => ({ entryId: `${row.contest_id}:${row.wallet}`, playerIds: row.canonical_json.playerIds, captainId: row.canonical_json.captainId, viceCaptainId: row.canonical_json.viceCaptainId }));
}

/** Loads lineup + rebuilds fixture score state from durably persisted normalized events (deterministic, replay-safe on restart). */
export async function bootstrapFixture(pool: Pool, client: TxlineClient, fixtureId: string, contestId: string): Promise<FixtureRuntime | null> {
  const lineup = await loadFixtureLineup(client, fixtureId);
  if (!lineup || !lineup.readiness.ready) {
    await pool.query(
      `insert into fixtures (id, lifecycle, kickoff_at, feed_state, players_json, readiness_json, updated_at) values ($1, 'WAITING_FOR_PLAYER_DATA', now(), 'WAITING_FOR_PLAYER_DATA', $2, $3, now())
       on conflict (id) do update set feed_state = 'WAITING_FOR_PLAYER_DATA', players_json = excluded.players_json, readiness_json = excluded.readiness_json, updated_at = now()`,
      [fixtureId, JSON.stringify(lineup?.readiness.players ?? []), JSON.stringify(lineup?.readiness ?? { ready: false, reasons: ["No lineup available yet."] })],
    );
    return null;
  }
  await pool.query(
    `insert into fixtures (id, lifecycle, kickoff_at, feed_state, mapping_version, players_json, readiness_json, updated_at) values ($1, 'TEAM_BUILDING_OPEN', now(), 'LIVE', $2, $3, $4, now())
     on conflict (id) do update set lifecycle = case when fixtures.lifecycle = 'DISCOVERED' then 'TEAM_BUILDING_OPEN' else fixtures.lifecycle end, feed_state = 'LIVE', mapping_version = excluded.mapping_version, players_json = excluded.players_json, readiness_json = excluded.readiness_json, updated_at = now()`,
    ["txline-soccer-world-cup-v1", fixtureId, JSON.stringify(lineup.readiness.players), JSON.stringify(lineup.readiness)],
  );
  const events = await pool.query<{ normalized_json: NormalizedSoccerEvent }>(
    "select normalized_json from normalized_events where fixture_id = $1 order by id asc",
    [fixtureId],
  );
  const teams = await lockedTeamsFor(pool, contestId);
  const capabilities = scoringCapabilities();
  const state = fullReplay(events.rows.map((row) => row.normalized_json), lineup.readiness.players, teams, capabilities);
  const runtime: FixtureRuntime = { fixtureId, players: lineup.readiness.players, captured: lineup.captured, state };
  runtimes.set(fixtureId, runtime);
  return runtime;
}

async function persistNewRows(pool: Pool, contestId: string, previousRows: LedgerRow[], nextRows: LedgerRow[], players: FixturePlayer[]): Promise<void> {
  const seen = new Set(previousRows.map(ledgerRowIdentity));
  const added = nextRows.filter((row) => !seen.has(ledgerRowIdentity(row)));
  if (!added.length) return;
  for (const row of added) {
    await pool.query(
      `insert into fantasy_ledger (entry_id, source_event_key, source_revision, rule_code, player_id, base_points, applied_points, provisional, explanation_payload)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (entry_id, source_event_key, source_revision, rule_code, player_id) do nothing`,
      [row.entryId, row.sourceEventKey, row.sourceRevision, row.action, row.playerId, row.basePoints, row.appliedPoints, row.provisional, JSON.stringify({ action: row.action, playerId: row.playerId, basePoints: row.basePoints, appliedPoints: row.appliedPoints })],
    );
  }
  const affectedEntries = [...new Set(added.map((row) => row.entryId))];
  for (const entryId of affectedEntries) {
    const wallet = entryId.slice(contestId.length + 1);
    const rows = await pool.query<{ applied_points: number }>("select applied_points from fantasy_ledger where entry_id = $1", [entryId]);
    const total = rows.rows.reduce((sum, row) => sum + row.applied_points, 0);
    await pool.query(
      `insert into entry_totals (entry_id, contest_id, wallet, total, updated_at) values ($1, $2, $3, $4, now())
       on conflict (entry_id) do update set total = excluded.total, updated_at = now()`,
      [entryId, contestId, wallet, total],
    );
  }
  await recomputeRanks(pool, contestId);
  await enqueueNotifications(pool, contestId, added, players);
}

async function recomputeRanks(pool: Pool, contestId: string): Promise<void> {
  const rows = await pool.query<{ entry_id: string; total: number }>("select entry_id, total from entry_totals where contest_id = $1 order by total desc, entry_id asc", [contestId]);
  for (const [index, row] of rows.rows.entries()) {
    await pool.query("update entry_totals set rank = $1 where entry_id = $2", [index + 1, row.entry_id]);
  }
}

async function enqueueNotifications(pool: Pool, contestId: string, rows: LedgerRow[], players: FixturePlayer[]): Promise<void> {
  for (const row of rows) {
    const wallet = row.entryId.slice(contestId.length + 1);
    const totalResult = await pool.query<{ total: number; rank: number | null }>("select total, rank from entry_totals where entry_id = $1", [row.entryId]);
    const totals = totalResult.rows[0];
    if (!totals) continue;
    const link = await pool.query<{ telegram_user_id: string }>(
      `select tl.telegram_user_id from telegram_links tl
       left join notification_preferences np on np.wallet = tl.wallet
       where tl.wallet = $1 and coalesce(np.paused, false) = false and coalesce(np.point_impacts, true) = true`,
      [wallet],
    );
    const idempotencyKey = `${wallet}:${row.sourceEventKey}:${row.action}:${row.sourceRevision}`;
    const playerName = players.find((player) => player.fixturePlayerId === row.playerId)?.preferredName ?? row.playerId;
    const text = pointImpactMessage({
      minute: null,
      action: row.action,
      playerName,
      basePoints: row.basePoints,
      appliedPoints: row.appliedPoints,
      previousTotal: totals.total - row.appliedPoints,
      nextTotal: totals.total,
      previousRank: null,
      nextRank: totals.rank,
      contestUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://daze.app"}/matches/${contestId}/live`,
    });
    await pool.query(
      `insert into notification_outbox (idempotency_key, payload, committed_at, wallet, telegram_user_id) values ($1, $2, now(), $3, $4)
       on conflict (idempotency_key) do nothing`,
      [idempotencyKey, JSON.stringify({ text, ruleCode: row.action, entryId: row.entryId }), wallet, link.rows[0]?.telegram_user_id ?? null],
    );
  }
}

/** Ingests one raw provider SSE message: dedupes, persists raw, normalizes, projects, and persists ledger/notification effects. */
export async function handleProviderMessage(pool: Pool, contestId: string, raw: unknown): Promise<void> {
  const store = postgresIngestionStore(pool, "score-sse");
  const result = await ingestProviderMessage(raw, store);
  if (!result.accepted || !result.event) return;
  const runtime = runtimes.get(result.event.fixtureId);
  if (!runtime) return;
  const normalized = normalizeSoccerScoreAction(raw, runtime.captured);
  const rawRow = await pool.query<{ id: number }>("select id from raw_provider_events where content_hash = $1", [result.event.contentHash]);
  const rawEventId = rawRow.rows[0]?.id;
  if (!normalized || rawEventId === undefined) return;
  await pool.query(
    `insert into normalized_events (fixture_id, source_event_key, revision, parser_version, normalized_json, raw_event_id) values ($1, $2, $3, $4, $5, $6)
     on conflict (fixture_id, source_event_key, revision) do nothing`,
    [runtime.fixtureId, normalized.eventKey, String(normalized.revision), "soccer-historical-v1", JSON.stringify(normalized), rawEventId],
  );
  const teams = await lockedTeamsFor(pool, contestId);
  const previousRows = runtime.state.rows;
  const nextState = projectEvent(runtime.state, normalized, runtime.players, teams, scoringCapabilities());
  runtime.state = nextState;
  await persistNewRows(pool, contestId, previousRows, nextState.rows, runtime.players);
}

export function fixtureRuntime(fixtureId: string): FixtureRuntime | undefined { return runtimes.get(fixtureId); }
export { activeSeconds };
