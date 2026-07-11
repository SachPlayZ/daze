import assert from "node:assert/strict";
import { entryTotal } from "../../packages/scoring/src/index";
import { fullReplay, projectEvent } from "../../packages/scoring/src/projector";

const players = [{ fixturePlayerId: "mid", participantId: "a", preferredName: "Mid", position: "MID" as const, eligible: true, starter: true }];
const teams = [{ entryId: "entry", playerIds: ["mid"], captainId: "mid", viceCaptainId: "other" }];
const capabilities = { STARTING_APPEARANCE: "VERIFIED" as const, GOAL: "VERIFIED" as const, APPEARANCE_60_REACHED: "VERIFIED" as const, CLEAN_SHEET: "VERIFIED" as const };
const state = fullReplay([
  { kind: "MATCH_STARTED", eventKey: "start", elapsedSec: 0, revision: 1 },
  { kind: "GOAL", eventKey: "goal", elapsedSec: 120, scorerId: "mid", participantId: "a", goalKind: "OPEN_PLAY", period: "1H", revision: 1 },
  { kind: "MATCH_FINALIZED", eventKey: "final", elapsedSec: 5400, participant1Goals: 1, participant2Goals: 0, revision: 1 },
], players, teams, capabilities);
assert.equal(entryTotal(state.rows), 16, "captain doubles appearance, goal, 60-minute, and clean-sheet points");
assert.equal(state.rows.length, 4);
const corrected = projectEvent(state, { kind: "GOAL", eventKey: "goal", elapsedSec: 120, scorerId: "mid", participantId: "a", goalKind: "OPEN_PLAY", period: "1H", revision: 2 }, players, teams, capabilities);
assert.equal(entryTotal(corrected.rows), 16, "amended event reverses old ledger effects before replacement");
assert.equal(corrected.rows.filter((row) => row.reversalOf).length, 1, "correction appends an auditable compensating row");
