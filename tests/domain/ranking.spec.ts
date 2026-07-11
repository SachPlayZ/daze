import assert from "node:assert/strict";
import { rankEntries } from "../../packages/domain/src/ranking";
const ranked = rankEntries([
  { entryId: "later", points: 20, nonCaptainPoints: 10, selectedPlayerGoals: 2, lockedAt: "2026-01-01T01:00:00Z", entryHash: "b" },
  { entryId: "earlier", points: 20, nonCaptainPoints: 10, selectedPlayerGoals: 2, lockedAt: "2026-01-01T00:00:00Z", entryHash: "z" },
]);
assert.deepEqual(ranked.map((entry) => entry.entryId), ["earlier", "later"]);
