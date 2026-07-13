import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildHistoricalReplayReadModel } from "../../../../apps/api/src/historical-replay";

export const dynamic = "force-dynamic";

type ReplayListEntry = { fixtureId: string; teams: string; goals: number; ready: boolean };

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
      const parsed = JSON.parse(await readFile(path.join(dir, file), "utf8")) as { payload?: unknown };
      if (!Array.isArray(parsed.payload) || parsed.payload.length === 0) continue;
      const model = buildHistoricalReplayReadModel(parsed.payload);
      entries.push({ fixtureId: model.fixtureId, teams: model.participants.map((team) => team.name).join(" vs "), goals: model.eventSummary.goals, ready: model.readiness.ready });
    } catch {
      continue;
    }
  }
  entries.sort((a, b) => Number(a.fixtureId) - Number(b.fixtureId));
  return NextResponse.json({ fixtures: entries }, { headers: { "Cache-Control": "no-store" } });
}
