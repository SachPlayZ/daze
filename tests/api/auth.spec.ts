import assert from "node:assert/strict";
import { challengeMessage, issueChallenge, verifyChallenge } from "../../apps/api/src/auth";
const challenges = new Map<string, any>();
const store = { save: async (challenge: any) => { challenges.set(challenge.nonce, challenge); }, consume: async (nonce: string, wallet: string) => { const challenge = challenges.get(nonce); challenges.delete(nonce); return challenge?.wallet === wallet ? challenge : null; } };
async function run() { const challenge = await issueChallenge("wallet", "daze.example", store, new Date("2026-01-01T00:00:00Z")); assert.match(challengeMessage(challenge), /Nonce:/); assert.equal(await verifyChallenge({ nonce: challenge.nonce, wallet: "wallet", signature: new Uint8Array() }, store, async () => true, new Date("2026-01-01T00:05:00Z")), true); assert.equal(await verifyChallenge({ nonce: challenge.nonce, wallet: "wallet", signature: new Uint8Array() }, store, async () => true), false, "challenge is single use"); }
void run();

