import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLineupAction } from "../../packages/txline-client/src/lineup";
import { normalizeSoccerHistoricalActions, normalizeSoccerScoreAction } from "../../packages/txline-client/src/soccer-normalizer";
import { decodeSoccerGamePhase, decodeSoccerStatKey, readSoccerStat } from "../../packages/txline-client/src/soccer-stat-registry";
import { entryTotal } from "../../packages/scoring/src";
import { fullReplay, initialFixtureScoreState, projectEvent } from "../../packages/scoring/src/projector";

assert.deepEqual(decodeSoccerStatKey("1"), { key: "1", participant: 1, metric: "GOALS", period: "TOTAL" });
assert.deepEqual(decodeSoccerStatKey(1004), { key: "1004", participant: 2, metric: "YELLOW_CARDS", period: "H1" });
assert.deepEqual(decodeSoccerStatKey("7008"), { key: "7008", participant: 2, metric: "CORNERS", period: "ET_TOTAL" });
assert.equal(decodeSoccerStatKey("9001"), null, "unknown period prefixes fail closed");
assert.equal(readSoccerStat({ "1": 3, "1001": 1 }, 1, "GOALS"), 3);
assert.equal(decodeSoccerGamePhase(12), "PE");

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

const penaltyShootoutGoal = { ...payload.find((row: { Action: string }) => row.Action === "goal"), StatusId: 12 };
assert.equal(normalizeSoccerScoreAction(penaltyShootoutGoal, lineup), null, "penalty-shootout goals never enter the fantasy ledger");

const historical = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18175981.json", "utf8")).payload;
const historicalLineup = parseLineupAction(historical.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const events = normalizeSoccerHistoricalActions(historical, historicalLineup);
assert.ok(events.some((event) => event.kind === "MATCH_STARTED"));
assert.equal(events.filter((event) => event.kind === "GOAL").length, 3);
assert.equal(events.filter((event) => event.kind === "SUBSTITUTION").length, 10, "captured substitution amendments replace incomplete prior revisions");
const historicalFinal = events.find((event) => event.kind === "MATCH_FINALIZED");
assert.ok(historicalFinal && historicalFinal.elapsedSec >= 5400, "finalization keeps the observed match clock");

const cardHistory = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18222446.json", "utf8")).payload;
const cardLineup = parseLineupAction(cardHistory.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const yellowRaw = cardHistory.find((row: { Action: string; Id: number; Seq: number }) => row.Action === "yellow_card" && row.Id === 608 && row.Seq === 678);
const yellow = normalizeSoccerScoreAction(yellowRaw, cardLineup);
assert.deepEqual(yellow && { kind: yellow.kind, card: yellow.kind === "CARD" ? yellow.card : null }, { kind: "CARD", card: "YELLOW" }, "captured yellow card resolves its player");
assert.ok(yellow?.kind === "CARD" && cardLineup.some((player) => player.fixturePlayerId === yellow.playerId));
if (yellow?.kind === "CARD") {
  const player = { fixturePlayerId: yellow.playerId, participantId: yellow.participantId, preferredName: "Card recipient", position: "MID" as const, eligible: true, starter: true };
  const team = [{ entryId: "entry", playerIds: [yellow.playerId], captainId: "other", viceCaptainId: "other" }];
  const capabilities = { YELLOW_CARD: "VERIFIED" as const, DIRECT_RED_CARD: "VERIFIED" as const, SECOND_YELLOW_ADJUSTMENT: "VERIFIED" as const };
  const once = projectEvent(initialFixtureScoreState(), yellow, [player], team, capabilities);
  const duplicate = projectEvent(once, yellow, [player], team, capabilities);
  assert.equal(entryTotal(duplicate.rows), -1, "same confirmed card revision is a no-op on retry");
  const discardedRaw = cardHistory.find((row: { Action: string; Id: number }) => row.Action === "action_discarded" && row.Id === 608);
  const discarded = normalizeSoccerScoreAction(discardedRaw, cardLineup);
  assert.equal(discarded?.kind, "ACTION_REPLACED", "official card discard is normalized as a correction");
  const corrected = discarded ? projectEvent(duplicate, discarded, [player], team, capabilities) : duplicate;
  assert.equal(entryTotal(corrected.rows), 0, "discard correction reverses the yellow-card deduction");
  if (discarded) assert.equal(entryTotal(fullReplay([yellow, discarded], [player], team, capabilities).rows), entryTotal(corrected.rows), "card correction full replay equals incremental projection");

  const firstYellowRaw = cardHistory.find((row: { Action: string; Id: number; Seq: number }) => row.Action === "yellow_card" && row.Id === 351 && row.Seq === 388);
  const secondYellowRaw = cardHistory.find((row: { Action: string; Id: number; Seq: number }) => row.Action === "red_card" && row.Id === 613 && row.Seq === 688);
  const firstYellow = normalizeSoccerScoreAction(firstYellowRaw, cardLineup);
  const secondYellow = normalizeSoccerScoreAction(secondYellowRaw, cardLineup);
  assert.deepEqual(secondYellow && { kind: secondYellow.kind, card: secondYellow.kind === "CARD" ? secondYellow.card : null }, { kind: "CARD", card: "SECOND_YELLOW" });
  if (firstYellow?.kind === "CARD" && secondYellow?.kind === "CARD") {
    const secondYellowPlayer = { fixturePlayerId: firstYellow.playerId, participantId: firstYellow.participantId, preferredName: "Second yellow recipient", position: "MID" as const, eligible: true, starter: true };
    const secondYellowTeam = [{ entryId: "entry", playerIds: [firstYellow.playerId], captainId: "other", viceCaptainId: "other" }];
    const afterYellow = projectEvent(initialFixtureScoreState(), firstYellow, [secondYellowPlayer], secondYellowTeam, capabilities);
    const afterSecondYellow = projectEvent(afterYellow, secondYellow, [secondYellowPlayer], secondYellowTeam, capabilities);
    assert.equal(entryTotal(afterSecondYellow.rows), -3, "yellow plus second-yellow adjustment totals -3");
  }
}

const penaltyHistory = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18188721.json", "utf8")).payload;
const penaltyLineup = parseLineupAction(penaltyHistory.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const penaltyRaw = penaltyHistory.find((row: { Action: string; Id: number; Seq: number }) => row.Action === "penalty_outcome" && row.Id === 609 && row.Seq === 693);
const penalty = normalizeSoccerScoreAction(penaltyRaw, penaltyLineup);
assert.deepEqual(penalty && { kind: penalty.kind, outcome: penalty.kind === "PENALTY_ATTEMPT" ? penalty.outcome : null, period: penalty.kind === "PENALTY_ATTEMPT" ? penalty.period : null }, { kind: "PENALTY_ATTEMPT", outcome: "SCORED", period: "H2" }, "captured regulation penalty goal resolves its taker");
if (penalty?.kind === "PENALTY_ATTEMPT") {
  const player = { fixturePlayerId: penalty.playerId, participantId: penalty.participantId, preferredName: "Penalty taker", position: "MID" as const, eligible: true, starter: true };
  const state = projectEvent(initialFixtureScoreState(), penalty, [player], [{ entryId: "entry", playerIds: [penalty.playerId], captainId: "other", viceCaptainId: "other" }], { PENALTY_GOAL: "VERIFIED" });
  assert.equal(entryTotal(state.rows), 5, "verified regulation penalty goal uses position scoring");
}

const redHistory = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18172379.json", "utf8")).payload;
const redLineup = parseLineupAction(redHistory.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const redRaw = redHistory.find((row: { Action: string; Id: number; Seq: number }) => row.Action === "red_card" && row.Id === 614 && row.Seq === 700);
const red = normalizeSoccerScoreAction(redRaw, redLineup);
assert.deepEqual(red && { kind: red.kind, card: red.kind === "CARD" ? red.card : null }, { kind: "CARD", card: "DIRECT_RED" }, "captured straight red resolves its recipient");
if (red?.kind === "CARD") {
  const player = { fixturePlayerId: red.playerId, participantId: red.participantId, preferredName: "Red-card recipient", position: "MID" as const, eligible: true, starter: true };
  const state = projectEvent(initialFixtureScoreState(), red, [player], [{ entryId: "entry", playerIds: [red.playerId], captainId: "other", viceCaptainId: "other" }], { DIRECT_RED_CARD: "VERIFIED" });
  assert.equal(entryTotal(state.rows), -3, "verified straight red deducts three points");
}

const ownGoalHistory = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18175918.json", "utf8")).payload;
const ownGoalLineup = parseLineupAction(ownGoalHistory.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const ownGoalAmendmentIndex = ownGoalHistory.findIndex((row: { Action: string; Data?: { Action?: string; New?: { GoalType?: string } } }) => row.Action === "action_amend" && row.Data?.Action === "goal" && row.Data.New?.GoalType === "Own");
assert.ok(ownGoalAmendmentIndex > 0, "captured own-goal amendment exists");
const ownGoalAmendmentRaw = ownGoalHistory[ownGoalAmendmentIndex];
const ownGoal = normalizeSoccerScoreAction(ownGoalAmendmentRaw, ownGoalLineup, { priorActions: ownGoalHistory.slice(0, ownGoalAmendmentIndex) });
assert.deepEqual(ownGoal && { kind: ownGoal.kind, goalKind: ownGoal.kind === "GOAL" ? ownGoal.goalKind : null }, { kind: "GOAL", goalKind: "OWN_GOAL" }, "captured own-goal amendment resolves the replacement scorer");
if (ownGoal?.kind === "GOAL") {
  assert.ok(normalizeSoccerHistoricalActions(ownGoalHistory, ownGoalLineup).some((event) => event.kind === "GOAL" && event.goalKind === "OWN_GOAL"), "historical replay resolves the own-goal replacement");
}

const ownGoalCorrectionHistory = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-historical-18176123.json", "utf8")).payload;
const ownGoalCorrectionLineup = parseLineupAction(ownGoalCorrectionHistory.find((row: { Action: string; Confirmed?: boolean }) => row.Action === "lineups" && row.Confirmed));
const ownGoalCorrectionIndex = ownGoalCorrectionHistory.findIndex((row: { Action: string; Data?: { Action?: string; New?: { GoalType?: string; PlayerId?: number } } }) => row.Action === "action_amend" && row.Data?.Action === "goal" && row.Data.New?.GoalType === "Own" && row.Data.New?.PlayerId === 429899);
const ownGoalCorrectionRaw = ownGoalCorrectionHistory[ownGoalCorrectionIndex];
const amendedOwnGoal = normalizeSoccerScoreAction(ownGoalCorrectionRaw, ownGoalCorrectionLineup, { priorActions: ownGoalCorrectionHistory.slice(0, ownGoalCorrectionIndex) });
const originalOwnGoalRaw = ownGoalCorrectionHistory.find((row: { Action: string; Id: number; Seq: number }) => row.Action === "goal" && row.Id === 523 && row.Seq === 590);
const originalOwnGoal = normalizeSoccerScoreAction(originalOwnGoalRaw, ownGoalCorrectionLineup);
assert.equal(originalOwnGoal?.kind, "GOAL");
assert.deepEqual(amendedOwnGoal && { kind: amendedOwnGoal.kind, goalKind: amendedOwnGoal.kind === "GOAL" ? amendedOwnGoal.goalKind : null }, { kind: "GOAL", goalKind: "OWN_GOAL" });
if (originalOwnGoal?.kind === "GOAL" && amendedOwnGoal?.kind === "GOAL") {
  assert.equal(amendedOwnGoal.eventKey, originalOwnGoal.eventKey, "own-goal amendment reuses the superseded action identity");
  const player = { fixturePlayerId: originalOwnGoal.scorerId, participantId: ownGoalCorrectionLineup.find((candidate) => candidate.fixturePlayerId === originalOwnGoal.scorerId)!.participantId, preferredName: "Own-goal scorer", position: "MID" as const, eligible: true, starter: true };
  const team = [{ entryId: "entry", playerIds: [player.fixturePlayerId], captainId: "other", viceCaptainId: "other" }];
  const capabilities = { OWN_GOAL: "VERIFIED" as const };
  const incremental = projectEvent(projectEvent(initialFixtureScoreState(), originalOwnGoal, [player], team, capabilities), amendedOwnGoal, [player], team, capabilities);
  assert.equal(entryTotal(incremental.rows), -2, "own-goal amendment reverses and replaces its ledger row");
  assert.equal(entryTotal(fullReplay([originalOwnGoal, amendedOwnGoal], [player], team, capabilities).rows), entryTotal(incremental.rows), "own-goal full replay equals incremental correction");
}
