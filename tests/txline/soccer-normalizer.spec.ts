import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLineupAction } from "../../packages/txline-client/src/lineup";
import { normalizeSoccerHistoricalActions, normalizeSoccerScoreAction } from "../../packages/txline-client/src/soccer-normalizer";

const payload = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-snapshot-18175981.json", "utf8")).payload;
const lineup = parseLineupAction(payload.find((row: { Action: string }) => row.Action === "lineups"));
const substitution = normalizeSoccerScoreAction(payload.find((row: { Action: string }) => row.Action === "substitution"), lineup);
assert.equal(substitution?.kind, "SUBSTITUTION");
assert.ok(substitution && lineup.some((player) => player.fixturePlayerId === substitution.playerInId));
const goal = normalizeSoccerScoreAction(payload.find((row: { Action: string }) => row.Action === "goal"), lineup);
assert.equal(goal?.kind, "GOAL");
assert.equal(goal?.goalKind, "OPEN_PLAY", "documented GoalType Shot is a verified non-penalty goal action");
const final = normalizeSoccerScoreAction(payload.find((row: { Action: string }) => row.Action === "game_finalised"), lineup, { finalElapsedSec: 5400 });
assert.equal(final?.kind, "MATCH_FINALIZED");
if (final?.kind === "MATCH_FINALIZED") assert.deepEqual([final.participant1Goals, final.participant2Goals], [3, 0]);

const historical = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18175981.json", "utf8")).payload;
const historicalLineup = parseLineupAction(historical.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const events = normalizeSoccerHistoricalActions(historical, historicalLineup);
assert.ok(events.some((event) => event.kind === "MATCH_STARTED"));
assert.equal(events.filter((event) => event.kind === "GOAL").length, 3);
assert.equal(events.filter((event) => event.kind === "SUBSTITUTION").length, 10, "captured substitution amendments replace incomplete prior revisions");
const historicalFinal = events.find((event) => event.kind === "MATCH_FINALIZED");
assert.ok(historicalFinal && historicalFinal.elapsedSec >= 5400, "finalization keeps the observed match clock");
