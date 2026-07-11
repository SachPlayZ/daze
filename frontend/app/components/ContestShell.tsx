"use client";

import { useEffect, useState } from "react";

type Health = { state: "CONNECTED" | "NOT_CONFIGURED" | "UNAVAILABLE"; message: string; fixtureCount?: number };
const initial: Health = { state: "NOT_CONFIGURED", message: "Checking the server-side TxLINE connection." };
const unavailable: Health = { state: "NOT_CONFIGURED", message: "Feed status is unavailable. Try again shortly." };

export function ContestShell() {
  const [health, setHealth] = useState(initial);
  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<Health> : unavailable).then((next) => { if (active) setHealth(next); }).catch(() => { if (active) setHealth(unavailable); });
    return () => { active = false; };
  }, []);
  const connected = health.state === "CONNECTED";
  return <section aria-labelledby="contest-title" className="contest-card">
    <div className="eyebrow">Official fantasy contest</div>
    <div className="contest-topline"><div><h2 id="contest-title">Today’s fixtures</h2><p>Player selection opens only when both verified lineups are available.</p></div><span className={`status ${connected ? "status-live" : "status-warning"}`}>{connected ? "Feed connected" : "Awaiting feed"}</span></div>
    <div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h3>{connected ? "Lineups aren’t ready yet" : "Feed verification is in progress"}</h3><p>{health.message}</p><button className="secondary-button" onClick={() => window.location.reload()}>Refresh feed status</button></div>
    <div className="contest-footer"><span>{connected ? `TxLINE feed · ${health.fixtureCount ?? 0} fixtures observed` : "TxLINE feed · awaiting connection"}</span><span>Devnet tokens have no value</span></div>
  </section>;
}
