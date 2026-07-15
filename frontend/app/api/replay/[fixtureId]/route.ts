import { NextResponse } from "next/server";
import { buildHistoricalReplayReadModel, buildJudgeModeLeaderboard } from "../../../../../apps/api/src/historical-replay";
import { replayHistory } from "../../../../lib/replay-history";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await context.params;
  if (!/^\d+$/.test(fixtureId)) return NextResponse.json({ message: "Historical fixture is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const payload = await replayHistory(fixtureId);
    if (!payload) return NextResponse.json({ message: "Historical fixture is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ...buildHistoricalReplayReadModel(payload), judgeMode: buildJudgeModeLeaderboard(payload) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Historical replay could not be prepared from the captured provider sequence." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
