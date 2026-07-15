import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

type ProviderAction = Record<string, unknown>;
type DatabaseReplayRow = { fixture_id: string; kickoff_at: string; raw_id: string; raw_json: unknown };

export type ReplayHistory = { fixtureId: string; kickoffAt: string | null; actions: unknown[]; source: "DATABASE" | "CAPTURE" };

const record = (value: unknown): ProviderAction | null => value && typeof value === "object" && !Array.isArray(value) ? value as ProviderAction : null;
const fixtureIdFrom = (value: unknown): string | null => {
  const fixtureId = record(value)?.FixtureId;
  return typeof fixtureId === "string" || typeof fixtureId === "number" ? String(fixtureId) : null;
};
const isFinalized = (actions: unknown[]): boolean => actions.some((action) => record(action)?.Action === "game_finalised");

/** Groups ordered raw rows and fails closed unless the durable sequence contains game_finalised. */
export function groupCompletedDatabaseReplayRows(rows: DatabaseReplayRow[]): ReplayHistory[] {
  const grouped = new Map<string, ReplayHistory>();
  for (const row of rows) {
    const current = grouped.get(row.fixture_id);
    if (current) current.actions.push(row.raw_json);
    else grouped.set(row.fixture_id, { fixtureId: row.fixture_id, kickoffAt: row.kickoff_at, actions: [row.raw_json], source: "DATABASE" });
  }
  return [...grouped.values()].filter((history) => isFinalized(history.actions));
}

const captureDirectory = (): string => path.resolve(process.cwd(), "..", "tests/provider-fixtures/txline-devnet");

async function capturedReplayHistories(): Promise<ReplayHistory[]> {
  try {
    const directory = captureDirectory();
    const files = (await readdir(directory)).filter((name) => name.startsWith("scores-historical-") && name.endsWith(".json"));
    const histories = await Promise.all(files.map(async (file): Promise<ReplayHistory | null> => {
      try {
        const parsed = JSON.parse(await readFile(path.join(directory, file), "utf8")) as { fixtureId?: unknown; payload?: unknown };
        if (!Array.isArray(parsed.payload) || !parsed.payload.length) return null;
        const fixtureId = typeof parsed.fixtureId === "string" || typeof parsed.fixtureId === "number" ? String(parsed.fixtureId) : fixtureIdFrom(parsed.payload[0]);
        return fixtureId ? { fixtureId, kickoffAt: null, actions: parsed.payload, source: "CAPTURE" } : null;
      } catch { return null; }
    }));
    return histories.filter((history): history is ReplayHistory => history !== null);
  } catch { return []; }
}

async function capturedReplayHistory(fixtureId: string): Promise<unknown[] | null> {
  try {
    const parsed = JSON.parse(await readFile(path.join(captureDirectory(), `scores-historical-${fixtureId}.json`), "utf8")) as { payload?: unknown };
    return Array.isArray(parsed.payload) && parsed.payload.length ? parsed.payload : null;
  } catch { return null; }
}

async function databaseReplayHistories(): Promise<ReplayHistory[]> {
  const pool = db();
  if (!pool) return [];
  const result = await pool.query<DatabaseReplayRow>(
    `select f.id as fixture_id, f.kickoff_at, r.id::text as raw_id, r.raw_json
     from fixtures f
     join raw_provider_events r on r.fixture_id = f.id
     where exists (
       select 1 from raw_provider_events final
       where final.fixture_id = f.id and final.raw_json->>'Action' = 'game_finalised'
     )
     order by f.kickoff_at desc, r.id asc`,
  );
  return groupCompletedDatabaseReplayRows(result.rows);
}

/** Real completed DB fixtures win; checked-in captures remain available for local/Judge Mode replay. */
export async function completedReplayHistories(): Promise<ReplayHistory[]> {
  const [database, captures] = await Promise.all([
    databaseReplayHistories().catch(() => []),
    capturedReplayHistories(),
  ]);
  const seen = new Set(database.map((history) => history.fixtureId));
  return [...database, ...captures.filter((history) => !seen.has(history.fixtureId))];
}

export async function replayHistory(fixtureId: string): Promise<unknown[] | null> {
  const pool = db();
  let databaseError: unknown = null;
  if (pool) {
    try {
      const result = await pool.query<{ raw_json: unknown }>(
        "select raw_json from raw_provider_events where fixture_id = $1 order by id asc",
        [fixtureId],
      );
      const actions = result.rows.map((row) => row.raw_json);
      if (actions.length && isFinalized(actions)) return actions;
    } catch (error) { databaseError = error; }
  }
  const capture = await capturedReplayHistory(fixtureId);
  if (capture) return capture;
  if (databaseError) throw databaseError;
  return null;
}
