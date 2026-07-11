import { NextResponse } from "next/server";
import { createSession, verifyChallenge, verifySolanaSignature } from "../../../../../apps/api/src/auth";
import { challengeStore } from "../../../../lib/challenge-store";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) return NextResponse.json({ message: "Wallet sessions are not configured." }, { status: 503 });
  try {
    const { nonce, wallet, signature } = await request.json() as { nonce?: unknown; wallet?: unknown; signature?: unknown };
    if (typeof nonce !== "string" || typeof wallet !== "string" || typeof signature !== "string") return NextResponse.json({ message: "Wallet proof is invalid." }, { status: 400 });
    const valid = await verifyChallenge({ nonce, wallet, signature: new Uint8Array(Buffer.from(signature, "base64")) }, challengeStore, verifySolanaSignature);
    if (!valid) return NextResponse.json({ message: "Wallet proof was rejected." }, { status: 401 });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    const response = NextResponse.json({ wallet, expiresAt });
    response.cookies.set("daze_session", createSession({ wallet, expiresAt }, secret), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(expiresAt) });
    return response;
  } catch { return NextResponse.json({ message: "Wallet proof could not be verified." }, { status: 400 }); }
}
