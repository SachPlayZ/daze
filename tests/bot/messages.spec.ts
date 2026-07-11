import assert from "node:assert/strict";
import { correctionMessage, pointImpactMessage, TelegramClient } from "../../packages/telegram/src";

const message = pointImpactMessage({ minute: 73, action: "Goal", playerName: "Mbappé", basePoints: 4, appliedPoints: 8, previousTotal: 18, nextTotal: 26, previousRank: 18, nextRank: 4, contestUrl: "https://daze.test/contest/1" });
assert.match(message, /Captain ×2/);
assert.match(message, /Rank #18 → #4/);
assert.match(message, /https:\/\/daze\.test/);
assert.match(correctionMessage({ previousImpact: 5, correctedImpact: 0, newTotal: 32, contestUrl: "https://daze.test/contest/1" }), /Corrected impact: \+0/);
let request: { url: string; body: string } | null = null;
const client = new TelegramClient("token", async (url, init) => { request = { url, body: String(init.body) }; return new Response("{}", { status: 200 }); });
void (async () => {
  await client.sendDirectMessage("12345", "Hello");
  assert.match(request!.url, /bottoken\/sendMessage/);
  assert.match(request!.body, /12345/);
  await assert.rejects(() => client.sendDirectMessage("-100123", "No group"));
})().catch((error) => { throw error; });
