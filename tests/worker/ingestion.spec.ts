import assert from "node:assert/strict";
import { ingestProviderMessage } from "../../apps/worker/src/ingestion";

const hashes = new Set<string>(); let persisted = 0; let projected = 0; let advanced = 0;
const store = { hasContentHash: async (hash: string) => hashes.has(hash), persist: async (event: { contentHash: string }) => { hashes.add(event.contentHash); persisted += 1; }, enqueueProjection: async () => { projected += 1; }, advanceCursor: async () => { advanced += 1; } };
const raw = { fixtureId: "fixture", id: "goal", connectionId: "scores", sequence: "5", revision: "1", timestamp: "2026-06-01T12:00:00Z" };
async function run() {
  assert.equal((await ingestProviderMessage(raw, store)).accepted, true);
  assert.equal((await ingestProviderMessage(raw, store)).accepted, false);
  assert.deepEqual([persisted, projected, advanced], [1, 1, 1]);
}
void run();
