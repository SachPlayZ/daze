import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAccount, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const programId = new PublicKey(process.env.FANTASY_POOL_PROGRAM_ID ?? "CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk");
const mint = new PublicKey(process.env.FANTASY_TEST_MINT ?? "");
const wallet = new PublicKey(process.env.FANTASY_WALLET ?? process.env.FANTASY_AUTHORITY ?? "");
const fixtureId = process.env.FANTASY_FIXTURE_ID ?? "18175981";
const stakeTier = BigInt(process.env.FANTASY_STAKE_TIER ?? "2");
const teamHash = process.env.FANTASY_TEAM_HASH ?? "";
const send = process.argv.includes("--send");
if (!/^[0-9a-f]{64}$/i.test(teamHash)) throw new Error("FANTASY_TEAM_HASH must be a 32-byte hex hash.");

const u64le = (value) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const fixtureHash = createHash("sha256").update(fixtureId).digest();
const [contest] = PublicKey.findProgramAddressSync([Buffer.from("contest"), fixtureHash, u64le(stakeTier)], programId);
const [entry] = PublicKey.findProgramAddressSync([Buffer.from("entry"), contest.toBuffer(), wallet.toBuffer()], programId);
const walletToken = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const discriminator = createHash("sha256").update("global:enter_contest").digest().subarray(0, 8);
const instruction = new TransactionInstruction({ programId, keys: [
  { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
  { pubkey: walletToken, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: entry, isSigner: false, isWritable: true },
  { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
], data: Buffer.concat([discriminator, Buffer.from(teamHash, "hex")]) });
const connection = new Connection(rpcUrl, "confirmed");
const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ feePayer: wallet, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(instruction);
const simulation = await connection.simulateTransaction(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
if (simulation.value.err) throw new Error(`Entry simulation failed: ${JSON.stringify(simulation.value.err)}`);
const details = { cluster: "devnet", programId: programId.toBase58(), fixtureId, stakeTier: stakeTier.toString(), contest: contest.toBase58(), mint: mint.toBase58(), wallet: wallet.toBase58(), walletToken: walletToken.toBase58(), vault: vault.toBase58(), entry: entry.toBase58(), teamHash };
if (!send) {
  console.log(JSON.stringify({ mode: "simulation", ...details, simulationError: null, logs: simulation.value.logs }, null, 2));
  process.exit(0);
}
const keypairPath = process.env.SOLANA_KEYPAIR_PATH ?? join(homedir(), ".config", "solana", "id.json");
const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keypairPath, "utf8"))));
if (!walletKeypair.publicKey.equals(wallet)) throw new Error("FANTASY_WALLET does not match the configured signing keypair.");
const beforeWallet = await getAccount(connection, walletToken, "confirmed", TOKEN_2022_PROGRAM_ID);
const beforeVault = await getAccount(connection, vault, "confirmed", TOKEN_2022_PROGRAM_ID);
const signature = await sendAndConfirmTransaction(connection, transaction, [walletKeypair], { commitment: "confirmed", preflightCommitment: "confirmed" });
const afterWallet = await getAccount(connection, walletToken, "confirmed", TOKEN_2022_PROGRAM_ID);
const afterVault = await getAccount(connection, vault, "confirmed", TOKEN_2022_PROGRAM_ID);
const entryAccount = await connection.getAccountInfo(entry, "confirmed");
if (!entryAccount?.owner.equals(programId) || entryAccount.data.length !== 8 + 99 || beforeWallet.amount - afterWallet.amount !== 100n || afterVault.amount - beforeVault.amount !== 100n) throw new Error("Confirmed entry did not preserve the exact fixed stake and entry layout.");
console.log(JSON.stringify({ mode: "sent", signature, ...details, walletBalance: afterWallet.amount.toString(), vaultBalance: afterVault.amount.toString(), entryDataLength: entryAccount.data.length }, null, 2));
