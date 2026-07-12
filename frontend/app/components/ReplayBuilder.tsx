"use client";

import { useEffect, useMemo, useState } from "react";
import { Connection, Transaction } from "@solana/web3.js";
import { ReceiptBadge } from "./ReceiptBadge";
import { WALLET_EVENT } from "./WalletConnect";

const base64ToBytes = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
type EntryState = { status: "idle" | "locking" | "building" | "awaiting-signature" | "confirming" | "confirmed" | "error"; message: string; hash?: string; signature?: string };

type Position = "GK" | "DEF" | "MID" | "FWD";
type Formation = "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "3-4-3" | "5-3-2";
type Player = { fixturePlayerId: string; participantId: string; preferredName: string; position: Position; eligible: boolean; starter?: boolean };
type Draft = { playerIds: string[]; captainId: string; viceCaptainId: string; formation: Formation };
type Replay = { fixtureId: string; historical: true; participants: { id: string; name: string }[]; mappingVersion: string; readiness: { ready: boolean; reasons: string[] }; players: Player[]; eventSummary: { total: number; normalized: number; goals: number; substitutions: number; settlementBlocked: boolean; unresolvedScoringActions: number }; judgeMode: { entries: { rank: number; entryId: string; points: number }[]; reconciling: boolean } };
type Projection = { total: number | null; rows: { action: string; appliedPoints: number; reversed?: boolean }[]; impacts: { action: string; playerName: string; elapsedSec: number | null; basePoints: number; appliedPoints: number; reversed: boolean; sourceEventKey: string; providerTimestamp: string | null; contentHash: string | null }[]; reconciling: boolean };
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
  const [wallet, setWallet] = useState<string | null>(null);
  const [entry, setEntry] = useState<EntryState>({ status: "idle", message: "" });
  const [teamValid, setTeamValid] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ wallet: string | null }> : { wallet: null }).then((data) => { if (active) setWallet(data.wallet); }).catch(() => {});
    const onWallet = (event: Event) => setWallet((event as CustomEvent<{ wallet: string }>).detail.wallet);
    window.addEventListener(WALLET_EVENT, onWallet);
    return () => { active = false; window.removeEventListener(WALLET_EVENT, onWallet); };
  }, []);
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
  const lockAndEnter = async () => {
    if (!wallet) { setEntry({ status: "error", message: "Connect your wallet first." }); return; }
    try {
      setEntry({ status: "locking", message: "Locking your team on the server." });
      const lockResponse = await fetch("/api/contest/lock-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const lockResult = await lockResponse.json() as { hash?: string; message?: string };
      if (!lockResponse.ok || !lockResult.hash) { setEntry({ status: "error", message: lockResult.message ?? "Locking your team failed." }); return; }

      setEntry({ status: "building", message: "Preparing your devnet entry transaction.", hash: lockResult.hash });
      const entryResponse = await fetch("/api/contest/entry-transaction", { method: "POST" });
      const entryResult = await entryResponse.json() as { transactionBase64?: string; message?: string };
      if (!entryResponse.ok || !entryResult.transactionBase64) { setEntry({ status: "error", message: entryResult.message ?? "Preparing the entry transaction failed.", hash: lockResult.hash }); return; }

      const wallet_ = window.solana;
      if (!wallet_) { setEntry({ status: "error", message: "Phantom wallet is unavailable.", hash: lockResult.hash }); return; }
      setEntry({ status: "awaiting-signature", message: "Approve the entry transaction in your wallet.", hash: lockResult.hash });
      const transaction = Transaction.from(base64ToBytes(entryResult.transactionBase64));
      const { signature } = await wallet_.signAndSendTransaction(transaction);

      setEntry({ status: "confirming", message: "Confirming your entry on Solana devnet.", hash: lockResult.hash, signature });
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction({ signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }, "confirmed");
      setEntry({ status: "confirmed", message: "Entry confirmed on Solana devnet.", hash: lockResult.hash, signature });
    } catch {
      setEntry((current) => ({ ...current, status: "error", message: "Your entry could not be completed. Try again." }));
    }
  };
  const quickPick = async () => {
    setBusy(true); setMessage("Building a valid XI from the verified lineup.");
    try { const result = await post({ action: "QUICK_PICK", formation: draft.formation, seed: 18175981 }); if (!result.team) throw new Error(); setDraft(result.team); setMessage("Quick Pick is ready. Review captain and vice-captain before entry."); } catch { setMessage("Quick Pick is unavailable. Try again shortly."); } finally { setBusy(false); }
  };
  const validate = async () => {
    setBusy(true); setMessage("Checking your XI against the official formation rules.");
    try { const result = await post({ action: "VALIDATE", team: draft }); setProjection(result.projection ?? null); setTeamValid(Boolean(result.valid)); setEntry({ status: "idle", message: "" }); setMessage(result.valid ? "Your XI is valid. Connect a wallet to lock and enter the devnet contest." : (result.errors?.join(" ") ?? "Your XI needs changes.")); } catch { setMessage("Your XI could not be checked. Try again shortly."); } finally { setBusy(false); }
  };
  if (!replay) return <section className="contest-card replay-card" aria-live="polite"><div className="eyebrow">Historical replay</div><div className="empty-state"><span aria-hidden="true" className="empty-ball">◌</span><h2>Preparing real lineup data</h2><p>{message}</p></div></section>;
  return <section className="contest-card replay-card" aria-labelledby="replay-title">
    <div className="eyebrow">Historical replay · TxLINE</div>
    <div className="contest-topline"><div><h2 id="replay-title">{replay.participants.map((team) => team.name).join(" vs ")}</h2><p>Real captured lineup · {replay.players.length} eligible players · mapping {replay.mappingVersion}</p></div><span className="status status-live">Replay ready</span></div>
    <div className="replay-notice"><strong>Historical replay</strong><span>{replay.eventSummary.goals} verified goals · {replay.eventSummary.substitutions} resolved substitutions</span></div>
    {replay.eventSummary.settlementBlocked && <div className="replay-warning" role="status"><strong>Settlement blocked</strong><span>{replay.eventSummary.unresolvedScoringActions} scoring-relevant provider updates need reconciliation before a final leaderboard or claim.</span></div>}
    {contestReadiness && contestReadiness.state !== "READY_FOR_CONTEST_CONFIGURATION" && <div className="replay-warning" role="status"><strong>Devnet entry unavailable</strong><span>{contestReadiness.message}</span></div>}
    <div className="builder-controls"><label>Formation<select value={draft.formation} onChange={(event) => setDraft((current) => ({ ...current, formation: event.target.value as Formation, playerIds: [], captainId: "", viceCaptainId: "" }))}>{formations.map((formation) => <option key={formation}>{formation}</option>)}</select></label><div className="builder-mode-actions"><button className="primary-button builder-mode-button" disabled={busy} onClick={() => { setDraft((current) => ({ ...current, playerIds: [], captainId: "", viceCaptainId: "" })); setMessage("Select your XI manually below."); }}>Build manually</button><button className="primary-button builder-mode-button" disabled={busy} onClick={quickPick}>Quick Pick</button></div><span className="selection-count">{draft.playerIds.length}/11 selected</span></div>
    <p className="builder-message" aria-live="polite">{message}</p>
    {projection && <div className={projection.reconciling ? "replay-warning projection" : "replay-notice projection"} aria-live="polite"><strong>{projection.reconciling ? "Provisional replay" : "Replay total"}</strong><span>{projection.total ?? 0} points from {projection.rows.filter((row) => !row.reversed).length} committed ledger impacts. {projection.reconciling ? "Final ranking and claim stay closed until the feed reconciles." : "Final reconciliation complete."}</span></div>}
    {projection && <div className="impact-timeline" aria-label="Your replay impact timeline"><h3>Your impacts</h3>{projection.impacts.filter((impact) => !impact.reversed).map((impact, index) => <div className="impact-row" key={`${impact.action}-${impact.playerName}-${index}`}><span>{impact.elapsedSec === null ? "Final" : `${Math.max(1, Math.ceil(impact.elapsedSec / 60))}′`}</span><strong>{impact.playerName}</strong><small>{impact.action.replaceAll("_", " ")} · base {impact.basePoints > 0 ? "+" : ""}{impact.basePoints}</small><b>{impact.appliedPoints > 0 ? "+" : ""}{impact.appliedPoints}</b><span style={{ gridColumn: 2 }}><ReceiptBadge fixtureId={replay.fixtureId} sourceEventKey={impact.sourceEventKey} providerTimestamp={impact.providerTimestamp} contentHash={impact.contentHash} proofStatus={projection.reconciling ? "provisional" : "reconciled"} /></span></div>)}</div>}
    <div className="judge-board"><div><div><div className="eyebrow">Judge Mode</div><h3>Replay leaderboard</h3></div><span className="status status-warning">{replay.judgeMode.reconciling ? "Provisional" : "Final"}</span></div>{replay.judgeMode.entries.map((entry) => <div className="judge-row" key={entry.entryId}><span>#{entry.rank}</span><strong>{entry.entryId}</strong><b>{entry.points} pts</b></div>)}</div>
    <div className="player-groups">{positions.map((position) => <div className="player-group" key={position}><h3>{position}</h3>{replay.players.filter((player) => player.position === position).map((player) => <div className={`player-row ${selected.has(player.fixturePlayerId) ? "is-selected" : ""}`} key={player.fixturePlayerId}><button className="player-select" aria-pressed={selected.has(player.fixturePlayerId)} disabled={!player.eligible || (!selected.has(player.fixturePlayerId) && draft.playerIds.length >= 11)} onClick={() => togglePlayer(player.fixturePlayerId)}><span>{player.preferredName}</span><small>{player.starter ? "Starter" : "Available"}</small></button><div className="captain-actions"><button aria-label={`Make ${player.preferredName} captain`} className={draft.captainId === player.fixturePlayerId ? "captain-active" : ""} disabled={!selected.has(player.fixturePlayerId)} onClick={() => setDraft((current) => ({ ...current, captainId: player.fixturePlayerId, viceCaptainId: current.viceCaptainId === player.fixturePlayerId ? "" : current.viceCaptainId }))}>C</button><button aria-label={`Make ${player.preferredName} vice-captain`} className={draft.viceCaptainId === player.fixturePlayerId ? "captain-active" : ""} disabled={!selected.has(player.fixturePlayerId)} onClick={() => setDraft((current) => ({ ...current, viceCaptainId: player.fixturePlayerId, captainId: current.captainId === player.fixturePlayerId ? "" : current.captainId }))}>VC</button></div></div>)}</div>)}</div>
    <div className="builder-footer"><span>{selectedPlayers.length ? `Captain: ${selectedPlayers.find((player) => player.fixturePlayerId === draft.captainId)?.preferredName ?? "choose one"} · Vice: ${selectedPlayers.find((player) => player.fixturePlayerId === draft.viceCaptainId)?.preferredName ?? "choose one"}` : "Select your XI"}</span><button className="primary-button" disabled={busy} onClick={validate}>Check XI <span aria-hidden="true">→</span></button></div>
    {teamValid && <div className="entry-panel" aria-live="polite">
      <div className="eyebrow">Lock team &amp; enter</div>
      {!wallet && <p className="builder-message">Connect your wallet above to lock this team and enter the devnet contest.</p>}
      {wallet && <>
        <p className="builder-message">Locking is irreversible. Entry stakes a valueless Solana devnet test token — no real value is at risk.</p>
        <button className="primary-button" disabled={entry.status !== "idle" && entry.status !== "error" && entry.status !== "confirmed"} onClick={lockAndEnter}>
          {entry.status === "confirmed" ? "Entered ✓" : "Lock team & confirm entry"} <span aria-hidden="true">→</span>
        </button>
        {entry.message && <p className={entry.status === "error" ? "replay-warning" : "replay-notice"} role="status">{entry.message}</p>}
        {entry.hash && <p className="builder-message">Team hash: <code>{entry.hash.slice(0, 16)}…</code></p>}
        {entry.signature && <p className="builder-message"><a href={`https://explorer.solana.com/tx/${entry.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">View transaction on Solana Explorer ↗</a></p>}
      </>}
    </div>}
  </section>;
}
