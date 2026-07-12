"use client";

import { useEffect, useState } from "react";
import { WALLET_EVENT } from "./WalletConnect";

type SeasonEntry = { wallet: string; seasonTotal: number; bestMatch: number; matchesPlayed: number; top3Finishes: number; captainHitRate: number | null; isMe: boolean };
type SeasonData = { leaderboard: SeasonEntry[]; mine: SeasonEntry | null };

export function SeasonTable() {
  const [data, setData] = useState<SeasonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);

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

  useEffect(() => {
    let active = true;
    fetch("/api/season", { cache: "no-store" })
      .then(async (r) => (r.ok ? (r.json() as Promise<SeasonData>) : Promise.reject()))
      .then((json) => { if (active) setData(json); })
      .catch(() => { if (active) setError("Season table is unavailable. Try again shortly."); });
    return () => { active = false; };
  }, []);

  if (!data && !error) {
    return <section className="contest-card" aria-label="World Cup season table">
      <div className="eyebrow">World Cup season table</div>
      <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h2>Loading season totals</h2><p>Aggregating real, settled contest results.</p></div>
    </section>;
  }
  if (error && !data) {
    return <section className="contest-card" aria-label="World Cup season table">
      <div className="eyebrow">World Cup season table</div>
      <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h2>Season table unavailable</h2><p>{error}</p></div>
    </section>;
  }

  const d = data!;

  return <section className="contest-card" aria-label="World Cup season table" aria-live="polite">
    <div className="contest-topline">
      <div><div className="eyebrow">World Cup season table</div><h2>Cumulative across every contest you&apos;ve entered</h2></div>
      <span className="status status-warning">Free · updates automatically</span>
    </div>

    {d.mine ? (
      <div className="replay-notice" role="status">
        <strong>Your season</strong>
        <span>{d.mine.seasonTotal} pts total · best match {d.mine.bestMatch} · {d.mine.matchesPlayed} contest{d.mine.matchesPlayed === 1 ? "" : "s"} · {d.mine.top3Finishes} top-3 finish{d.mine.top3Finishes === 1 ? "" : "es"}{d.mine.captainHitRate !== null ? ` · captain hit rate ${Math.round(d.mine.captainHitRate * 100)}%` : ""}</span>
      </div>
    ) : (
      <div className="replay-notice" role="status"><strong>No entries yet</strong><span>Enter a contest to start building your season.</span></div>
    )}

    <div className="judge-board">
      <div><div><div className="eyebrow">Leaderboard</div><h3>Season leaders</h3></div><span className="status status-warning">All-time</span></div>
      {d.leaderboard.length === 0 ? (
        <div className="judge-row"><span>—</span><strong>No settled contests yet — be the first</strong><b>—</b></div>
      ) : (
        d.leaderboard.map((row, i) => (
          <div className={`judge-row${row.isMe ? " is-me" : ""}`} key={row.wallet + i}>
            <span>#{i + 1}</span>
            <strong>{row.wallet}{row.isMe ? " (you)" : ""}</strong>
            <b>{row.seasonTotal} pts</b>
          </div>
        ))
      )}
    </div>

    {wallet && (
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Share your season</span>
        <a className="secondary-button" href={`/api/season/share-card?wallet=${encodeURIComponent(wallet)}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, textDecoration: "none" }}>
          Share season card ↗
        </a>
      </div>
    )}
  </section>;
}
