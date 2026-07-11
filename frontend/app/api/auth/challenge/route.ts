import { NextResponse } from "next/server";
import { challengeMessage, isSolanaPublicKey, issueChallenge } from "../../../../../apps/api/src/auth";
import { challengeStore } from "../../../../lib/challenge-store";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { wallet } = await request.json() as { wallet?: unknown };
    if (typeof wallet !== "string" || !isSolanaPublicKey(wallet)) return NextResponse.json({ message: "Wallet is invalid." }, { status: 400 });
    const challenge = await issueChallenge(wallet, new URL(request.url).host, challengeStore);
    return NextResponse.json({ nonce: challenge.nonce, message: challengeMessage(challenge), expiresAt: challenge.expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("wallet challenge creation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Wallet challenge could not be created." }, { status: 400 });
  }
}
