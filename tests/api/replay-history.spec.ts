import assert from "node:assert/strict";
import { groupCompletedDatabaseReplayRows } from "../../frontend/lib/replay-history";

const completed = groupCompletedDatabaseReplayRows([
  { fixture_id: "18237038", kickoff_at: "2026-07-14T19:00:00.000Z", raw_id: "1", raw_json: { FixtureId: 18237038, Action: "lineups", Confirmed: true } },
  { fixture_id: "18237038", kickoff_at: "2026-07-14T19:00:00.000Z", raw_id: "2", raw_json: { FixtureId: 18237038, Action: "game_finalised", Stats: { "1": 0, "2": 2 } } },
  { fixture_id: "future", kickoff_at: "2026-07-15T19:00:00.000Z", raw_id: "3", raw_json: { FixtureId: "future", Action: "lineups", Confirmed: true } },
]);

assert.equal(completed.length, 1, "Past fixtures require a durable final action");
assert.deepEqual(completed[0] && { fixtureId: completed[0].fixtureId, source: completed[0].source, actions: completed[0].actions.length }, { fixtureId: "18237038", source: "DATABASE", actions: 2 });
