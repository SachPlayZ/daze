import assert from "node:assert/strict";
import { evaluateFixtureReadiness } from "../../packages/domain/src/readiness";
import type { PositionMapping } from "../../packages/domain/src/readiness";

const mapping: PositionMapping = { version: "capture-1", positionIds: { "1": "GK", "2": "DEF", "3": "MID", "4": "FWD" }, unitIds: {}, precedence: "POSITION_THEN_UNIT", capturedFromFixtureIds: ["fixture"], verifiedAt: "2026-01-01T00:00:00Z" };
const lineup = [
  { fixturePlayerId: "a-gk", participantId: "a", preferredName: "A GK", positionId: "1", unitId: null },
  { fixturePlayerId: "b-gk", participantId: "b", preferredName: "B GK", positionId: "1", unitId: null },
  { fixturePlayerId: "a-def", participantId: "a", preferredName: "A DEF", positionId: "2", unitId: null },
  { fixturePlayerId: "b-mid", participantId: "b", preferredName: "B MID", positionId: "3", unitId: null },
  { fixturePlayerId: "a-fwd", participantId: "a", preferredName: "A FWD", positionId: "4", unitId: null },
];
assert.equal(evaluateFixtureReadiness("fixture", lineup, mapping).ready, true);
assert.equal(evaluateFixtureReadiness("fixture", [...lineup, { fixturePlayerId: "unknown", participantId: "b", preferredName: "Unknown", positionId: "99", unitId: null }], mapping).ready, false);
