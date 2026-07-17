"use client";

import { useEffect, useState } from "react";
import { ReceiptBadge } from "./ReceiptBadge";
import { OddsMoveBadge } from "./OddsMoveBadge";
import { WALLET_EVENT } from "./WalletConnect";

type LeaderboardRow = { rank: number; wallet: string; total: number; isMe: boolean };
type MatchOdds = { part1Win: number; draw: number; part2Win: number; snapshotTs: string };
type ImpactRow = {
  rule_code: string;
  player_id: string;
  player_name: string;
  base_points: number;
  applied_points: number;
  provisional: boolean;
  created_at: string;
  source_event_key: string;
  content_hash: string | null;
  provider_timestamp: string | null;
  proof_status: "provisional" | "settled" | "reconciled";
  tx_signature: string | null;
  odds_before: MatchOdds | null;
  odds_after: MatchOdds | null;
  odds_stale: boolean;
};
type LiveData = {
  feedLabel: string;
  feedStale: boolean;
  feedState: string;
  fixtureId: string;
  leaderboard: LeaderboardRow[];
  myRow: LeaderboardRow | null;
  myTotal: number | null;
  myRank: number | null;
  impacts: ImpactRow[];
  entrantCount: number;
};

function formatRuleCode(ruleCode: string) {
  const words = ruleCode.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function LiveMatchCentre({ fixtureId = process.env.NEXT_PUBLIC_FANTASY_FIXTURE_ID ?? "18175981" }: { fixtureId?: string }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);

  // Recover wallet for the share-card URL
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ wallet: string | null }>) : Promise.resolve({ wallet: null })))
      .then((d) => { if (active) setWallet(d.wallet); })
      .catch(() => {});
    const onWallet = (e: Event) => setWallet((e as CustomEvent<{ wallet: string }>).detail.wallet);
    window.addEventListener(WALLET_EVENT, onWallet);
    return () => { active = false; window.removeEventListener(WALLET_EVENT, onWallet); };
  }, []);

  // Poll live data every 4 s
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/contest/live?fixtureId=${fixtureId}`, { cache: "no-store" });
        if (!res.ok) {
          const json = await res.json().catch(() => ({})) as { error?: string };
          if (active) setError(json.error ?? "Live data unavailable.");
          return;
        }
        const json = await res.json() as LiveData;
        if (active) { setData(json); setError(null); }
      } catch {
        if (active) setError("Live data unavailable.");
      }
    };
    void poll();
    const id = setInterval(() => { void poll(); }, 4000);
    return () => { active = false; clearInterval(id); };
  }, [fixtureId]);

  if (!data && !error) {
    return (
      <section className="contest-card" aria-label="Live match centre">
        <div className="eyebrow">Live match centre</div>
        <div className="empty-state">
          <span aria-hidden="true" className="empty-ball">◌</span>
          <h2>Loading live data</h2>
          <p>Polling the scoring ledger…</p>
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="contest-card" aria-label="Live match centre">
        <div className="eyebrow">Live match centre</div>
        <div className="empty-state">
          <span aria-hidden="true" className="empty-ball">◌</span>
          <h2>Live centre unavailable</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const d = data!;
  const isFinal = d.feedState === "FINAL";
  const feedClass = isFinal
    ? "status status-live"
    : d.feedStale
      ? "status status-warning"
      : "status status-live";
  const feedLabel = isFinal ? `Final · ${d.feedLabel}` : d.feedLabel;

  return (
    <section className="contest-card" aria-label="Live match centre" aria-live="polite">
      <div className="contest-topline">
        <div>
          <div className="eyebrow">Live match centre · TxLINE</div>
          <h2>Live scoring</h2>
        </div>
        <span className={feedClass}>{feedLabel}</span>
      </div>

      {d.myTotal !== null ? (
        <div className="replay-notice" role="status">
          <strong>Your score</strong>
          <span>
            {d.myTotal} pts · Rank #{d.myRank ?? "—"} of {d.entrantCount}
          </span>
        </div>
      ) : (
        <div className="replay-notice" role="status">
          <strong>No entry yet</strong>
          <span>Lock your team above to join the contest.</span>
        </div>
      )}

      {/* Leaderboard */}
      <div className="judge-board">
        <div>
          <div>
            <div className="eyebrow">Leaderboard</div>
            <h3>Top entries</h3>
          </div>
          <span className={`status ${isFinal ? "status-live" : "status-warning"}`}>
            {isFinal ? "Final" : "Provisional"}
          </span>
        </div>
        {d.leaderboard.length === 0 ? (
          <div className="judge-row">
            <span>—</span>
            <strong>No entries yet — be the first</strong>
            <b>—</b>
          </div>
        ) : (
          d.leaderboard.map((row) => (
            <div className={`judge-row${row.isMe ? " is-me" : ""}`} key={row.wallet + row.rank}>
              <span>#{row.rank ?? "—"}</span>
              <strong>
                {row.wallet}
                {row.isMe ? " (you)" : ""}
              </strong>
              <b>{row.total} pts</b>
            </div>
          ))
        )}
        {d.myRow && (
          <>
            <div
              className="judge-row"
              style={{ opacity: 0.45, fontSize: 12, borderTop: "1px solid var(--border)" }}
            >
              <span style={{ gridColumn: "1 / -1", textAlign: "center" }}>· · ·</span>
            </div>
            <div className="judge-row is-me">
              <span>#{d.myRow.rank ?? "—"}</span>
              <strong>{d.myRow.wallet} (you)</strong>
              <b>{d.myRow.total} pts</b>
            </div>
          </>
        )}
      </div>

      {/* Personal impact timeline */}
      {d.impacts.length > 0 && (
        <div className="impact-timeline" aria-label="Your live impact timeline">
          <h3>Your impacts</h3>
          {d.impacts.map((impact, i) => (
            <div
              className="impact-row"
              key={`${impact.rule_code}-${impact.player_id}-${i}`}
            >
              <span
                style={
                  impact.provisional
                    ? { color: "var(--warning)", fontSize: "12px", fontWeight: 700 }
                    : {}
                }
              >
                {impact.provisional ? "PROV" : "✓"}
              </span>
              <strong>{impact.player_name}</strong>
              <small>
                {formatRuleCode(impact.rule_code)} · base{" "}
                {impact.base_points > 0 ? "+" : ""}
                {impact.base_points}
              </small>
              <b
                style={{
                  color:
                    impact.applied_points < 0 ? "var(--negative)" : "var(--positive)",
                }}
              >
                {impact.applied_points > 0 ? "+" : ""}
                {impact.applied_points}
              </b>
              <span style={{ gridColumn: 2 }}>
                <ReceiptBadge
                  fixtureId={d.fixtureId}
                  sourceEventKey={impact.source_event_key}
                  providerTimestamp={impact.provider_timestamp}
                  contentHash={impact.content_hash}
                  proofStatus={impact.proof_status}
                  txSignature={impact.tx_signature}
                />
                <OddsMoveBadge
                  oddsBefore={impact.odds_before}
                  oddsAfter={impact.odds_after}
                  isStale={impact.odds_stale}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {d.impacts.length === 0 && d.myTotal !== null && (
        <div className="replay-warning" style={{ marginTop: 18 }} role="status">
          <strong>No impacts yet</strong>
          <span>Your score will update as the match progresses.</span>
        </div>
      )}

      {/* Share result */}
      {wallet && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Share your result</span>
          <a
            className="secondary-button"
            href={`/api/contest/share-card?wallet=${encodeURIComponent(wallet)}&fixtureId=${fixtureId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Share result card ↗
          </a>
        </div>
      )}
    </section>
  );
}
