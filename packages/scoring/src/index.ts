import type { Position } from "../../domain/src";

export type Capability = "VERIFIED" | "SHADOW" | "DISABLED";
export type ScoringAction = "STARTING_APPEARANCE" | "SUBSTITUTE_APPEARANCE" | "APPEARANCE_60_REACHED" | "GOAL" | "PENALTY_GOAL" | "PENALTY_MISS" | "OWN_GOAL" | "YELLOW_CARD" | "DIRECT_RED_CARD" | "SECOND_YELLOW_ADJUSTMENT" | "CLEAN_SHEET" | "GOALS_CONCEDED" | "VICE_CAPTAIN_FALLBACK";
export type LedgerRow = { entryId: string; sourceEventKey: string; sourceRevision: string; action: ScoringAction; playerId: string; basePoints: number; appliedPoints: number; provisional: boolean; reversed?: boolean; reversalOf?: string };

const points: Record<ScoringAction, Partial<Record<Position, number>> & { all?: number }> = {
  STARTING_APPEARANCE: { all: 1 }, SUBSTITUTE_APPEARANCE: { all: 1 }, APPEARANCE_60_REACHED: { all: 1 },
  GOAL: { GK: 6, DEF: 6, MID: 5, FWD: 4 }, PENALTY_GOAL: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
  PENALTY_MISS: { all: -2 }, OWN_GOAL: { all: -2 }, YELLOW_CARD: { all: -1 }, DIRECT_RED_CARD: { all: -3 }, SECOND_YELLOW_ADJUSTMENT: { all: -2 },
  CLEAN_SHEET: { GK: 4, DEF: 4, MID: 1, FWD: 0 }, GOALS_CONCEDED: { GK: -1, DEF: -1, MID: 0, FWD: 0 }, VICE_CAPTAIN_FALLBACK: { all: 0 },
};

export function scoreAction(input: Omit<LedgerRow, "basePoints" | "appliedPoints"> & { position: Position; captain: boolean; capability: Capability }): LedgerRow | null {
  if (input.capability !== "VERIFIED") return null;
  const basePoints = points[input.action][input.position] ?? points[input.action].all ?? 0;
  return { ...input, basePoints, appliedPoints: basePoints * (input.captain ? 2 : 1) };
}

export function entryTotal(rows: LedgerRow[]): number {
  return rows.filter((row) => !row.reversed).reduce((total, row) => total + row.appliedPoints, 0);
}

export function ledgerRowIdentity(row: LedgerRow): string { return `${row.entryId}:${row.sourceEventKey}:${row.sourceRevision}:${row.action}:${row.playerId}`; }
export function reverse(row: LedgerRow): LedgerRow {
  return { ...row, sourceRevision: `${row.sourceRevision}:reversal`, appliedPoints: -row.appliedPoints, reversalOf: ledgerRowIdentity(row) };
}
