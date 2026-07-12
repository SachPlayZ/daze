/** TxLINE odds snapshot (StablePrice) decoding. Display-only — never gates or affects fantasy scoring. Unknown values stay unknown. */
export const TXLINE_ODDS_NORMALIZER_VERSION = "txline-odds-v1";

export type OddsMarketKind = "1X2_PARTICIPANT_RESULT" | "ASIANHANDICAP_PARTICIPANT_GOALS" | "OVERUNDER_PARTICIPANT_GOALS";

const knownMarketKinds: readonly OddsMarketKind[] = [
  "1X2_PARTICIPANT_RESULT",
  "ASIANHANDICAP_PARTICIPANT_GOALS",
  "OVERUNDER_PARTICIPANT_GOALS",
];

export type OddsPrice = {
  name: string;
  decimalOdds: number;
  probability: number | null;
};

export type OddsMarket = {
  kind: OddsMarketKind;
  fixtureId: string;
  messageId: string;
  ts: number;
  bookmaker: string;
  inRunning: boolean;
  marketParameters: string | null;
  marketPeriod: string | null;
  prices: OddsPrice[];
};

export type MatchOdds = {
  part1Win: number;
  draw: number;
  part2Win: number;
  snapshotTs: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodePct(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (value === "NA") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Decodes one raw odds-snapshot payload item. Returns null for any unrecognized SuperOddsType or malformed shape (fail-closed). */
export function decodeOddsMarket(raw: unknown): OddsMarket | null {
  if (!isRecord(raw)) return null;
  const kindRaw = raw.SuperOddsType;
  if (typeof kindRaw !== "string" || !knownMarketKinds.includes(kindRaw as OddsMarketKind)) return null;
  const kind = kindRaw as OddsMarketKind;

  const fixtureId = raw.FixtureId;
  const messageId = raw.MessageId;
  const ts = raw.Ts;
  const bookmaker = raw.Bookmaker;
  const inRunning = raw.InRunning;
  const priceNames = raw.PriceNames;
  const prices = raw.Prices;
  const pct = raw.Pct;

  if (typeof fixtureId !== "number" && typeof fixtureId !== "string") return null;
  if (typeof messageId !== "string") return null;
  if (typeof ts !== "number") return null;
  if (typeof bookmaker !== "string") return null;
  if (typeof inRunning !== "boolean") return null;
  if (!Array.isArray(priceNames) || !Array.isArray(prices) || !Array.isArray(pct)) return null;
  if (priceNames.length !== prices.length || priceNames.length !== pct.length) return null;
  if (priceNames.some((n) => typeof n !== "string")) return null;
  if (prices.some((p) => typeof p !== "number")) return null;

  const decodedPrices: OddsPrice[] = priceNames.map((name, index) => ({
    name: name as string,
    decimalOdds: (prices[index] as number) / 1000,
    probability: decodePct(pct[index]),
  }));

  const marketParameters = typeof raw.MarketParameters === "string" ? raw.MarketParameters : null;
  const marketPeriod = typeof raw.MarketPeriod === "string" ? raw.MarketPeriod : null;

  return {
    kind,
    fixtureId: String(fixtureId),
    messageId,
    ts,
    bookmaker,
    inRunning,
    marketParameters,
    marketPeriod,
    prices: decodedPrices,
  };
}

/** Decodes a full odds-snapshot payload array, dropping any unrecognized items. */
export function decodeOddsSnapshot(payload: unknown[]): OddsMarket[] {
  return payload.map(decodeOddsMarket).filter((market): market is OddsMarket => market !== null);
}

/** Extracts the canonical full-match (MarketPeriod === null) 1X2 result as a simple before/after display figure. Returns null when absent. */
export function extractMatchOdds(markets: OddsMarket[], snapshotTs: string): MatchOdds | null {
  const market = markets.find((m) => m.kind === "1X2_PARTICIPANT_RESULT" && m.marketPeriod === null);
  if (!market) return null;
  const part1 = market.prices.find((p) => p.name === "part1");
  const draw = market.prices.find((p) => p.name === "draw");
  const part2 = market.prices.find((p) => p.name === "part2");
  if (!part1 || !draw || !part2) return null;
  return { part1Win: part1.decimalOdds, draw: draw.decimalOdds, part2Win: part2.decimalOdds, snapshotTs };
}
