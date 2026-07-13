"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Draft = { playerIds: string[]; captainId: string; viceCaptainId: string; formation: string };
type TheatreState = { cursor: number; totalEvents: number; final: boolean; event: { kind: string; elapsedSec: number | null } | null; impacts: { playerName: string; action: string; appliedPoints: number }[]; leaderboard: { entryId: string; rank: number; points: number }[]; telegramPreview: string | null; telegramSessionId: string | null; telegramEnabled: boolean };
const delays: Record<number, number> = { 1: 1600, 4: 600, 10: 250 };

export function ReplayTheatre({ fixtureId, team }: { fixtureId: string; team: Draft }) {
  const [speed, setSpeed] = useState<1 | 4 | 10>(4);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<TheatreState | null>(null);
  const [error, setError] = useState("");
  const telegramSessionId = useRef<string | null>(null);
  const loadedFixtureId = useRef<string | null>(null);
  const serializedTeam = useMemo(() => JSON.stringify(team), [team]);
  const stableTeam = useMemo(() => JSON.parse(serializedTeam) as Draft, [serializedTeam]);
  const load = useCallback(async (cursor: number, command?: "START_TELEGRAM" | "ADVANCE" | "RESET") => {
    const response = await fetch(`/api/replay/${fixtureId}/theatre`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cursor, team: stableTeam, command, sessionId: telegramSessionId.current }) });
    if (!response.ok) { const failure = await response.json().catch(() => null) as { message?: string } | null; throw new Error(failure?.message ?? "Replay Theatre is unavailable."); }
    const next = await response.json() as TheatreState;
    telegramSessionId.current = next.telegramSessionId;
    setState(next);
  }, [fixtureId, stableTeam]);
  useEffect(() => {
    if (loadedFixtureId.current === fixtureId) return;
    loadedFixtureId.current = fixtureId;
    telegramSessionId.current = null;
    const timer = window.setTimeout(() => { void load(0).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Replay Theatre is unavailable.")); });
    return () => window.clearTimeout(timer);
  }, [fixtureId, load]);
  useEffect(() => {
    if (!running || !state || state.final) return;
    const timer = window.setTimeout(() => { void load(state.cursor + 1, state.telegramSessionId ? "ADVANCE" : undefined).catch((reason: unknown) => { setRunning(false); setError(reason instanceof Error ? reason.message : "Replay Theatre stopped."); }); }, delays[speed]);
    return () => window.clearTimeout(timer);
  }, [load, running, speed, state]);
  const reset = () => { setRunning(false); void load(0, state?.telegramSessionId ? "RESET" : undefined).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Replay Theatre reset failed.")); };
  const enableTelegram = () => { setRunning(false); setError(""); void load(0, "START_TELEGRAM").catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Telegram replay setup failed.")); };
  return <section className="replay-theatre" aria-label="Historical Replay Theatre">
    <div className="theatre-head"><div><div className="eyebrow">Replay Theatre</div><h3>Historical TxLINE replay</h3></div><span className={state?.final ? "status status-live" : "status status-warning"}>{state?.final ? "Final" : "Provisional"}</span></div>
    <p>Real captured actions, accelerated for the demo. This never represents a live match.</p>
    <div className="theatre-controls"><button className="primary-button" onClick={() => setRunning((value) => !value)} disabled={!state || state.final}>{running ? "Pause" : state?.cursor ? "Resume" : "Start replay"}</button>{([1, 4, 10] as const).map((value) => <button key={value} className={speed === value ? "theatre-speed is-active" : "theatre-speed"} onClick={() => setSpeed(value)}>{value}x</button>)}<button className="secondary-button" onClick={reset}>Reset</button>{!state?.telegramEnabled && <button className="secondary-button" onClick={enableTelegram}>Send Telegram updates</button>}<span>{state ? `${state.cursor}/${state.totalEvents} events` : "Preparing sequence"}</span></div>
    {error && <p className="replay-warning">{error}</p>}
    {state?.event && <div className="theatre-event"><strong>{state.event.elapsedSec === null ? "Final" : `${Math.max(1, Math.ceil(state.event.elapsedSec / 60))}′`}</strong><span>{state.event.kind.replaceAll("_", " ")}</span></div>}
    {state?.impacts.length ? <div className="theatre-impact">{state.impacts.map((impact, index) => <p key={`${impact.playerName}-${index}`}><strong>{impact.playerName}</strong> · {impact.action} <b>{impact.appliedPoints > 0 ? "+" : ""}{impact.appliedPoints}</b></p>)}</div> : null}
    {state?.telegramPreview && <div className="telegram-preview"><div className="eyebrow">{state.telegramEnabled ? "Telegram queued" : "Telegram preview"}</div><pre>{state.telegramPreview}</pre>{state.telegramEnabled && <small>Sent by the worker after the committed replay event.</small>}</div>}
    {state?.leaderboard.length ? <div className="theatre-board"><h4>Live replay leaderboard</h4>{state.leaderboard.map((entry) => <div key={entry.entryId}><span>#{entry.rank}</span><strong>{entry.entryId}</strong><b>{entry.points} pts</b></div>)}</div> : null}
  </section>;
}
