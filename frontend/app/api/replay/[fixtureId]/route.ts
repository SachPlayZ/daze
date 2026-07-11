import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildHistoricalReplayReadModel, buildJudgeModeLeaderboard } from "../../../../../apps/api/src/historical-replay";

export const dynamic = "force-dynamic";

const supportedFixtureId = "18175981";

export async function GET(_: Request, context: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await context.params;
  if (fixtureId !== supportedFixtureId) return NextResponse.json({ message: "Historical fixture is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const source = path.resolve(process.cwd(), "..", "tests/provider-fixtures/txline-devnet/scores-historical-18175981.json");
    const payload = JSON.parse(await readFile(source, "utf8")) as { payload?: unknown };
    if (!Array.isArray(payload.payload)) throw new Error("Historical fixture payload is invalid.");
    return NextResponse.json({ ...buildHistoricalReplayReadModel(payload.payload), judgeMode: buildJudgeModeLeaderboard(payload.payload) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Historical replay could not be prepared from the captured provider sequence." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
