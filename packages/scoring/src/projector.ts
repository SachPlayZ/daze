import type { NormalizedSoccerEvent } from "../../domain/src/events";
import type { FixturePlayer, Position } from "../../domain/src";
import type { Capability, LedgerRow, ScoringAction } from "./index";
import { ledgerRowIdentity, reverse, scoreAction } from "./index";

export type LockedTeam = { entryId: string; playerIds: string[]; captainId: string; viceCaptainId: string };
export type FixtureScoreState = { started: boolean; finalElapsedSec: number | null; activeFrom: Record<string, number>; activeTo: Record<string, number>; concededGoals: Record<string, number>; appliedEvents: Record<string, number>; rows: LedgerRow[] };
export const initialFixtureScoreState = (): FixtureScoreState => ({ started: false, finalElapsedSec: null, activeFrom: {}, activeTo: {}, concededGoals: {}, appliedEvents: {}, rows: [] });

function capabilityFor(action: ScoringAction, capabilities: Partial<Record<ScoringAction, Capability>>): Capability { return capabilities[action] ?? "DISABLED"; }
function selectedEntries(playerId: string, teams: LockedTeam[]) { return teams.filter((team) => team.playerIds.includes(playerId)); }
function player(players: FixturePlayer[], playerId: string) { return players.find((candidate) => candidate.fixturePlayerId === playerId); }

function rowsForAction(eventKey: string, action: ScoringAction, playerId: string, players: FixturePlayer[], teams: LockedTeam[], revision: number, capabilities: Partial<Record<ScoringAction, Capability>>): LedgerRow[] {
  const selected = player(players, playerId); if (!selected) return [];
  return selectedEntries(playerId, teams).flatMap((team) => {
    const row = scoreAction({ entryId: team.entryId, sourceEventKey: eventKey, sourceRevision: String(revision), action, playerId, position: selected.position, captain: team.captainId === playerId, capability: capabilityFor(action, capabilities), provisional: true });
    return row ? [row] : [];
  });
}

function closeActiveAt(state: FixtureScoreState, playerId: string, elapsedSec: number) { if (state.activeFrom[playerId] !== undefined && state.activeTo[playerId] === undefined) state.activeTo[playerId] = elapsedSec; }

function hasRule(state: FixtureScoreState, entryId: string, playerId: string, action: ScoringAction) { return state.rows.filter((row) => !row.reversed && row.entryId === entryId && row.playerId === playerId && row.action === action).reduce((total, row) => total + row.appliedPoints, 0) !== 0; }
function reverseOnce(rows: LedgerRow[], predicate: (row: LedgerRow) => boolean): LedgerRow[] { const existing = new Set(rows.flatMap((row) => row.reversalOf ? [row.reversalOf] : [])); return rows.flatMap((row) => predicate(row) && !row.reversalOf && !existing.has(ledgerRowIdentity(row)) ? [reverse(row)] : []); }

function awardTimeMilestones(state: FixtureScoreState, eventKey: string, revision: number, elapsedSec: number, players: FixturePlayer[], teams: LockedTeam[], capabilities: Partial<Record<ScoringAction, Capability>>) {
  for (const candidate of players) {
    const startedAt = state.activeFrom[candidate.fixturePlayerId];
    const endedAt = state.activeTo[candidate.fixturePlayerId] ?? elapsedSec;
    if (startedAt === undefined || endedAt - startedAt < 3600) continue;
    for (const team of selectedEntries(candidate.fixturePlayerId, teams)) {
      if (!hasRule(state, team.entryId, candidate.fixturePlayerId, "APPEARANCE_60_REACHED")) state.rows.push(...rowsForAction(eventKey, "APPEARANCE_60_REACHED", candidate.fixturePlayerId, players, teams.filter((entry) => entry.entryId === team.entryId), revision, capabilities));
      if ((candidate.position === "GK" || candidate.position === "DEF" || candidate.position === "MID") && (state.concededGoals[candidate.participantId] ?? 0) === 0 && !hasRule(state, team.entryId, candidate.fixturePlayerId, "CLEAN_SHEET")) state.rows.push(...rowsForAction(eventKey, "CLEAN_SHEET", candidate.fixturePlayerId, players, teams.filter((entry) => entry.entryId === team.entryId), revision, capabilities));
    }
  }
}

function applyConcededGoal(state: FixtureScoreState, eventKey: string, revision: number, concededParticipantId: string, elapsedSec: number, players: FixturePlayer[], teams: LockedTeam[], capabilities: Partial<Record<ScoringAction, Capability>>) {
  const conceded = (state.concededGoals[concededParticipantId] ?? 0) + 1; state.concededGoals[concededParticipantId] = conceded;
  for (const candidate of players.filter((player) => player.participantId === concededParticipantId && (player.position === "GK" || player.position === "DEF"))) {
    const isActive = state.activeFrom[candidate.fixturePlayerId] !== undefined && state.activeFrom[candidate.fixturePlayerId] <= elapsedSec && (state.activeTo[candidate.fixturePlayerId] === undefined || state.activeTo[candidate.fixturePlayerId] > elapsedSec);
    if (!isActive) continue;
    state.rows.push(...reverseOnce(state.rows, (row) => row.playerId === candidate.fixturePlayerId && row.action === "CLEAN_SHEET" && row.appliedPoints > 0));
    if (conceded % 2 === 0) state.rows.push(...rowsForAction(eventKey, "GOALS_CONCEDED", candidate.fixturePlayerId, players, teams, revision, capabilities));
  }
}

/** Pure incremental projector. The worker persists its returned state/ledger atomically. */
export function projectEvent(state: FixtureScoreState, event: NormalizedSoccerEvent, players: FixturePlayer[], teams: LockedTeam[], capabilities: Partial<Record<ScoringAction, Capability>>): FixtureScoreState {
  if (state.appliedEvents[event.eventKey] === event.revision) return state;
  const priorRevisions = reverseOnce(state.rows, (row) => row.sourceEventKey === event.eventKey && row.sourceRevision !== String(event.revision));
  const next: FixtureScoreState = { ...state, activeFrom: { ...state.activeFrom }, activeTo: { ...state.activeTo }, concededGoals: { ...state.concededGoals }, appliedEvents: { ...state.appliedEvents, [event.eventKey]: event.revision }, rows: [...state.rows, ...priorRevisions] };
  const add = (rows: LedgerRow[]) => next.rows.push(...rows);
  if (event.kind === "ACTION_REPLACED") {
    next.rows.push(...reverseOnce(next.rows, (row) => row.sourceEventKey === event.replacesEventKey));
    return next;
  }
  if (event.kind === "MATCH_STARTED") {
    next.started = true;
    players.filter((candidate) => candidate.starter).forEach((candidate) => { next.activeFrom[candidate.fixturePlayerId] = 0; add(rowsForAction(event.eventKey, "STARTING_APPEARANCE", candidate.fixturePlayerId, players, teams, event.revision, capabilities)); });
  }
  if (event.kind === "SUBSTITUTION") { closeActiveAt(next, event.playerOutId, event.elapsedSec); next.activeFrom[event.playerInId] = event.elapsedSec; add(rowsForAction(event.eventKey, "SUBSTITUTE_APPEARANCE", event.playerInId, players, teams, event.revision, capabilities)); }
  if (event.kind === "GOAL" && event.period !== "PE") {
    const action: ScoringAction | null = event.goalKind === "OPEN_PLAY" ? "GOAL" : event.goalKind === "PENALTY" ? "PENALTY_GOAL" : event.goalKind === "OWN_GOAL" ? "OWN_GOAL" : null;
    if (action) {
      add(rowsForAction(event.eventKey, action, event.scorerId, players, teams, event.revision, capabilities));
      const scorer = player(players, event.scorerId); const concededParticipantId = event.goalKind === "OWN_GOAL" ? scorer?.participantId : [...new Set(players.map((candidate) => candidate.participantId))].find((id) => id !== event.participantId);
      if (concededParticipantId) applyConcededGoal(next, event.eventKey, event.revision, concededParticipantId, event.elapsedSec, players, teams, capabilities);
    }
  }
  if (event.kind === "PENALTY_ATTEMPT" && event.period !== "PE") {
    if (event.outcome === "MISSED") add(rowsForAction(event.eventKey, "PENALTY_MISS", event.playerId, players, teams, event.revision, capabilities));
    if (event.outcome === "SCORED") {
      add(rowsForAction(event.eventKey, "PENALTY_GOAL", event.playerId, players, teams, event.revision, capabilities));
      const concededParticipantId = [...new Set(players.map((candidate) => candidate.participantId))].find((id) => id !== event.participantId);
      if (concededParticipantId) applyConcededGoal(next, event.eventKey, event.revision, concededParticipantId, event.elapsedSec, players, teams, capabilities);
    }
  }
  if (event.kind === "CARD") {
    const action = event.card === "YELLOW" ? "YELLOW_CARD" : event.card === "DIRECT_RED" ? "DIRECT_RED_CARD" : event.card === "SECOND_YELLOW" ? "SECOND_YELLOW_ADJUSTMENT" : null;
    if (action) { add(rowsForAction(event.eventKey, action, event.playerId, players, teams, event.revision, capabilities)); if (event.card !== "YELLOW") closeActiveAt(next, event.playerId, event.elapsedSec); }
  }
  if ("elapsedSec" in event) awardTimeMilestones(next, event.eventKey, event.revision, event.elapsedSec, players, teams, capabilities);
  if (event.kind === "MATCH_FINALIZED") { next.finalElapsedSec = event.elapsedSec; for (const playerId of Object.keys(next.activeFrom)) closeActiveAt(next, playerId, event.elapsedSec); }
  return next;
}

export function activeSeconds(state: FixtureScoreState, playerId: string): number { const start = state.activeFrom[playerId]; if (start === undefined) return 0; return Math.max(0, (state.activeTo[playerId] ?? state.finalElapsedSec ?? start) - start); }

const eventTime = (event: NormalizedSoccerEvent) => "elapsedSec" in event ? event.elapsedSec : Number.MAX_SAFE_INTEGER;
export function fullReplay(events: NormalizedSoccerEvent[], players: FixturePlayer[], teams: LockedTeam[], capabilities: Partial<Record<ScoringAction, Capability>>): FixtureScoreState { return [...events].sort((a, b) => eventTime(a) - eventTime(b) || a.eventKey.localeCompare(b.eventKey)).reduce((state, event) => projectEvent(state, event, players, teams, capabilities), initialFixtureScoreState()); }
