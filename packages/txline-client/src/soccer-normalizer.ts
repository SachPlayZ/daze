import type { NormalizedSoccerEvent } from "../../domain/src/events";
import { asRecord } from "./contracts";
import { resolveSoccerActionPlayer, type CapturedLineupPlayer } from "./lineup";

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
const eventKey = (record: Record<string, unknown>): string => `${value(record, "FixtureId")}:${value(record, "ConnectionId")}:${value(record, "Seq")}:${value(record, "Id")}`;
const revision = (record: Record<string, unknown>): number => Number(value(record, "Seq"));

/** Normalizes only captured, supported soccer score actions. Others must remain quarantined. */
export function normalizeSoccerScoreAction(raw: unknown, lineup: CapturedLineupPlayer[], options: { finalElapsedSec?: number } = {}): NormalizedSoccerEvent | null {
  const record = asRecord(raw, "Soccer score action");
  const action = record.Action;
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
    if (goalType !== "Shot" && goalType !== "Head") return null;
    return { kind: "GOAL", eventKey: eventKey(record), elapsedSec: seconds(record), scorerId: scorer.fixturePlayerId, participantId: scorer.participantId, goalKind: "OPEN_PLAY", period: value(record, "StatusId"), revision: revision(record) };
  }
  if (action === "game_finalised") {
    const stats = asRecord(record.Stats, "Final score stats");
    if (typeof stats["1"] !== "number" || typeof stats["2"] !== "number") throw new Error("Final score goal stats are missing.");
    const elapsedSec = typeof record.Clock === "object" && record.Clock ? seconds(record) : options.finalElapsedSec;
    if (elapsedSec === undefined || elapsedSec < 0) throw new Error("Final score needs a captured match clock.");
    return { kind: "MATCH_FINALIZED", eventKey: eventKey(record), elapsedSec, participant1Goals: stats["1"], participant2Goals: stats["2"], revision: revision(record) };
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
  return rawActions.flatMap((raw) => {
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
      const normalized = normalizeSoccerScoreAction(normalizedRaw, lineup, { finalElapsedSec: latestElapsedSec });
      return normalized ? [normalized] : [];
    } catch {
      return [];
    }
  });
}
