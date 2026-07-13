import { NextResponse } from "next/server";
import { readSession } from "../../../../../apps/api/src/auth";
import { prepareEnterContest } from "../../../../lib/contest-transaction";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletFromRequest(request: Request, secret: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("daze_session="))?.slice("daze_session=".length);
  return readSession(token, secret)?.wallet ?? null;
}

/** Builds, but never signs or sends, the exact devnet enter_contest instruction for the caller's locked team. The wallet signs and submits it client-side. */
export async function POST(request: Request) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const programId = process.env.NEXT_PUBLIC_FANTASY_POOL_PROGRAM_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  if (!secret || !programId) return NextResponse.json({ message: "Contest entry is not configured yet." }, { status: 503 });
  const wallet = walletFromRequest(request, secret);
  if (!wallet) return NextResponse.json({ message: "Connect your wallet first." }, { status: 401 });

  const body = await request.json().catch(() => null) as { fixtureId?: unknown } | null;
  if (!body || typeof body.fixtureId !== "string" || !/^\d+$/.test(body.fixtureId)) return NextResponse.json({ message: "A fixture is required." }, { status: 400 });
  const fixtureId = body.fixtureId;

  const pool = db();
  if (!pool) return NextResponse.json({ message: "Contest storage is not configured." }, { status: 503 });

  const contestRow = await pool.query<{ id: string; stake_tier: string; lock_ts: string; mint: string }>(
    "select id, stake_tier, lock_ts, mint from contests where fixture_id = $1 and status in ('CREATED', 'LOCKED') limit 1",
    [fixtureId],
  );
  const contest = contestRow.rows[0];
  if (!contest) return NextResponse.json({ message: "This fixture has no active contest yet." }, { status: 503 });
  const contestId = contest.id;
  if (Date.now() >= Number(contest.lock_ts) * 1000) return NextResponse.json({ message: "This contest has locked. No further entries are accepted." }, { status: 409 });

  const locked = await pool.query<{ canonical_team_hash: string }>("select canonical_team_hash from locked_teams where contest_id = $1 and wallet = $2", [contestId, wallet]);
  const teamHash = locked.rows[0]?.canonical_team_hash;
  if (!teamHash) return NextResponse.json({ message: "Lock your team before entering the contest." }, { status: 409 });

  try {
    const prepared = await prepareEnterContest({ programId, mint: contest.mint, wallet, fixtureId, stakeTier: BigInt(contest.stake_tier), teamHash, rpcUrl });
    const transactionBase64 = prepared.transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
    return NextResponse.json({ transactionBase64, contest: prepared.contest.toBase58(), vault: prepared.vault.toBase58(), entry: prepared.entry.toBase58(), teamHash }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "The devnet entry transaction could not be prepared. Try again shortly." }, { status: 503 });
  }
}
