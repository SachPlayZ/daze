import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildHistoricalReplayReadModel } from "../../../../apps/api/src/historical-replay";

export const dynamic = "force-dynamic";

type ReplayListEntry = { fixtureId: string; teams: string; goals: number | null; eventCount: number; ready: boolean; state: "READY" | "LINEUP_UNAVAILABLE" };
type ProviderAction = Record<string, unknown>;

const record = (value: unknown): ProviderAction | null => value && typeof value === "object" && !Array.isArray(value) ? value as ProviderAction : null;
const stringField = (value: unknown): string | null => typeof value === "string" || typeof value === "number" ? String(value) : null;

function capturedTeams(actions: unknown[], fallbackFixtureId: string): string {
  const lineup = actions.find((action) => record(action)?.Action === "lineups");
  const groups = lineup ? record(lineup)?.Lineups : null;
  if (!Array.isArray(groups)) return `Fixture ${fallbackFixtureId}`;
  const names = groups.map((group) => stringField(record(group)?.preferredName)).filter((name): name is string => Boolean(name));
  return [...new Set(names)].slice(0, 2).join(" vs ") || `Fixture ${fallbackFixtureId}`;
}

export async function GET() {
  const dir = path.resolve(process.cwd(), "..", "tests/provider-fixtures/txline-devnet");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((name) => name.startsWith("scores-historical-") && name.endsWith(".json"));
  } catch {
    return NextResponse.json({ fixtures: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const entries: ReplayListEntry[] = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(await readFile(path.join(dir, file), "utf8")) as { fixtureId?: unknown; payload?: unknown };
      if (!Array.isArray(parsed.payload) || parsed.payload.length === 0) continue;
      const firstAction = record(parsed.payload[0]);
      const fixtureId = stringField(parsed.fixtureId) ?? stringField(firstAction?.FixtureId);
      if (!fixtureId) continue;
      try {
        const model = buildHistoricalReplayReadModel(parsed.payload);
        entries.push({ fixtureId: model.fixtureId, teams: model.participants.map((team) => team.name).join(" vs "), goals: model.eventSummary.goals, eventCount: parsed.payload.length, ready: model.readiness.ready, state: model.readiness.ready ? "READY" : "LINEUP_UNAVAILABLE" });
      } catch {
        entries.push({ fixtureId, teams: capturedTeams(parsed.payload, fixtureId), goals: null, eventCount: parsed.payload.length, ready: false, state: "LINEUP_UNAVAILABLE" });
      }
    } catch {
      continue;
    }
  }
  entries.sort((a, b) => Number(a.fixtureId) - Number(b.fixtureId));
  return NextResponse.json({ fixtures: entries }, { headers: { "Cache-Control": "no-store" } });
}
