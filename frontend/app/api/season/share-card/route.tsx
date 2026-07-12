import { ImageResponse } from "next/og";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet");
  if (!wallet) {
    return new Response("wallet query param required", { status: 400 });
  }

  const pool = db();
  if (!pool) {
    return new Response("Database not configured", { status: 503 });
  }

  try {
    const row = await pool.query<{ season_total: string; best_match: number; matches_played: string; top3_finishes: string }>(
      `select sum(total) as season_total, max(total) as best_match, count(*) as matches_played,
              count(*) filter (where rank <= 3) as top3_finishes
       from entry_totals where wallet = $1 group by wallet`,
      [wallet],
    );
    const entry = row.rows[0];
    const truncatedWallet = `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #F4F0E8 0%, #FFD1BB 48%, #E9D9A9 100%)",
            padding: "56px 64px",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 44 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#351A12", letterSpacing: "-0.05em" }}>daze</div>
            <div style={{ fontSize: 13, color: "#766B63", fontWeight: 600 }}>World Cup season table</div>
          </div>

          <div style={{ fontSize: 15, color: "#766B63", marginBottom: 14 }}>{truncatedWallet}</div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 36 }}>
            <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1, color: "#351A12", letterSpacing: "-0.06em", fontVariantNumeric: "tabular-nums" }}>
              {entry ? Number(entry.season_total) : 0}
            </div>
            <div style={{ fontSize: 26, color: "#766B63", paddingBottom: 14 }}>season pts</div>
          </div>

          <div style={{ display: "flex", gap: 48, marginBottom: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: "#766B63", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Best match</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: "#351A12", fontVariantNumeric: "tabular-nums" }}>{entry?.best_match ?? 0}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: "#766B63", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Contests</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: "#351A12", fontVariantNumeric: "tabular-nums" }}>{entry ? Number(entry.matches_played) : 0}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: "#766B63", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Top-3 finishes</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: "#28764C", fontVariantNumeric: "tabular-nums" }}>{entry ? Number(entry.top3_finishes) : 0}</div>
            </div>
          </div>

          <div style={{ fontSize: 15, color: "#FF6841", fontWeight: 600, letterSpacing: "-0.01em", marginBottom: "auto" }}>
            Every moment changes your game.
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(53,26,18,0.18)" }}>
            <div style={{ fontSize: 13, color: "#766B63" }}>Powered by TxLINE · settled on Solana devnet</div>
            <div style={{ fontSize: 12, color: "#9E8E84" }}>daze.app</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    console.error("[season/share-card]", err);
    return new Response("Failed to generate share card", { status: 500 });
  }
}
