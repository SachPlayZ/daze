/** Browser and API transaction boundary. Program instructions are added only after Anchor IDL generation. */
export type EntryIntent = { contest: string; wallet: string; canonicalTeamHash: string; stakeAmount: bigint };
export function validateEntryIntent(intent: EntryIntent): void {
  if (!intent.contest || !intent.wallet || !intent.canonicalTeamHash || intent.stakeAmount <= 0n) throw new Error("Invalid contest entry intent.");
}

export { buildSettlementPayouts, decodeSolanaAddress, hashSettlementPair, settlementLeaf, verifySettlementProof, type MerklePayout, type SettlementLeaf } from "./settlement";
