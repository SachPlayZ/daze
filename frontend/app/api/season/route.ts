import { NextResponse } from "next/server";
import { readSession } from "../../../../apps/api/src/auth";
import { db } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletFromRequest(request: Request, secret: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("daze_session="))
    ?.slice("daze_session=".length);
  return readSession(token, secret)?.wallet ?? null;
}

const trunc = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

type SeasonRow = { wallet: string; season_total: string; best_match: number; matches_played: string; top3_finishes: string };
type SeasonEntry = { wallet: string; seasonTotal: number; bestMatch: number; matchesPlayed: number; top3Finishes: number; captainHitRate: number | null; isMe: boolean };

export async function GET(request: Request) {
  const pool = db();
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const secret = process.env.AUTH_SESSION_SECRET;
  const wallet = secret ? walletFromRequest(request, secret) : null;

  try {
    // Cross-contest aggregate. `entry_totals` already carries wallet + contest_id, so this
    // is real cumulative data from every contest ever settled off-chain — no new schema needed.
    const aggregate = await pool.query<SeasonRow>(
      `select wallet, sum(total) as season_total, max(total) as best_match, count(*) as matches_played,
              count(*) filter (where rank <= 3) as top3_finishes
       from entry_totals
       group by wallet
       order by season_total desc
       limit 20`,
    );

    // Captain hit rate: share of entries where the picked captain's own ledger points were positive.
    // Grounded in ADR 0004 (captain multiplier baked into applied_points, no double counting).
    const captainRows = await pool.query<{ wallet: string; captain_hit_rate: string | null }>(
      `with entries as (
         select et.wallet, et.entry_id, (lt.canonical_json->>'captainId') as captain_id
         from entry_totals et
         join locked_teams lt on lt.contest_id = et.contest_id and lt.wallet = et.wallet
       ),
       captain_points as (
         select e.wallet, e.entry_id,
                coalesce(sum(fl.applied_points) filter (where fl.player_id = e.captain_id), 0) as captain_points
         from entries e
         left join fantasy_ledger fl on fl.entry_id = e.entry_id
         group by e.wallet, e.entry_id
       )
       select wallet, avg(case when captain_points > 0 then 1.0 else 0 end) as captain_hit_rate
       from captain_points
       group by wallet`,
    );
    const hitRateByWallet = new Map(captainRows.rows.map((r) => [r.wallet, r.captain_hit_rate !== null ? Number(r.captain_hit_rate) : null]));

    const toEntry = (row: SeasonRow): SeasonEntry => ({
      wallet: trunc(row.wallet),
      seasonTotal: Number(row.season_total),
      bestMatch: row.best_match,
      matchesPlayed: Number(row.matches_played),
      top3Finishes: Number(row.top3_finishes),
      captainHitRate: hitRateByWallet.get(row.wallet) ?? null,
      isMe: wallet ? row.wallet === wallet : false,
    });

    const leaderboard = aggregate.rows.map(toEntry);

    let mine: SeasonEntry | null = wallet ? (leaderboard.find((e) => e.isMe) ?? null) : null;
    if (wallet && !mine) {
      const mineRow = await pool.query<SeasonRow>(
        `select wallet, sum(total) as season_total, max(total) as best_match, count(*) as matches_played,
                count(*) filter (where rank <= 3) as top3_finishes
         from entry_totals where wallet = $1 group by wallet`,
        [wallet],
      );
      mine = mineRow.rows[0] ? toEntry(mineRow.rows[0]) : null;
    }

    return NextResponse.json({ leaderboard, mine });
  } catch (err) {
    console.error("[season]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
