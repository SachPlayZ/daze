import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FixtureRow = { id: string; kickoff_at: string; home_team_name: string | null; away_team_name: string | null; competition: string | null; feed_state: string };

export async function GET() {
  const pool = db();
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  try {
    const result = await pool.query<FixtureRow>(
      `select id, kickoff_at, home_team_name, away_team_name, competition, feed_state from fixtures order by kickoff_at asc`,
    );
    const fixtures = result.rows.map((row) => ({
      fixtureId: row.id,
      kickoffAt: row.kickoff_at,
      homeTeamName: row.home_team_name,
      awayTeamName: row.away_team_name,
      competition: row.competition,
      feedState: row.feed_state,
    }));
    return NextResponse.json({ fixtures }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[fixtures]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
