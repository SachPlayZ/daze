import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { txlineSoccerWorldCupV1 } from "../../packages/config/src/position-mapping";
import { evaluateFixtureReadiness } from "../../packages/domain/src/readiness";
import { parseLineupAction } from "../../packages/txline-client/src/lineup";

const payload = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-snapshot-18175981.json", "utf8")).payload;
const players = parseLineupAction(payload.find((row: { Action: string }) => row.Action === "lineups"));
const readiness = evaluateFixtureReadiness("18175981", players.map((player) => ({ fixturePlayerId: player.fixturePlayerId, participantId: player.participantId, preferredName: player.preferredName, positionId: player.positionId, unitId: player.unitId, starter: player.starter })), txlineSoccerWorldCupV1);
assert.equal(readiness.ready, true, readiness.reasons.join(" "));
assert.deepEqual([...new Set(readiness.players.map((player) => player.position))].sort(), ["DEF", "FWD", "GK", "MID"]);
assert.equal(readiness.unknownPositionIds.length, 0);
assert.equal(readiness.unknownUnitIds.length, 0);
