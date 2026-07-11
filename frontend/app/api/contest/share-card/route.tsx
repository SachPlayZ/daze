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

  const contestId = process.env.NEXT_PUBLIC_FANTASY_CONTEST_ID;
  const fixtureId = process.env.NEXT_PUBLIC_FANTASY_FIXTURE_ID;
  if (!contestId || !fixtureId) {
    return new Response("Contest not configured", { status: 503 });
  }

  const pool = db();
  if (!pool) {
    return new Response("Database not configured", { status: 503 });
  }

  try {
    const entryId = `${contestId}:${wallet}`;

    // Entry totals
    const totalRow = await pool.query<{ total: number; rank: number | null }>(
      "select total, rank from entry_totals where entry_id = $1",
      [entryId],
    );
    const entry = totalRow.rows[0];

    // Total entrant count
    const countRow = await pool.query<{ count: string }>(
      "select count(*) as count from entry_totals where contest_id = $1",
      [contestId],
    );
    const entrantCount = parseInt(countRow.rows[0]?.count ?? "0", 10);

    // Best single ledger row (highest applied_points)
    const bestRow = await pool.query<{ rule_code: string; player_id: string; applied_points: number }>(
      "select rule_code, player_id, applied_points from fantasy_ledger where entry_id = $1 order by applied_points desc limit 1",
      [entryId],
    );
    const best = bestRow.rows[0];

    // Captain from locked_teams
    const teamRow = await pool.query<{ canonical_json: { captainId?: string } }>(
      "select canonical_json from locked_teams where contest_id = $1 and wallet = $2",
      [contestId, wallet],
    );
    const captainId = teamRow.rows[0]?.canonical_json?.captainId;

    // Player names from fixtures.players_json
    const fixtureRow = await pool.query<{ players_json: unknown }>(
      "select players_json from fixtures where id = $1",
      [fixtureId],
    );
    const playersArr = Array.isArray(fixtureRow.rows[0]?.players_json)
      ? (fixtureRow.rows[0]!.players_json as { fixturePlayerId: string; preferredName: string }[])
      : [];
    const playerMap = new Map(playersArr.map((p) => [p.fixturePlayerId, p.preferredName]));

    const captainName = captainId ? (playerMap.get(captainId) ?? captainId) : "—";
    const bestPlayerName = best ? (playerMap.get(best.player_id) ?? best.player_id) : "—";
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
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 44,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#351A12",
                letterSpacing: "-0.05em",
              }}
            >
              daze
            </div>
            <div style={{ fontSize: 13, color: "#766B63", fontWeight: 600 }}>
              World Cup · TxLINE devnet
            </div>
          </div>

          {/* Wallet address (truncated) */}
          <div style={{ fontSize: 15, color: "#766B63", marginBottom: 14 }}>
            {truncatedWallet}
          </div>

          {/* Big points number */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 14,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                fontSize: 100,
                fontWeight: 700,
                lineHeight: 1,
                color: "#351A12",
                letterSpacing: "-0.06em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {entry?.total ?? 0}
            </div>
            <div
              style={{ fontSize: 26, color: "#766B63", paddingBottom: 14 }}
            >
              pts
            </div>
          </div>

          {/* Rank / Captain / Best player row */}
          <div style={{ display: "flex", gap: 48, marginBottom: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#766B63",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                Rank
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  fontSize: 38,
                  fontWeight: 700,
                  color: "#351A12",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                #{entry?.rank ?? "—"}
                <span style={{ fontSize: 18, color: "#766B63" }}>
                  of {entrantCount}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#766B63",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                Captain
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#351A12",
                }}
              >
                {captainName}
              </div>
            </div>

            {best && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#766B63",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                  }}
                >
                  Best player
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#351A12",
                  }}
                >
                  {bestPlayerName}
                  <span
                    style={{
                      fontSize: 20,
                      color: "#28764C",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    +{best.applied_points}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 15,
              color: "#FF6841",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: "auto",
            }}
          >
            Every moment changes your game.
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid rgba(53,26,18,0.18)",
            }}
          >
            <div style={{ fontSize: 13, color: "#766B63" }}>
              Powered by TxLINE · settled on Solana devnet
            </div>
            <div style={{ fontSize: 12, color: "#9E8E84" }}>daze.app</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    console.error("[share-card]", err);
    return new Response("Failed to generate share card", { status: 500 });
  }
}
