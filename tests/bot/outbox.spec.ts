import assert from "node:assert/strict";
import { enqueueNotification } from "../../apps/bot/src/outbox";
const sent = new Set<string>(); const store = { hasKey: async (key: string) => sent.has(key), enqueue: async (intent: { idempotencyKey: string }) => { sent.add(intent.idempotencyKey); } };
async function run() { const intent = { telegramUserId: "1", sourceEventKey: "goal", sourceRevision: "1", type: "POINT_IMPACT" as const, message: "You gained +5" }; assert.equal(await enqueueNotification(intent, store), true); assert.equal(await enqueueNotification(intent, store), false); }
void run();

