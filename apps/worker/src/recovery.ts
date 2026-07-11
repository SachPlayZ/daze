export type SequenceCursor = { fixtureId: string; connectionId: string | null; lastSequence: bigint | null };
export function hasSequenceGap(cursor: SequenceCursor, connectionId: string | null, incomingSequence: string | null): boolean {
  if (!incomingSequence || cursor.lastSequence === null || cursor.connectionId !== connectionId) return false;
  try { return BigInt(incomingSequence) > cursor.lastSequence + 1n; } catch { return true; }
}
export type RecoveryState = "LIVE" | "RECONCILING";
export function recoveryState(cursor: SequenceCursor, connectionId: string | null, incomingSequence: string | null): RecoveryState { return hasSequenceGap(cursor, connectionId, incomingSequence) ? "RECONCILING" : "LIVE"; }

