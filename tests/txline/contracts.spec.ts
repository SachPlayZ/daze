import assert from "node:assert/strict";
import { parseProviderEnvelope } from "../../packages/txline-client/src/contracts";
import { sourceEventKey } from "../../packages/txline-client/src/identity";
import { TxlineClient } from "../../packages/txline-client/src";
assert.throws(() => parseProviderEnvelope({ id: "missing-fixture" }));
const event = parseProviderEnvelope({ fixtureId: 123, id: "action", connectionId: "scores", sequence: 5, revision: 2 });
assert.equal(sourceEventKey(event), "123:scores:5:action");

const originalFetch = global.fetch;
let sawHeaders = false;
void (async () => {
  global.fetch = async (_input, init) => { const headers = new Headers(init?.headers); sawHeaders = headers.get("Accept") === "text/event-stream" && headers.has("Authorization") && headers.has("X-Api-Token"); return new Response("data: {}\n\n", { status: 200 }); };
  await new TxlineClient({ origin: "https://txline.test", apiToken: "test", guestJwt: "guest" }).openEventStream("/api/scores/stream");
  assert.equal(sawHeaders, true);
  global.fetch = originalFetch;
})().catch((error) => { global.fetch = originalFetch; throw error; });
