import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fixtureId = url.searchParams.get("fixtureId");
  if (!fixtureId || !/^\d+$/.test(fixtureId)) return NextResponse.json({ error: "A fixtureId query param is required" }, { status: 400 });

  const pool = db();
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const result = await pool.query<{ id: string; status: string; lock_ts: string }>(
    "select id, status, lock_ts from contests where fixture_id = $1 order by created_at desc limit 1",
    [fixtureId],
  );
  const row = result.rows[0];
  if (!row) return NextResponse.json({ contest: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ contest: { contestId: row.id, status: row.status, lockTs: Number(row.lock_ts) } }, { headers: { "Cache-Control": "no-store" } });
}
