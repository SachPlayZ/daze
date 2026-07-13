import assert from "node:assert/strict";
import { historicalReplayNotifications } from "../../apps/api/src/historical-replay-notifications";

const rows = [
  { entryId: "you", sourceEventKey: "start", sourceRevision: "1", action: "STARTING_APPEARANCE" as const, playerId: "p1", basePoints: 1, appliedPoints: 1, provisional: true },
  { entryId: "you", sourceEventKey: "start", sourceRevision: "1", action: "STARTING_APPEARANCE" as const, playerId: "p2", basePoints: 1, appliedPoints: 2, provisional: true },
];
const notifications = historicalReplayNotifications({ telegramUserId: "42", sessionId: "session", entryId: "you", rows, playerNames: new Map([["p1", "One"], ["p2", "Two"]]), minute: 1, previousTotal: 0, nextTotal: 3, previousRank: 4, nextRank: 2, contestUrl: "https://daze.example/replay/fixture" });
assert.equal(notifications.length, 3);
assert.match(notifications[0]!.text, /Your total: 0 → 1/);
assert.match(notifications[1]!.text, /Your total: 1 → 3/);
assert.match(notifications[2]!.text, /#4 → #2/);
assert.equal(new Set(notifications.map((notification) => notification.idempotencyKey)).size, notifications.length);
