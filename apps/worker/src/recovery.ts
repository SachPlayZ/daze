import type { NormalizedSoccerEvent } from "../../../packages/domain/src/events";
import type { CapturedLineupPlayer } from "../../../packages/txline-client/src/lineup";
import { normalizeSoccerHistoricalActions } from "../../../packages/txline-client/src/soccer-normalizer";

export type SequenceCursor = { fixtureId: string; connectionId: string | null; lastSequence: bigint | null };
export function hasSequenceGap(cursor: SequenceCursor, connectionId: string | null, incomingSequence: string | null): boolean {
  if (!incomingSequence || cursor.lastSequence === null || cursor.connectionId !== connectionId) return false;
  try { return BigInt(incomingSequence) > cursor.lastSequence + 1n; } catch { return true; }
}
export type RecoveryState = "LIVE" | "RECONCILING";
export function recoveryState(cursor: SequenceCursor, connectionId: string | null, incomingSequence: string | null): RecoveryState { return hasSequenceGap(cursor, connectionId, incomingSequence) ? "RECONCILING" : "LIVE"; }

export function latestObservedMatchClock(rawActions: unknown[]): number | undefined {
  let latest: number | undefined;
  for (const raw of rawActions) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const clock = (raw as Record<string, unknown>).Clock;
    if (!clock || typeof clock !== "object" || Array.isArray(clock)) continue;
    const seconds = (clock as Record<string, unknown>).Seconds;
    if (typeof seconds === "number" && Number.isInteger(seconds) && seconds >= 0) latest = Math.max(latest ?? 0, seconds);
  }
  return latest;
}

/** A raw final may already be deduplicated after restart; rebuild it from the immutable sequence exactly once. */
export function recoverMissingFinalizedEvent(rawActions: unknown[], lineup: CapturedLineupPlayer[], existingEvents: NormalizedSoccerEvent[]): Extract<NormalizedSoccerEvent, { kind: "MATCH_FINALIZED" }> | null {
  if (existingEvents.some((event) => event.kind === "MATCH_FINALIZED")) return null;
  return normalizeSoccerHistoricalActions(rawActions, lineup).find((event): event is Extract<NormalizedSoccerEvent, { kind: "MATCH_FINALIZED" }> => event.kind === "MATCH_FINALIZED") ?? null;
}
