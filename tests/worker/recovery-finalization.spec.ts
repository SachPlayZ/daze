import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { latestObservedMatchClock, recoverMissingFinalizedEvent } from "../../apps/worker/src/recovery";
import { fixtureLineupFromStoredActions } from "../../apps/worker/src/lineup";
import { bootstrapFixture } from "../../apps/worker/src/pipeline";
import { normalizeSoccerHistoricalActions } from "../../packages/txline-client/src/soccer-normalizer";

const captured = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18175981.json", "utf8")) as { payload: unknown[] };
const lineup = fixtureLineupFromStoredActions(captured.payload, "18175981");
assert.ok(lineup?.readiness.ready, "stored confirmed lineup remains usable after the fixture leaves the live snapshot");

const finalRaw = captured.payload.find((action) => action && typeof action === "object" && (action as Record<string, unknown>).Action === "game_finalised") as Record<string, unknown>;
assert.equal(finalRaw.Clock, undefined, "captured finalization reproduces the clockless live payload");
assert.ok((latestObservedMatchClock(captured.payload) ?? 0) >= 5400, "latest durable provider clock survives a clockless finalization");

const withoutFinal = normalizeSoccerHistoricalActions(captured.payload.filter((action) => action !== finalRaw), lineup!.captured);
const recovered = recoverMissingFinalizedEvent(captured.payload, lineup!.captured, withoutFinal);
assert.equal(recovered?.kind, "MATCH_FINALIZED");
assert.ok(recovered && recovered.elapsedSec >= 5400);
assert.equal(recoverMissingFinalizedEvent(captured.payload, lineup!.captured, [...withoutFinal, recovered!]), null, "restart recovery is idempotent");

const queries: { sql: string; params?: unknown[] }[] = [];
const rawRows = captured.payload.map((raw_json, index) => ({ id: index + 1, raw_json }));
const pool = {
  async query(sql: string, params?: unknown[]) {
    queries.push({ sql, params });
    if (sql.startsWith("select id, raw_json")) return { rows: rawRows };
    if (sql.startsWith("select normalized_json")) return { rows: withoutFinal.map((normalized_json) => ({ normalized_json })) };
    if (sql.startsWith("select contest_id")) return { rows: [] };
    return { rows: [] };
  },
};
const unavailableSnapshotClient = { async getJson() { throw new Error("completed fixture left the live snapshot"); } };
const runtime = await bootstrapFixture(pool as never, unavailableSnapshotClient as never, "18175981", "contest");
assert.equal(runtime?.state.finalElapsedSec, recovered?.elapsedSec, "worker restart backfills the missing normalized final event");
const fixtureUpsert = queries.find((query) => query.sql.startsWith("insert into fixtures") && query.sql.includes("mapping_version"));
assert.deepEqual(fixtureUpsert?.params?.slice(0, 4), ["18175981", "RECONCILING", "FINAL", "txline-soccer-world-cup-v1"], "fixture ID and mapping version are stored in the correct columns");
assert.ok(queries.some((query) => query.sql.startsWith("insert into normalized_events") && typeof query.params?.[4] === "string" && JSON.parse(query.params[4]).kind === "MATCH_FINALIZED"), "recovered finalization is persisted");
