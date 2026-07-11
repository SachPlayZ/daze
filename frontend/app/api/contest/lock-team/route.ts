import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { readSession } from "../../../../../apps/api/src/auth";
import { validateHistoricalReplayDraft } from "../../../../../apps/api/src/historical-replay";
import { teamCommitmentHash } from "../../../../../packages/domain/src/commitment";
import type { DraftTeam } from "../../../../../packages/domain/src/index";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fixtureId = "18175981";
const scoringVersion = "v1.0.0";
const positionMappingVersion = "txline-soccer-world-cup-v1";
const formations = new Set(["4-4-2", "4-3-3", "4-5-1", "3-5-2", "3-4-3", "5-3-2"]);

function walletFromRequest(request: Request, secret: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("daze_session="))?.slice("daze_session=".length);
  return readSession(token, secret)?.wallet ?? null;
}

async function capturedHistory() {
  const source = path.resolve(process.cwd(), "..", "tests/provider-fixtures/txline-devnet/scores-historical-18175981.json");
  const parsed = JSON.parse(await readFile(source, "utf8")) as { payload?: unknown };
  if (!Array.isArray(parsed.payload)) throw new Error("Historical fixture payload is invalid.");
  return parsed.payload;
}

/** Server-authoritative team lock: repeats domain validation, computes the canonical hash, and persists an immutable row before any Solana entry transaction is built. */
export async function POST(request: Request) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const contestId = process.env.NEXT_PUBLIC_FANTASY_CONTEST_ID;
  const lockTs = process.env.NEXT_PUBLIC_FANTASY_LOCK_TS;
  if (!secret || !contestId || !lockTs) return NextResponse.json({ message: "Contest entry is not configured yet." }, { status: 503 });
  const wallet = walletFromRequest(request, secret);
  if (!wallet) return NextResponse.json({ message: "Connect your wallet first." }, { status: 401 });
  if (Date.now() >= Number(lockTs) * 1000) return NextResponse.json({ message: "This contest has locked. No further entries are accepted." }, { status: 409 });

  const body = await request.json().catch(() => null) as { playerIds?: unknown; captainId?: unknown; viceCaptainId?: unknown; formation?: unknown } | null;
  if (!body || !Array.isArray(body.playerIds) || !body.playerIds.every((id) => typeof id === "string") || typeof body.captainId !== "string" || typeof body.viceCaptainId !== "string" || typeof body.formation !== "string" || !formations.has(body.formation)) {
    return NextResponse.json({ message: "Team payload is invalid." }, { status: 400 });
  }
  const draft: DraftTeam = { playerIds: body.playerIds, captainId: body.captainId, viceCaptainId: body.viceCaptainId, formation: body.formation as DraftTeam["formation"] };
  const history = await capturedHistory();
  const validation = validateHistoricalReplayDraft(history, draft);
  if (!validation.valid) return NextResponse.json({ message: validation.errors.join(" ") }, { status: 422 });

  const pool = db();
  if (!pool) return NextResponse.json({ message: "Contest storage is not configured." }, { status: 503 });

  const existing = await pool.query<{ canonical_json: { formation: string; playerIds: string[]; captainId: string; viceCaptainId: string }; canonical_team_hash: string }>(
    "select canonical_json, canonical_team_hash from locked_teams where contest_id = $1 and wallet = $2",
    [contestId, wallet],
  );
  if (existing.rows[0]) {
    const locked = existing.rows[0];
    return NextResponse.json({ hash: locked.canonical_team_hash, contestId, fixtureId, formation: locked.canonical_json.formation, playerIds: locked.canonical_json.playerIds, captainId: locked.canonical_json.captainId, viceCaptainId: locked.canonical_json.viceCaptainId, alreadyLocked: true });
  }

  const hash = teamCommitmentHash({ contestId, wallet, team: draft, scoringVersion, positionMappingVersion });
  const canonicalJson = { contestId, wallet, fixtureId, formation: draft.formation, playerIds: [...draft.playerIds].sort(), captainId: draft.captainId, viceCaptainId: draft.viceCaptainId, scoringVersion, positionMappingVersion };
  await pool.query(
    `insert into locked_teams (id, contest_id, wallet, canonical_json, canonical_team_hash, scoring_version, mapping_version, locked_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (contest_id, wallet) do nothing`,
    [hash, contestId, wallet, JSON.stringify(canonicalJson), hash, scoringVersion, positionMappingVersion],
  );
  return NextResponse.json({ hash, contestId, fixtureId, formation: draft.formation, playerIds: canonicalJson.playerIds, captainId: draft.captainId, viceCaptainId: draft.viceCaptainId, alreadyLocked: false });
}
