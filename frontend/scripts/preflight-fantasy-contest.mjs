import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAccount, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const programId = new PublicKey(process.env.FANTASY_POOL_PROGRAM_ID ?? "CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk");
const authority = new PublicKey(process.env.FANTASY_AUTHORITY ?? "");
const mint = new PublicKey(process.env.FANTASY_TEST_MINT ?? "");
const tokenProgram = new PublicKey(process.env.FANTASY_TOKEN_PROGRAM ?? TOKEN_2022_PROGRAM_ID);
const fixtureId = process.env.FANTASY_FIXTURE_ID ?? "18175981";
const stakeTier = BigInt(process.env.FANTASY_STAKE_TIER ?? "1");
const stakeAmount = BigInt(process.env.FANTASY_STAKE_AMOUNT ?? "100");
const lockTs = BigInt(process.env.FANTASY_LOCK_TS ?? `${Math.floor(Date.now() / 1000) + 3600}`);
const send = process.argv.includes("--send");

const u64le = (value) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const i64le = (value) => { const bytes = Buffer.alloc(8); bytes.writeBigInt64LE(value); return bytes; };
const fixtureHash = createHash("sha256").update(fixtureId).digest();
const discriminator = createHash("sha256").update("global:create_contest").digest().subarray(0, 8);
const [contest] = PublicKey.findProgramAddressSync([Buffer.from("contest"), fixtureHash, u64le(stakeTier)], programId);
const vault = getAssociatedTokenAddressSync(mint, contest, true, tokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
const instruction = new TransactionInstruction({ programId, keys: [
  { pubkey: authority, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
  { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: tokenProgram, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
], data: Buffer.concat([discriminator, fixtureHash, u64le(stakeTier), u64le(stakeAmount), i64le(lockTs)]) });
const connection = new Connection(rpcUrl, "confirmed");
const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ feePayer: authority, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(instruction);
const simulation = await connection.simulateTransaction(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
if (simulation.value.err) throw new Error(`Contest simulation failed: ${JSON.stringify(simulation.value.err)}`);
const details = { cluster: "devnet", programId: programId.toBase58(), mint: mint.toBase58(), tokenProgram: tokenProgram.toBase58(), fixtureId, contest: contest.toBase58(), vault: vault.toBase58(), stakeTier: stakeTier.toString(), stakeAmount: stakeAmount.toString(), lockTs: lockTs.toString() };
if (!send) {
  console.log(JSON.stringify({ mode: "simulation", ...details, simulationError: null, logs: simulation.value.logs }, null, 2));
  process.exit(0);
}
const keypairPath = process.env.SOLANA_KEYPAIR_PATH ?? join(homedir(), ".config", "solana", "id.json");
const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keypairPath, "utf8"))));
if (!authorityKeypair.publicKey.equals(authority)) throw new Error("FANTASY_AUTHORITY does not match the configured signing keypair.");
const signature = await sendAndConfirmTransaction(connection, transaction, [authorityKeypair], { commitment: "confirmed", preflightCommitment: "confirmed" });
const contestAccount = await connection.getAccountInfo(contest, "confirmed");
const vaultAccount = await getAccount(connection, vault, "confirmed", TOKEN_2022_PROGRAM_ID);
if (!contestAccount?.owner.equals(programId) || contestAccount.data.length !== 8 + 187 || !vaultAccount.mint.equals(mint) || !vaultAccount.owner.equals(contest)) throw new Error("Confirmed contest accounts did not match the expected program-owned vault layout.");
console.log(JSON.stringify({ mode: "sent", signature, ...details, contestDataLength: contestAccount.data.length, vaultAmount: vaultAccount.amount.toString() }, null, 2));
