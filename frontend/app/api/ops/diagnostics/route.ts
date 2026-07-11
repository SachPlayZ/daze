import { NextResponse } from "next/server";
import { capabilityRegistry } from "../../../../../packages/config/src/capabilities";
import { txlineSoccerWorldCupV1 } from "../../../../../packages/config/src/position-mapping";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(request: Request): boolean {
  const token = process.env.OPS_ACCESS_TOKEN;
  if (!token) return false;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const headerToken = request.headers.get("x-ops-token");
  return queryToken === token || headerToken === token;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const capabilities = Object.values(capabilityRegistry);
  const positionMapping = txlineSoccerWorldCupV1;

  const pool = db();
  if (!pool) {
    return NextResponse.json({
      capabilities,
      positionMapping,
      fixtures: [],
      rawCounts: [],
      normalizedCounts: [],
      cursors: [],
      dbAvailable: false,
    });
  }

  const [fixturesRes, rawRes, normalizedRes, cursorsRes] = await Promise.all([
    pool.query<{
      id: string;
      lifecycle: string;
      kickoff_at: string;
      feed_state: string;
      mapping_version: string | null;
      scoring_version: string | null;
      players_json: unknown;
      readiness_json: unknown;
      home_participant_id: string | null;
      away_participant_id: string | null;
      updated_at: string;
    }>("select id, lifecycle, kickoff_at, feed_state, mapping_version, scoring_version, players_json, readiness_json, home_participant_id, away_participant_id, updated_at from fixtures order by kickoff_at desc"),
    pool.query<{ fixture_id: string; count: string; latest_received_at: string }>(
      "select fixture_id, count(*) as count, max(received_at) as latest_received_at from raw_provider_events group by fixture_id"
    ),
    pool.query<{ fixture_id: string; count: string }>(
      "select fixture_id, count(*) as count from normalized_events group by fixture_id"
    ),
    pool.query<{ fixture_id: string; connection_id: string | null; last_sequence: string | null; updated_at: string }>(
      "select fixture_id, connection_id, last_sequence, updated_at from provider_cursors"
    ),
  ]);

  return NextResponse.json({
    capabilities,
    positionMapping,
    fixtures: fixturesRes.rows,
    rawCounts: rawRes.rows,
    normalizedCounts: normalizedRes.rows,
    cursors: cursorsRes.rows,
    dbAvailable: true,
  });
}
