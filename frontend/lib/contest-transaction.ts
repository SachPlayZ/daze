import { createHash } from "node:crypto";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

export type EnterContestInput = { programId: string; mint: string; wallet: string; fixtureId: string; stakeTier: bigint; teamHash: string; rpcUrl: string };
export type BuiltEnterContest = { instruction: TransactionInstruction; contest: PublicKey; vault: PublicKey; entry: PublicKey; walletToken: PublicKey; wallet: PublicKey };
export type PreparedEnterContest = BuiltEnterContest & { transaction: Transaction; lastValidBlockHeight: number };
export type CreateContestInput = { programId: string; mint: string; authority: string; fixtureId: string; stakeTier: bigint; stakeAmount: bigint; lockTs: bigint; rpcUrl: string };
export type BuiltCreateContest = { instruction: TransactionInstruction; contest: PublicKey; vault: PublicKey; authority: PublicKey };
export type PreparedCreateContest = BuiltCreateContest & { transaction: Transaction; lastValidBlockHeight: number };
export type PublishSettlementInput = { programId: string; mint: string; authority: string; contest: string; root: Uint8Array; payoutTotal: bigint; rpcUrl: string };
export type BuiltPublishSettlement = { instruction: TransactionInstruction; contest: PublicKey; vault: PublicKey; settlement: PublicKey; authority: PublicKey };
export type PreparedPublishSettlement = BuiltPublishSettlement & { transaction: Transaction; lastValidBlockHeight: number };

const u64le = (value: bigint) => { if (value < BigInt(0) || value > BigInt("18446744073709551615")) throw new Error("Stake tier is invalid."); const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const i64le = (value: bigint) => { if (value < BigInt("-9223372036854775808") || value > BigInt("9223372036854775807")) throw new Error("Lock timestamp is invalid."); const bytes = Buffer.alloc(8); bytes.writeBigInt64LE(value); return bytes; };
const teamHashBytes = (value: string) => { if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("Team hash must be a 32-byte hex digest."); return Buffer.from(value, "hex"); };
const discriminator = (method: string) => createHash("sha256").update(`global:${method}`).digest().subarray(0, 8);
export const fixtureHash = (fixtureId: string) => createHash("sha256").update(fixtureId).digest();

/** Builds, but never signs or sends, the exact Anchor enter_contest instruction. */
export function buildEnterContestInstruction(input: EnterContestInput): BuiltEnterContest {
  const programId = new PublicKey(input.programId); const mint = new PublicKey(input.mint); const wallet = new PublicKey(input.wallet);
  const fixture = fixtureHash(input.fixtureId); const tier = u64le(input.stakeTier);
  const [contest] = PublicKey.findProgramAddressSync([Buffer.from("contest"), fixture, tier], programId);
  const [entry] = PublicKey.findProgramAddressSync([Buffer.from("entry"), contest.toBuffer(), wallet.toBuffer()], programId);
  const walletToken = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const instruction = new TransactionInstruction({ programId, keys: [
    { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: walletToken, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: entry, isSigner: false, isWritable: true },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], data: Buffer.concat([discriminator("enter_contest"), teamHashBytes(input.teamHash)]) });
  return { instruction, contest, vault, entry, walletToken, wallet };
}
export async function prepareEnterContest(input: EnterContestInput): Promise<PreparedEnterContest> {
  const built = buildEnterContestInstruction(input);
  const connection = new Connection(input.rpcUrl, "confirmed"); const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: built.wallet, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(built.instruction);
  return { ...built, transaction, lastValidBlockHeight: latest.lastValidBlockHeight };
}

/** Builds, but never signs or sends, the exact Anchor create_contest instruction. */
export function buildCreateContestInstruction(input: CreateContestInput): BuiltCreateContest {
  if (input.stakeAmount <= BigInt(0)) throw new Error("Stake amount must be positive.");
  const programId = new PublicKey(input.programId); const mint = new PublicKey(input.mint); const authority = new PublicKey(input.authority);
  const fixture = fixtureHash(input.fixtureId); const tier = u64le(input.stakeTier);
  const [contest] = PublicKey.findProgramAddressSync([Buffer.from("contest"), fixture, tier], programId);
  const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const instruction = new TransactionInstruction({ programId, keys: [
    { pubkey: authority, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], data: Buffer.concat([discriminator("create_contest"), fixture, tier, u64le(input.stakeAmount), i64le(input.lockTs)]) });
  return { instruction, contest, vault, authority };
}

export async function prepareCreateContest(input: CreateContestInput): Promise<PreparedCreateContest> {
  const built = buildCreateContestInstruction(input);
  const connection = new Connection(input.rpcUrl, "confirmed"); const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: built.authority, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(built.instruction);
  return { ...built, transaction, lastValidBlockHeight: latest.lastValidBlockHeight };
}

/** Builds, but never signs or sends, the exact Anchor publish_settlement instruction. */
export function buildPublishSettlementInstruction(input: PublishSettlementInput): BuiltPublishSettlement {
  if (input.root.length !== 32) throw new Error("Settlement root must be 32 bytes.");
  if (input.payoutTotal <= BigInt(0)) throw new Error("Payout total must be positive.");
  const programId = new PublicKey(input.programId); const mint = new PublicKey(input.mint); const authority = new PublicKey(input.authority); const contest = new PublicKey(input.contest);
  const [settlement] = PublicKey.findProgramAddressSync([Buffer.from("settlement"), contest.toBuffer()], programId);
  const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const instruction = new TransactionInstruction({ programId, keys: [
    { pubkey: authority, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: settlement, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], data: Buffer.concat([discriminator("publish_settlement"), Buffer.from(input.root), u64le(input.payoutTotal)]) });
  return { instruction, contest, vault, settlement, authority };
}

export async function preparePublishSettlement(input: PublishSettlementInput): Promise<PreparedPublishSettlement> {
  const built = buildPublishSettlementInstruction(input);
  const connection = new Connection(input.rpcUrl, "confirmed"); const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: built.authority, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(built.instruction);
  return { ...built, transaction, lastValidBlockHeight: latest.lastValidBlockHeight };
}
