import { NextResponse } from "next/server";
import { readSession } from "../../../../../apps/api/src/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets client components recover the authenticated wallet after a page load without re-signing. */
export async function GET(request: Request) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) return NextResponse.json({ wallet: null }, { headers: { "Cache-Control": "no-store" } });
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("daze_session="))?.slice("daze_session=".length);
  const session = readSession(token, secret);
  return NextResponse.json({ wallet: session?.wallet ?? null }, { headers: { "Cache-Control": "no-store" } });
}
