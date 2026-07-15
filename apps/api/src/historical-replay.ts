import { txlineSoccerWorldCupV1 } from "../../../packages/config/src/position-mapping";
import { capabilityRegistry } from "../../../packages/config/src/capabilities";
import { quickPick, validateTeam, type DraftTeam, type FixturePlayer } from "../../../packages/domain/src";
import { rankEntries } from "../../../packages/domain/src/ranking";
import { evaluateFixtureReadiness } from "../../../packages/domain/src/readiness";
import { entryTotal, type LedgerRow } from "../../../packages/scoring/src";
import { fullReplay } from "../../../packages/scoring/src/projector";
import { eventKey, normalizeSoccerHistoricalActions } from "../../../packages/txline-client/src/soccer-normalizer";
import { parseLineupAction } from "../../../packages/txline-client/src/lineup";
import { contentHash } from "../../../packages/txline-client/src/identity";

type RawScore = Record<string, unknown>;

export type HistoricalReplayReadModel = {
  fixtureId: string;
  historical: true;
  participants: { id: string; name: string }[];
  mappingVersion: string;
  readiness: { ready: boolean; reasons: string[] };
  players: FixturePlayer[];
  eventSummary: { total: number; normalized: number; goals: number; substitutions: number; finalScore: { participant1Goals: number; participant2Goals: number } | null; settlementBlocked: boolean; unresolvedScoringActions: number };
};

export type JudgeModeEntry = { rank: number; entryId: string; points: number; nonCaptainPoints: number; selectedPlayerGoals: number };

export function quickPickHistoricalReplay(rawActions: unknown[], formation: DraftTeam["formation"], seed: number): DraftTeam {
  const replay = buildHistoricalReplayReadModel(rawActions);
  const team = quickPick(replay.players, formation, seed);
  if (!team) throw new Error("The verified lineup cannot satisfy that formation.");
  return team;
}

export function validateHistoricalReplayDraft(rawActions: unknown[], draft: DraftTeam): { valid: boolean; errors: string[] } {
  const replay = buildHistoricalReplayReadModel(rawActions);
  if (!replay.readiness.ready) return { valid: false, errors: replay.readiness.reasons };
  const errors = validateTeam(draft, replay.players);
  return { valid: errors.length === 0, errors };
}

export type ReplayImpact = { action: string; playerName: string; elapsedSec: number | null; basePoints: number; appliedPoints: number; reversed: boolean; sourceEventKey: string; providerTimestamp: string | null; contentHash: string | null };

export function projectHistoricalReplayDraft(rawActions: unknown[], draft: DraftTeam): { valid: boolean; errors: string[]; total: number | null; rows: LedgerRow[]; impacts: ReplayImpact[]; reconciling: boolean; fixtureId: string | null } {
  const validation = validateHistoricalReplayDraft(rawActions, draft);
  if (!validation.valid) return { ...validation, total: null, rows: [], impacts: [], reconciling: true, fixtureId: null };
  const actions = rawActions.map(record);
  const lineupRecord = [...actions].reverse().find((action) => action.Action === "lineups" && action.Confirmed === true);
  if (!lineupRecord) return { valid: false, errors: ["Historical replay has no confirmed lineup action."], total: null, rows: [], impacts: [], reconciling: true, fixtureId: null };
  const lineup = parseLineupAction(lineupRecord);
  const replay = buildHistoricalReplayReadModel(actions);
  const events = normalizeSoccerHistoricalActions(actions, lineup);
  const state = fullReplay(events, replay.players, [{ entryId: "replay-draft", playerIds: draft.playerIds, captainId: draft.captainId, viceCaptainId: draft.viceCaptainId }], {
    STARTING_APPEARANCE: "VERIFIED",
    SUBSTITUTE_APPEARANCE: "VERIFIED",
    APPEARANCE_60_REACHED: "VERIFIED",
    GOAL: "VERIFIED",
    PENALTY_GOAL: capabilityRegistry.PENALTY_GOAL.state,
    OWN_GOAL: capabilityRegistry.OWN_GOAL.state,
    YELLOW_CARD: capabilityRegistry.YELLOW_CARD.state,
    DIRECT_RED_CARD: capabilityRegistry.RED_CARD.state,
    SECOND_YELLOW_ADJUSTMENT: capabilityRegistry.SECOND_YELLOW.state,
    CLEAN_SHEET: "VERIFIED",
    GOALS_CONCEDED: "VERIFIED",
  });
  const eventTimes = new Map(events.map((event) => [event.eventKey, "elapsedSec" in event ? event.elapsedSec : null]));
  const players = new Map(replay.players.map((player) => [player.fixturePlayerId, player.preferredName]));
  const rawByEventKey = new Map<string, RawScore>();
  for (const action of actions) { try { rawByEventKey.set(eventKey(action), action); } catch { /* record has no stable event identity, skip */ } }
  const impacts = state.rows.map((row) => {
    const raw = rawByEventKey.get(row.sourceEventKey);
    return {
      action: row.action, playerName: players.get(row.playerId) ?? "Unknown player", elapsedSec: eventTimes.get(row.sourceEventKey) ?? null,
      basePoints: row.basePoints, appliedPoints: row.appliedPoints, reversed: Boolean(row.reversed),
      sourceEventKey: row.sourceEventKey, providerTimestamp: raw && typeof raw.Ts === "number" ? new Date(raw.Ts).toISOString() : null, contentHash: raw ? contentHash(raw) : null,
    };
  });
  return { valid: true, errors: [], total: entryTotal(state.rows), rows: state.rows, impacts, reconciling: replay.eventSummary.settlementBlocked, fixtureId: replay.fixtureId };
}

/** Judge Mode uses only deterministic teams generated from real captured lineups and events. */
export function buildJudgeModeLeaderboard(rawActions: unknown[]): { entries: JudgeModeEntry[]; reconciling: boolean } {
  const replay = buildHistoricalReplayReadModel(rawActions);
  const entries = [11, 29, 47, 83].flatMap((seed) => {
    const team = quickPickHistoricalReplay(rawActions, "4-3-3", seed);
    const projection = projectHistoricalReplayDraft(rawActions, team);
    if (!projection.valid || projection.total === null) return [];
    return [{
      entryId: `Judge ${seed}`,
      points: projection.total,
      nonCaptainPoints: projection.rows.filter((row) => !row.reversed && row.playerId !== team.captainId).reduce((total, row) => total + row.appliedPoints, 0),
      selectedPlayerGoals: projection.rows.filter((row) => !row.reversed && row.action === "GOAL").length,
      lockedAt: new Date(1782853200000 + seed).toISOString(),
      entryHash: `judge-${seed}`,
    }];
  });
  return { entries: rankEntries(entries).map(({ rank, entryId, points, nonCaptainPoints, selectedPlayerGoals }) => ({ rank, entryId, points, nonCaptainPoints, selectedPlayerGoals })), reconciling: replay.eventSummary.settlementBlocked };
}

const record = (value: unknown): RawScore => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Historical score record must be an object.");
  return value as RawScore;
};
const text = (value: unknown, field: string): string => {
  const item = record(value)[field];
  if (typeof item !== "string" && typeof item !== "number") throw new Error(`Historical record missing ${field}.`);
  return String(item);
};
const clockSeconds = (value: unknown): number => {
  const seconds = record(record(value).Clock).Seconds;
  if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 0) throw new Error("Historical clock is invalid.");
  return seconds;
};

/** Builds a consumer-safe replay read model only from immutable captured TxLINE payloads. */
export function buildHistoricalReplayReadModel(rawActions: unknown[]): HistoricalReplayReadModel {
  if (!rawActions.length) throw new Error("Historical replay has no provider actions.");
  const actions = rawActions.map(record);
  const lineupRecord = [...actions].reverse().find((action) => action.Action === "lineups" && action.Confirmed === true);
  if (!lineupRecord) throw new Error("Historical replay has no confirmed lineup action.");
  const lineup = parseLineupAction(lineupRecord);
  const fixtureId = text(actions[0], "FixtureId");
  const readiness = evaluateFixtureReadiness(fixtureId, lineup.map((player) => ({ ...player, positionId: player.positionId, unitId: player.unitId })), txlineSoccerWorldCupV1);
  const normalized = normalizeSoccerHistoricalActions(actions, lineup);
  const final = [...normalized].reverse().find((event): event is Extract<(typeof normalized)[number], { kind: "MATCH_FINALIZED" }> => event.kind === "MATCH_FINALIZED");
  const normalizedRelevant = normalized.filter((event) => event.kind === "GOAL" || event.kind === "SUBSTITUTION" || event.kind === "CARD" || event.kind === "PENALTY_ATTEMPT");
  const lineupGroups = record(lineupRecord).Lineups;
  if (!Array.isArray(lineupGroups)) throw new Error("Historical lineup groups are invalid.");
  const teamName = (participantId: string): string => {
    const group = lineupGroups.find((item) => {
      const candidate = record(item).normativeId;
      return String(candidate) === participantId;
    });
    return group ? text(group, "preferredName") : "Unknown team";
  };
  const participant1Id = text(actions[0], "Participant1Id");
  const participant2Id = text(actions[0], "Participant2Id");
  const participant1 = { id: participant1Id, name: teamName(participant1Id) };
  const participant2 = { id: participant2Id, name: teamName(participant2Id) };
  const expectedGoalCount = actions.filter((action) => action.Action === "goal" && action.Confirmed === true && record(action.Data).PlayerId !== undefined).length;
  const expectedSubstitutionCount = actions.filter((action) => action.Action === "substitution" && action.Confirmed === true).filter((action) => {
    const data = record(action.Data);
    return !(typeof data.Participant === "number" && actions.some((amendment) => {
      if (amendment.Action !== "action_amend" || amendment.Participant !== data.Participant) return false;
      try { const amendmentData = record(amendment.Data); return amendmentData.Action === "substitution" && clockSeconds({ Clock: record(amendmentData.Previous).Clock }) === clockSeconds(action); } catch { return false; }
    }));
  }).length + actions.filter((action) => { try { return action.Action === "action_amend" && record(action.Data).Action === "substitution"; } catch { return false; } }).length;
  const expectedYellowCardCount = actions.filter((action) => action.Action === "yellow_card" && action.Confirmed === true).filter((action) => { try { return record(action.Data).PlayerId !== undefined; } catch { return false; } }).length;
  const expectedRedCardCount = actions.filter((action) => action.Action === "red_card" && action.Confirmed === true).filter((action) => { try { const data = record(action.Data); return data.PlayerId !== undefined && (data.Type === "StraightRed" || data.Type === "SecondYellow"); } catch { return false; } }).length;
  const expectedPenaltyGoalCount = actions.filter((action) => action.Action === "penalty_outcome" && action.Confirmed === true).filter((action) => { try { const data = record(action.Data); return data.Outcome === "Scored" && data.PlayerId !== undefined && action.StatusId !== 12; } catch { return false; } }).length;
  const unresolvedScoringActions = Math.max(0, expectedGoalCount + expectedSubstitutionCount + expectedYellowCardCount + expectedRedCardCount + expectedPenaltyGoalCount - normalizedRelevant.length);
  return {
    fixtureId,
    historical: true,
    participants: [participant1, participant2],
    mappingVersion: txlineSoccerWorldCupV1.version,
    readiness: { ready: readiness.ready, reasons: readiness.reasons },
    players: readiness.players,
    eventSummary: {
      total: actions.length,
      normalized: normalized.length,
      goals: normalized.filter((event) => event.kind === "GOAL").length,
      substitutions: normalized.filter((event) => event.kind === "SUBSTITUTION").length,
      finalScore: final ? { participant1Goals: final.participant1Goals, participant2Goals: final.participant2Goals } : null,
      settlementBlocked: unresolvedScoringActions > 0,
      unresolvedScoringActions,
    },
  };
}
