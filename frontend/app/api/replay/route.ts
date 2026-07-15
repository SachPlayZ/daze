import { NextResponse } from "next/server";
import { buildHistoricalReplayReadModel } from "../../../../apps/api/src/historical-replay";
import { completedReplayHistories } from "../../../lib/replay-history";

export const dynamic = "force-dynamic";

type ReplayListEntry = { fixtureId: string; teams: string; score: string | null; eventCount: number; ready: boolean; state: "READY" | "LINEUP_UNAVAILABLE" };
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
  const entries: ReplayListEntry[] = [];
  for (const history of await completedReplayHistories()) {
    try {
      try {
        const model = buildHistoricalReplayReadModel(history.actions);
        const finalScore = model.eventSummary.finalScore;
        entries.push({ fixtureId: model.fixtureId, teams: model.participants.map((team) => team.name).join(" vs "), score: finalScore ? `${finalScore.participant1Goals}–${finalScore.participant2Goals}` : null, eventCount: history.actions.length, ready: model.readiness.ready, state: model.readiness.ready ? "READY" : "LINEUP_UNAVAILABLE" });
      } catch {
        entries.push({ fixtureId: history.fixtureId, teams: capturedTeams(history.actions, history.fixtureId), score: null, eventCount: history.actions.length, ready: false, state: "LINEUP_UNAVAILABLE" });
      }
    } catch {
      continue;
    }
  }
  return NextResponse.json({ fixtures: entries }, { headers: { "Cache-Control": "no-store" } });
}
