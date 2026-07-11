import assert from "node:assert/strict";
import { buildCreateContestInstruction, buildEnterContestInstruction, fixtureHash } from "../../frontend/lib/contest-transaction";

assert.equal(fixtureHash("18175981").length, 32);
assert.notDeepEqual(fixtureHash("18175981"), fixtureHash("18175982"));
const built = buildEnterContestInstruction({ programId: "CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk", mint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG", wallet: "BHh9PezkfE7FZ24nDjvYnc2vdz8adXEDeBTbTH1fRPya", fixtureId: "18175981", stakeTier: BigInt(1), teamHash: "0".repeat(64), rpcUrl: "https://api.devnet.solana.com" });
assert.equal(built.instruction.keys.length, 9);
assert.equal(built.instruction.data.length, 40);
assert.equal(built.instruction.keys[0].isSigner, true);

const created = buildCreateContestInstruction({ programId: "CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk", mint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG", authority: "BHh9PezkfE7FZ24nDjvYnc2vdz8adXEDeBTbTH1fRPya", fixtureId: "18175981", stakeTier: BigInt(1), stakeAmount: BigInt(100), lockTs: BigInt(2_000_000_000), rpcUrl: "https://api.devnet.solana.com" });
assert.equal(created.instruction.keys.length, 7);
assert.equal(created.instruction.keys[0].isSigner, true);
assert.equal(created.instruction.data.length, 64);
assert.equal(created.contest.toBase58(), built.contest.toBase58());
