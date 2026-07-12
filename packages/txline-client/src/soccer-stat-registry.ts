/** TxLINE Soccer Feed v1.1 on-chain stat and phase encoding. Unknown values stay unknown. */
export const TXLINE_SOCCER_STAT_REGISTRY_VERSION = "txline-soccer-stat-v1.1";
export type SoccerStatMetric = "GOALS" | "YELLOW_CARDS" | "RED_CARDS" | "CORNERS";
export type SoccerStatPeriod = "TOTAL" | "H1" | "HT" | "H2" | "ET1" | "ET2" | "PE" | "ET_TOTAL";
export type SoccerStatKey = { key: string; participant: 1 | 2; metric: SoccerStatMetric; period: SoccerStatPeriod };

const baseStats: Record<number, { participant: 1 | 2; metric: SoccerStatMetric }> = {
  1: { participant: 1, metric: "GOALS" },
  2: { participant: 2, metric: "GOALS" },
  3: { participant: 1, metric: "YELLOW_CARDS" },
  4: { participant: 2, metric: "YELLOW_CARDS" },
  5: { participant: 1, metric: "RED_CARDS" },
  6: { participant: 2, metric: "RED_CARDS" },
  7: { participant: 1, metric: "CORNERS" },
  8: { participant: 2, metric: "CORNERS" },
};

const periods: Record<number, SoccerStatPeriod> = {
  0: "TOTAL",
  1000: "H1",
  2000: "HT",
  3000: "H2",
  4000: "ET1",
  5000: "ET2",
  6000: "PE",
  7000: "ET_TOTAL",
};

/** Decodes only documented `period_prefix + base_key` values. */
export function decodeSoccerStatKey(value: unknown): SoccerStatKey | null {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) return null;
  const encoded = Number(value);
  if (!Number.isSafeInteger(encoded)) return null;
  const base = encoded % 1000;
  const period = periods[encoded - base];
  const stat = baseStats[base];
  return period && stat ? { key: String(encoded), period, ...stat } : null;
}

/** The documented game phase IDs. Kept separate from stat period prefixes. */
export const soccerGamePhases = {
  1: "NS", 2: "H1", 3: "HT", 4: "H2", 5: "F", 6: "WET", 7: "ET1", 8: "HTET", 9: "ET2", 10: "FET", 11: "WPE", 12: "PE", 13: "FPE", 14: "I", 15: "A", 16: "C", 17: "TXCC", 18: "TXCS", 19: "P",
} as const;

export type SoccerGamePhase = (typeof soccerGamePhases)[keyof typeof soccerGamePhases];

export function decodeSoccerGamePhase(value: unknown): SoccerGamePhase | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const status = String(value);
  if (status === "PE") return "PE";
  return /^\d+$/.test(status) ? soccerGamePhases[Number(status) as keyof typeof soccerGamePhases] ?? null : null;
}

export function readSoccerStat(stats: Record<string, unknown>, participant: 1 | 2, metric: SoccerStatMetric, period: SoccerStatPeriod = "TOTAL"): number | null {
  const match = Object.keys(stats).map(decodeSoccerStatKey).find((stat): stat is SoccerStatKey => stat !== null && stat.participant === participant && stat.metric === metric && stat.period === period);
  if (!match) return null;
  const value = stats[match.key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}
