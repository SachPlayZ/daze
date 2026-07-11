import { strict as assert } from "node:assert";
import { entryTotal, scoreAction } from "../../packages/scoring/src";

const goal = scoreAction({ entryId: "entry", sourceEventKey: "event", sourceRevision: "1", action: "GOAL", playerId: "player", position: "MID", captain: true, capability: "VERIFIED", provisional: true });
assert.equal(goal?.appliedPoints, 10);
assert.equal(entryTotal(goal ? [goal] : []), 10);
assert.equal(scoreAction({ entryId: "entry", sourceEventKey: "event", sourceRevision: "1", action: "GOAL", playerId: "player", position: "MID", captain: false, capability: "SHADOW", provisional: true }), null);

