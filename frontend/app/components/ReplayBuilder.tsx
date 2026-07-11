"use client";

import { useEffect, useMemo, useState } from "react";

type Position = "GK" | "DEF" | "MID" | "FWD";
type Formation = "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "3-4-3" | "5-3-2";
type Player = { fixturePlayerId: string; participantId: string; preferredName: string; position: Position; eligible: boolean; starter?: boolean };
type Draft = { playerIds: string[]; captainId: string; viceCaptainId: string; formation: Formation };
type Replay = { fixtureId: string; historical: true; participants: { id: string; name: string }[]; mappingVersion: string; readiness: { ready: boolean; reasons: string[] }; players: Player[]; eventSummary: { total: number; normalized: number; goals: number; substitutions: number; settlementBlocked: boolean; unresolvedScoringActions: number }; judgeMode: { entries: { rank: number; entryId: string; points: number }[]; reconciling: boolean } };
type Projection = { total: number | null; rows: { action: string; appliedPoints: number; reversed?: boolean }[]; impacts: { action: string; playerName: string; elapsedSec: number | null; basePoints: number; appliedPoints: number; reversed: boolean }[]; reconciling: boolean };
type ContestReadiness = { state: "PROGRAM_NOT_CONFIGURED" | "PROGRAM_NOT_DEPLOYED" | "READY_FOR_CONTEST_CONFIGURATION" | "CHAIN_UNAVAILABLE"; message: string };

const formations: Formation[] = ["4-4-2", "4-3-3", "4-5-1", "3-5-2", "3-4-3", "5-3-2"];
const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
const emptyDraft: Draft = { formation: "4-3-3", playerIds: [], captainId: "", viceCaptainId: "" };

export function ReplayBuilder() {
  const [replay, setReplay] = useState<Replay | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("Loading real TxLINE replay lineup.");
  const [busy, setBusy] = useState(false);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [contestReadiness, setContestReadiness] = useState<ContestReadiness | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/replay/18175981", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<Replay> : Promise.reject()).then((data) => { if (active) { setReplay(data); setMessage(data.readiness.ready ? "Choose a formation and build your XI." : data.readiness.reasons.join(" ")); } }).catch(() => { if (active) setMessage("Historical lineup is unavailable. Try again shortly."); });
    return () => { active = false; };
  }, []);
  useEffect(() => { let active = true; fetch("/api/contest/readiness", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<ContestReadiness> : null).then((next) => { if (active) setContestReadiness(next); }).catch(() => {}); return () => { active = false; }; }, []);
  const selected = useMemo(() => new Set(draft.playerIds), [draft.playerIds]);
  const selectedPlayers = replay?.players.filter((player) => selected.has(player.fixturePlayerId)) ?? [];
  const togglePlayer = (id: string) => setDraft((current) => {
    if (current.playerIds.includes(id)) return { ...current, playerIds: current.playerIds.filter((playerId) => playerId !== id), captainId: current.captainId === id ? "" : current.captainId, viceCaptainId: current.viceCaptainId === id ? "" : current.viceCaptainId };
    if (current.playerIds.length >= 11) return current;
    return { ...current, playerIds: [...current.playerIds, id] };
  });
  const post = async (body: unknown) => {
    const response = await fetch("/api/replay/18175981/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error("Replay command failed.");
    return response.json() as Promise<{ team?: Draft; valid?: boolean; errors?: string[]; projection?: Projection }>;
  };
  const quickPick = async () => {
    setBusy(true); setMessage("Building a valid XI from the verified lineup.");
    try { const result = await post({ action: "QUICK_PICK", formation: draft.formation, seed: 18175981 }); if (!result.team) throw new Error(); setDraft(result.team); setMessage("Quick Pick is ready. Review captain and vice-captain before entry."); } catch { setMessage("Quick Pick is unavailable. Try again shortly."); } finally { setBusy(false); }
  };
  const validate = async () => {
    setBusy(true); setMessage("Checking your XI against the official formation rules.");
    try { const result = await post({ action: "VALIDATE", team: draft }); setProjection(result.projection ?? null); setMessage(result.valid ? "Your XI is valid. Connect a wallet to lock and enter the devnet contest." : (result.errors?.join(" ") ?? "Your XI needs changes.")); } catch { setMessage("Your XI could not be checked. Try again shortly."); } finally { setBusy(false); }
  };
  if (!replay) return <section className="contest-card replay-card" aria-live="polite"><div className="eyebrow">Historical replay</div><div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h2>Preparing real lineup data</h2><p>{message}</p></div></section>;
  return <section className="contest-card replay-card" aria-labelledby="replay-title">
    <div className="eyebrow">Historical replay · TxLINE</div>
    <div className="contest-topline"><div><h2 id="replay-title">{replay.participants.map((team) => team.name).join(" vs ")}</h2><p>Real captured lineup · {replay.players.length} eligible players · mapping {replay.mappingVersion}</p></div><span className="status status-live">Replay ready</span></div>
    <div className="replay-notice"><strong>Historical replay</strong><span>{replay.eventSummary.goals} verified goals · {replay.eventSummary.substitutions} resolved substitutions</span></div>
    {replay.eventSummary.settlementBlocked && <div className="replay-warning" role="status"><strong>Settlement blocked</strong><span>{replay.eventSummary.unresolvedScoringActions} scoring-relevant provider updates need reconciliation before a final leaderboard or claim.</span></div>}
    {contestReadiness && contestReadiness.state !== "READY_FOR_CONTEST_CONFIGURATION" && <div className="replay-warning" role="status"><strong>Devnet entry unavailable</strong><span>{contestReadiness.message}</span></div>}
    <div className="builder-controls"><label>Formation<select value={draft.formation} onChange={(event) => setDraft((current) => ({ ...current, formation: event.target.value as Formation, playerIds: [], captainId: "", viceCaptainId: "" }))}>{formations.map((formation) => <option key={formation}>{formation}</option>)}</select></label><button className="secondary-button" disabled={busy} onClick={quickPick}>Quick Pick</button><span className="selection-count">{draft.playerIds.length}/11 selected</span></div>
    <p className="builder-message" aria-live="polite">{message}</p>
    {projection && <div className={projection.reconciling ? "replay-warning projection" : "replay-notice projection"} aria-live="polite"><strong>{projection.reconciling ? "Provisional replay" : "Replay total"}</strong><span>{projection.total ?? 0} points from {projection.rows.filter((row) => !row.reversed).length} committed ledger impacts. {projection.reconciling ? "Final ranking and claim stay closed until the feed reconciles." : "Final reconciliation complete."}</span></div>}
    {projection && <div className="impact-timeline" aria-label="Your replay impact timeline"><h3>Your impacts</h3>{projection.impacts.filter((impact) => !impact.reversed).map((impact, index) => <div className="impact-row" key={`${impact.action}-${impact.playerName}-${index}`}><span>{impact.elapsedSec === null ? "Final" : `${Math.max(1, Math.ceil(impact.elapsedSec / 60))}′`}</span><strong>{impact.playerName}</strong><small>{impact.action.replaceAll("_", " ")} · base {impact.basePoints > 0 ? "+" : ""}{impact.basePoints}</small><b>{impact.appliedPoints > 0 ? "+" : ""}{impact.appliedPoints}</b></div>)}</div>}
    <div className="judge-board"><div><div className="eyebrow">Judge Mode</div><h3>Replay leaderboard</h3></div><span className="status status-warning">{replay.judgeMode.reconciling ? "Provisional" : "Final"}</span>{replay.judgeMode.entries.map((entry) => <div className="judge-row" key={entry.entryId}><span>#{entry.rank}</span><strong>{entry.entryId}</strong><b>{entry.points} pts</b></div>)}</div>
    <div className="player-groups">{positions.map((position) => <div className="player-group" key={position}><h3>{position}</h3>{replay.players.filter((player) => player.position === position).map((player) => <div className={`player-row ${selected.has(player.fixturePlayerId) ? "is-selected" : ""}`} key={player.fixturePlayerId}><button className="player-select" aria-pressed={selected.has(player.fixturePlayerId)} disabled={!player.eligible || (!selected.has(player.fixturePlayerId) && draft.playerIds.length >= 11)} onClick={() => togglePlayer(player.fixturePlayerId)}><span>{player.preferredName}</span><small>{player.starter ? "Starter" : "Available"}</small></button><div className="captain-actions"><button aria-label={`Make ${player.preferredName} captain`} className={draft.captainId === player.fixturePlayerId ? "captain-active" : ""} disabled={!selected.has(player.fixturePlayerId)} onClick={() => setDraft((current) => ({ ...current, captainId: player.fixturePlayerId, viceCaptainId: current.viceCaptainId === player.fixturePlayerId ? "" : current.viceCaptainId }))}>C</button><button aria-label={`Make ${player.preferredName} vice-captain`} className={draft.viceCaptainId === player.fixturePlayerId ? "captain-active" : ""} disabled={!selected.has(player.fixturePlayerId)} onClick={() => setDraft((current) => ({ ...current, viceCaptainId: player.fixturePlayerId, captainId: current.captainId === player.fixturePlayerId ? "" : current.captainId }))}>VC</button></div></div>)}</div>)}</div>
    <div className="builder-footer"><span>{selectedPlayers.length ? `Captain: ${selectedPlayers.find((player) => player.fixturePlayerId === draft.captainId)?.preferredName ?? "choose one"} · Vice: ${selectedPlayers.find((player) => player.fixturePlayerId === draft.viceCaptainId)?.preferredName ?? "choose one"}` : "Select your XI"}</span><button className="primary-button" disabled={busy} onClick={validate}>Check XI <span aria-hidden="true">→</span></button></div>
  </section>;
}
