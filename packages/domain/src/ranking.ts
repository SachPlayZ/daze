export type RankingCandidate = { entryId: string; points: number; nonCaptainPoints: number; selectedPlayerGoals: number; lockedAt: string; entryHash: string };
export type RankedEntry = RankingCandidate & { rank: number };

/** Published deterministic standings order. Stake never participates. */
export function rankEntries(entries: RankingCandidate[]): RankedEntry[] {
  return [...entries].sort((a, b) => b.points - a.points || b.nonCaptainPoints - a.nonCaptainPoints || b.selectedPlayerGoals - a.selectedPlayerGoals || a.lockedAt.localeCompare(b.lockedAt) || a.entryHash.localeCompare(b.entryHash)).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

