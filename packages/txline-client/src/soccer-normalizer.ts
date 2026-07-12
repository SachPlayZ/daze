import type { NormalizedSoccerEvent } from "../../domain/src/events";
import { asRecord } from "./contracts";
import { resolveSoccerActionPlayer, type CapturedLineupPlayer } from "./lineup";
import { decodeSoccerGamePhase, readSoccerStat } from "./soccer-stat-registry";

const value = (record: Record<string, unknown>, key: string): string => {
  const field = record[key];
  if (typeof field !== "string" && typeof field !== "number") throw new Error(`Score field ${key} is missing.`);
  return String(field);
};
const seconds = (record: Record<string, unknown>): number => {
  const clock = asRecord(record.Clock, "Soccer clock");
  const raw = clock.Seconds;
  if (typeof raw !== "number" || raw < 0 || !Number.isInteger(raw)) throw new Error("Soccer clock seconds are invalid.");
  return raw;
};
/** TxLINE updates the same action ID with newer `Seq` values. Keep action identity stable; `Seq` is the revision. */
export const eventKey = (record: Record<string, unknown>): string => `${value(record, "FixtureId")}:${value(record, "ConnectionId")}:${value(record, "Id")}`;
const revision = (record: Record<string, unknown>): number => Number(value(record, "Seq"));
/** Score actions label the side as 1/2; lineups and domain events use actual participant normative IDs. */
const participantId = (record: Record<string, unknown>): string => {
  const side = value(record, "Participant");
  if (side !== "1" && side !== "2") throw new Error("Soccer action participant side is invalid.");
  return value(record, `Participant${side}Id`);
};
const resolvedPlayer = (data: Record<string, unknown>, record: Record<string, unknown>, lineup: CapturedLineupPlayer[]) => {
  const player = resolveSoccerActionPlayer(value(data, "PlayerId"), lineup);
  const actionParticipantId = participantId(record);
  return player && player.participantId === actionParticipantId ? player : null;
};

type NormalizeOptions = { finalElapsedSec?: number; priorActions?: unknown[] };

/**
 * Captured goal amendments omit `Data.Id` despite the documented field. Resolve only a single
 * earlier confirmed goal with the exact prior payload and participant; ambiguity is quarantined.
 */
function goalAmendmentReplacement(record: Record<string, unknown>, priorActions: unknown[]): Record<string, unknown> | null {
  const data = asRecord(record.Data, "Soccer goal amendment");
  if (data.Action !== "goal") return null;
  const previous = asRecord(data.Previous, "Previous goal");
  const next = asRecord(data.New, "Replacement goal");
  const priorClock = seconds({ Clock: previous.Clock });
  const candidates = priorActions.flatMap((raw) => {
    try {
      const candidate = asRecord(raw, "Prior soccer action");
      if (candidate.Action !== "goal" || candidate.Confirmed !== true || value(candidate, "Participant") !== value(record, "Participant") || seconds(candidate) !== priorClock) return [];
      const candidateData = asRecord(candidate.Data, "Prior goal data");
      if (candidateData.GoalType !== previous.GoalType) return [];
      // The preceding confirmation can be partial; a present player ID must still agree exactly.
      if (candidateData.PlayerId !== undefined && candidateData.PlayerId !== previous.PlayerId) return [];
      return [candidate];
    } catch { return []; }
  });
  const logicalCandidates = new Map<string, Record<string, unknown>>();
  for (const candidate of candidates) {
    const key = `${value(candidate, "ConnectionId")}:${value(candidate, "Id")}`;
    const existing = logicalCandidates.get(key);
    if (!existing || revision(candidate) > revision(existing)) logicalCandidates.set(key, candidate);
  }
  if (logicalCandidates.size !== 1) return null;
  const original = [...logicalCandidates.values()][0];
  return { ...record, Action: "goal", Confirmed: true, Id: original.Id, ConnectionId: original.ConnectionId, Clock: next.Clock, Data: next };
}

/** Normalizes only captured, supported soccer score actions. Others must remain quarantined. */
export function normalizeSoccerScoreAction(raw: unknown, lineup: CapturedLineupPlayer[], options: NormalizeOptions = {}): NormalizedSoccerEvent | null {
  const record = asRecord(raw, "Soccer score action");
  const action = record.Action;
  if (action === "action_amend") {
    const replacement = goalAmendmentReplacement(record, options.priorActions ?? []);
    return replacement ? normalizeSoccerScoreAction(replacement, lineup, options) : null;
  }
  if (action === "action_discarded") return { kind: "ACTION_REPLACED", eventKey: `discard:${eventKey(record)}:${revision(record)}`, replacesEventKey: eventKey(record), revision: revision(record) };
  if (record.Confirmed !== true && action !== "game_finalised") return null;
  if (action === "kickoff" && value(record, "StatusId") === "2" && seconds(record) === 0) return { kind: "MATCH_STARTED", eventKey: eventKey(record), elapsedSec: 0, revision: revision(record) };
  if (action === "substitution") {
    const data = asRecord(record.Data, "Substitution data");
    const playerIn = resolveSoccerActionPlayer(value(data, "PlayerInId"), lineup);
    const playerOut = resolveSoccerActionPlayer(value(data, "PlayerOutId"), lineup);
    if (!playerIn || !playerOut) return null;
    if (playerIn.participantId !== playerOut.participantId) return null;
    return { kind: "SUBSTITUTION", eventKey: eventKey(record), elapsedSec: seconds(record), playerInId: playerIn.fixturePlayerId, playerOutId: playerOut.fixturePlayerId, participantId: playerIn.participantId, revision: revision(record) };
  }
  if (action === "goal") {
    const data = asRecord(record.Data, "Goal data");
    const scorer = resolveSoccerActionPlayer(value(data, "PlayerId"), lineup);
    if (!scorer) return null;
    const goalType = value(data, "GoalType");
    const goalKind = goalType === "Shot" || goalType === "Head" ? "OPEN_PLAY" : goalType === "Own" ? "OWN_GOAL" : null;
    if (!goalKind) return null;
    const phase = decodeSoccerGamePhase(value(record, "StatusId"));
    if (!phase || phase === "PE") return null;
    return { kind: "GOAL", eventKey: eventKey(record), elapsedSec: seconds(record), scorerId: scorer.fixturePlayerId, participantId: participantId(record), goalKind, period: phase, revision: revision(record) };
  }
  if (action === "penalty_outcome") {
    const data = asRecord(record.Data, "Penalty outcome data");
    const taker = resolvedPlayer(data, record, lineup);
    const outcome = value(data, "Outcome");
    const phase = decodeSoccerGamePhase(value(record, "StatusId"));
    if (!taker || !phase || phase === "PE" || (outcome !== "Scored" && outcome !== "Missed" && outcome !== "Retake")) return null;
    return { kind: "PENALTY_ATTEMPT", eventKey: eventKey(record), elapsedSec: seconds(record), playerId: taker.fixturePlayerId, participantId: taker.participantId, outcome: outcome.toUpperCase() as "SCORED" | "MISSED" | "RETAKE", period: phase, revision: revision(record) };
  }
  if (action === "yellow_card" || action === "red_card") {
    const data = asRecord(record.Data, "Card data");
    const recipient = resolvedPlayer(data, record, lineup);
    const phase = decodeSoccerGamePhase(value(record, "StatusId"));
    if (!recipient || !phase || phase === "PE") return null;
    const cardType = typeof data.Type === "string" ? data.Type : null;
    const card = action === "yellow_card" ? "YELLOW" : cardType === "StraightRed" ? "DIRECT_RED" : cardType === "SecondYellow" ? "SECOND_YELLOW" : null;
    if (!card) return null;
    return { kind: "CARD", eventKey: eventKey(record), elapsedSec: seconds(record), playerId: recipient.fixturePlayerId, participantId: recipient.participantId, card, revision: revision(record) };
  }
  if (action === "game_finalised") {
    const stats = asRecord(record.Stats, "Final score stats");
    const participant1Goals = readSoccerStat(stats, 1, "GOALS");
    const participant2Goals = readSoccerStat(stats, 2, "GOALS");
    if (participant1Goals === null || participant2Goals === null) throw new Error("Final score goal stats are missing.");
    const elapsedSec = typeof record.Clock === "object" && record.Clock ? seconds(record) : options.finalElapsedSec;
    if (elapsedSec === undefined || elapsedSec < 0) throw new Error("Final score needs a captured match clock.");
    return { kind: "MATCH_FINALIZED", eventKey: eventKey(record), elapsedSec, participant1Goals, participant2Goals, revision: revision(record) };
  }
  return null;
}

/** Preserves the greatest observed provider clock for final records that omit Clock. */
export function normalizeSoccerHistoricalActions(rawActions: unknown[], lineup: CapturedLineupPlayer[]): NormalizedSoccerEvent[] {
  const amendedSubstitutions = new Set(rawActions.flatMap((raw) => {
    try {
      const record = asRecord(raw, "Soccer historical action");
      if (record.Action !== "action_amend") return [];
      const data = asRecord(record.Data, "Soccer action amendment");
      if (data.Action !== "substitution" || typeof record.Participant !== "number") return [];
      const previous = asRecord(data.Previous, "Previous substitution");
      return [`${record.Participant}:${seconds({ Clock: previous.Clock })}`];
    } catch { return []; }
  }));
  let latestElapsedSec = 0;
  return rawActions.flatMap((raw, index) => {
    try {
      const record = asRecord(raw, "Soccer historical action");
      if (record.Action === "substitution" && record.Confirmed === true) {
        const data = asRecord(record.Data, "Substitution data");
        if (typeof data.Participant === "number" && amendedSubstitutions.has(`${data.Participant}:${seconds(record)}`)) return [];
      }
      const normalizedRaw = record.Action === "action_amend" ? (() => {
        const data = asRecord(record.Data, "Soccer action amendment");
        if (data.Action !== "substitution" || typeof record.Participant !== "number") return record;
        const next = asRecord(data.New, "Amended substitution");
        return { ...record, Action: "substitution", Confirmed: true, Clock: next.Clock, Data: { ...next, Participant: record.Participant } };
      })() : record;
      if (record.Clock && typeof record.Clock === "object") latestElapsedSec = Math.max(latestElapsedSec, seconds(record));
      const normalized = normalizeSoccerScoreAction(normalizedRaw, lineup, { finalElapsedSec: latestElapsedSec, priorActions: rawActions.slice(0, index) });
      return normalized ? [normalized] : [];
    } catch {
      return [];
    }
  });
}
