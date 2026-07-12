import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeOddsMarket, decodeOddsSnapshot, extractMatchOdds } from "../../packages/txline-client/src/odds-normalizer";

const literalMarket = {
  FixtureId: 18222446,
  MessageId: "1837376865:00003:000134-10021-stab",
  Ts: 1783816942324,
  Bookmaker: "TXLineStablePriceDemargined",
  BookmakerId: 10021,
  SuperOddsType: "1X2_PARTICIPANT_RESULT",
  GameState: null,
  InRunning: false,
  MarketParameters: null,
  MarketPeriod: null,
  PriceNames: ["part1", "draw", "part2"],
  Prices: [2638, 2101, 6901],
  Pct: ["37.908", "47.596", "NA"],
};

const decoded = decodeOddsMarket(literalMarket);
assert.ok(decoded);
assert.equal(decoded?.kind, "1X2_PARTICIPANT_RESULT");
assert.deepEqual(
  decoded?.prices.map((p) => p.decimalOdds),
  [2.638, 2.101, 6.901],
  "Prices are integer decimal odds x1000",
);
assert.equal(decoded?.prices[0].probability, 37.908, "Pct numeric string parses to decimal probability");
assert.equal(decoded?.prices[2].probability, null, "Pct literal 'NA' decodes to null, never coerced to a number");

assert.equal(decodeOddsMarket({ ...literalMarket, SuperOddsType: "FUTURE_UNKNOWN_MARKET" }), null, "unknown SuperOddsType returns null (fail-closed)");
assert.equal(decodeOddsMarket({ ...literalMarket, FixtureId: undefined }), null, "missing required field returns null");
assert.equal(decodeOddsMarket(null), null, "non-object input returns null");

assert.equal(extractMatchOdds([], "2026-07-12T00:00:00.000Z"), null, "no markets means no extractable match odds");
const halfOnly = decodeOddsSnapshot([{ ...literalMarket, MarketPeriod: "half=1" }]);
assert.equal(extractMatchOdds(halfOnly, "2026-07-12T00:00:00.000Z"), null, "half-period markets are excluded from the full-match figure");

const mixedPayload = [literalMarket, { ...literalMarket, SuperOddsType: "SOME_UNSUPPORTED_TYPE" }];
assert.equal(decodeOddsSnapshot(mixedPayload).length, 1, "unknown-type records are filtered out, known ones kept");

// Real captured devnet payload (fixture 18222446, live at capture time).
const capturedPayload = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/odds-snapshot-18222446.json", "utf8")).payload;
const capturedMarkets = decodeOddsSnapshot(capturedPayload);
assert.equal(capturedMarkets.length, capturedPayload.length, "every real captured market decodes cleanly");
const capturedMatchOdds = extractMatchOdds(capturedMarkets, "2026-07-12T00:42:49.918Z");
assert.ok(capturedMatchOdds, "real capture contains a full-match 1X2 market");
assert.deepEqual(
  [capturedMatchOdds?.part1Win, capturedMatchOdds?.draw, capturedMatchOdds?.part2Win],
  [1.751, 3.621, 6.544],
  "real captured full-match prices decode to the exact observed values",
);

// The only historical replay fixture has no odds data — must degrade to empty/null, never fabricate.
const emptyPayload = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/odds-snapshot-18175981.json", "utf8")).payload;
assert.deepEqual(decodeOddsSnapshot(emptyPayload), [], "replay fixture 18175981 has a real empty odds array");
assert.equal(extractMatchOdds(decodeOddsSnapshot(emptyPayload), "2026-07-12T00:42:19.017Z"), null);
