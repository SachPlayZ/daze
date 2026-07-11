import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { projectHistoricalReplayDraft, quickPickHistoricalReplay, validateHistoricalReplayDraft } from "../../../../../../apps/api/src/historical-replay";

export const dynamic = "force-dynamic";
const fixtureId = "18175981";
const formations = new Set(["4-4-2", "4-3-3", "4-5-1", "3-5-2", "3-4-3", "5-3-2"]);
type Formation = "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "3-4-3" | "5-3-2";

async function capturedHistory() {
  const source = path.resolve(process.cwd(), "..", "tests/provider-fixtures/txline-devnet/scores-historical-18175981.json");
  const parsed = JSON.parse(await readFile(source, "utf8")) as { payload?: unknown };
  if (!Array.isArray(parsed.payload)) throw new Error("Historical fixture payload is invalid.");
  return parsed.payload;
}

export async function POST(request: Request, context: { params: Promise<{ fixtureId: string }> }) {
  const params = await context.params;
  if (params.fixtureId !== fixtureId) return NextResponse.json({ message: "Historical fixture is unavailable." }, { status: 404 });
  try {
    const body = await request.json() as { action?: unknown; formation?: unknown; seed?: unknown; team?: unknown };
    const history = await capturedHistory();
    if (body.action === "QUICK_PICK") {
      if (typeof body.formation !== "string" || !formations.has(body.formation) || typeof body.seed !== "number" || !Number.isInteger(body.seed)) return NextResponse.json({ message: "Quick Pick request is invalid." }, { status: 400 });
      return NextResponse.json({ team: quickPickHistoricalReplay(history, body.formation as Formation, body.seed) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "VALIDATE" && body.team && typeof body.team === "object") {
      const team = body.team as { playerIds?: unknown; captainId?: unknown; viceCaptainId?: unknown; formation?: unknown };
      if (!Array.isArray(team.playerIds) || !team.playerIds.every((id) => typeof id === "string") || typeof team.captainId !== "string" || typeof team.viceCaptainId !== "string" || typeof team.formation !== "string" || !formations.has(team.formation)) return NextResponse.json({ message: "Team payload is invalid." }, { status: 400 });
      const draft = { playerIds: team.playerIds, captainId: team.captainId, viceCaptainId: team.viceCaptainId, formation: team.formation as Formation };
      const validation = validateHistoricalReplayDraft(history, draft);
      return NextResponse.json(validation.valid ? { ...validation, projection: projectHistoricalReplayDraft(history, draft) } : validation, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ message: "Unsupported replay draft command." }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Replay draft command could not be completed." }, { status: 503 });
  }
}
