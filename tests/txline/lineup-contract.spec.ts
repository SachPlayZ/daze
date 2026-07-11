import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLineupAction, resolveSoccerActionPlayer } from "../../packages/txline-client/src/lineup";

const snapshot = JSON.parse(readFileSync("tests/provider-fixtures/txline-devnet/scores-snapshot-18175981.json", "utf8")).payload;
const lineup = parseLineupAction(snapshot.find((row: { Action: string }) => row.Action === "lineups"));
assert.equal(lineup.length, 52);
assert.equal(new Set(lineup.map((player) => player.participantId)).size, 2);
assert.equal(lineup.filter((player) => player.starter).length, 22);
for (const row of snapshot.filter((entry: { Action: string }) => ["goal", "injury", "substitution"].includes(entry.Action))) {
  for (const key of ["PlayerId", "PlayerInId", "PlayerOutId"]) if (row.Data?.[key] !== undefined) assert.ok(resolveSoccerActionPlayer(row.Data[key], lineup), `${row.Action}.${key} resolves through normativeId`);
}
