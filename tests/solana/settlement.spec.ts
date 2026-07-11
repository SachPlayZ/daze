import assert from "node:assert/strict";
import { buildSettlementPayouts, settlementLeaf, verifySettlementProof } from "../../packages/solana-client/src";

const entry = (value: number) => Uint8Array.from({ length: 32 }, (_, index) => index === 31 ? value : 0);
const { root, payouts } = buildSettlementPayouts([{ entryPublicKey: entry(1), amount: 50n }, { entryPublicKey: entry(2), amount: 30n }, { entryPublicKey: entry(3), amount: 20n }]);
assert.equal(payouts.length, 3);
for (const payout of payouts) assert.equal(verifySettlementProof(settlementLeaf(payout.entryPublicKey, payout.amount), payout.proof, root), true);
assert.throws(() => buildSettlementPayouts([{ entryPublicKey: entry(1), amount: 1n }, { entryPublicKey: entry(1), amount: 2n }]));
