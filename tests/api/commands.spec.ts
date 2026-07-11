import assert from "node:assert/strict";
import { lockTeam } from "../../apps/api/src/commands";

const players = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"].map((position, index) => ({ fixturePlayerId: `p${index}`, participantId: index < 6 ? "a" : "b", preferredName: `Player ${index}`, position: position as "GK" | "DEF" | "MID" | "FWD", eligible: true }));
let stored: any = null;
const store = { transaction: async <T>(fn: () => Promise<T>) => fn(), findCommand: async () => null, findContest: async () => ({ contestId: "contest", lockAt: new Date("2026-07-01T12:00:00Z"), scoringVersion: "v1", positionMappingVersion: "capture-1", state: "TEAM_BUILDING_OPEN" as const }), fixturePlayers: async () => players, saveLockedTeam: async (value: any) => { stored = value; }, recordCommand: async () => undefined };
async function run() { const result = await lockTeam({ contestId: "contest", wallet: "wallet", idempotencyKey: "request", now: new Date("2026-07-01T11:00:00Z"), team: { formation: "4-3-3", playerIds: players.map((player) => player.fixturePlayerId), captainId: "p1", viceCaptainId: "p2" } }, store); assert.equal(result, stored); assert.match(result.canonicalTeamHash, /^[a-f0-9]{64}$/); }
void run();

