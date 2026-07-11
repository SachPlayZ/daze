import { NextResponse } from "next/server";
import { readSession } from "../../../../../apps/api/src/auth";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletFromRequest(request: Request, secret: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("daze_session="))
    ?.slice("daze_session=".length);
  return readSession(token, secret)?.wallet ?? null;
}

export async function POST(request: Request) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) return NextResponse.json({ message: "Auth not configured." }, { status: 503 });

  const wallet = walletFromRequest(request, secret);
  if (!wallet) return NextResponse.json({ message: "Connect your wallet first." }, { status: 401 });

  const pool = db();
  if (!pool) return NextResponse.json({ message: "Database not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string" || !body.token) {
    return NextResponse.json({ message: "token is required." }, { status: 400 });
  }
  const { token } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tokenRow = await client.query<{ token: string; telegram_user_id: string }>(
      "select token, telegram_user_id from telegram_link_tokens where token = $1 and consumed_at is null and expires_at > now()",
      [token],
    );
    if (!tokenRow.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ message: "Link token is invalid or has expired." }, { status: 400 });
    }
    const { telegram_user_id: telegramUserId } = tokenRow.rows[0];

    await client.query(
      `insert into telegram_links (telegram_user_id, wallet, linked_at)
       values ($1, $2, now())
       on conflict (telegram_user_id) do update set wallet = excluded.wallet, linked_at = now()`,
      [telegramUserId, wallet],
    );

    await client.query(
      "update telegram_link_tokens set consumed_at = now() where token = $1",
      [token],
    );

    await client.query("COMMIT");
    return NextResponse.json({ wallet, linked: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("telegram/link error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Failed to complete linking." }, { status: 500 });
  } finally {
    client.release();
  }
}
