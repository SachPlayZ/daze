import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAccount, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const programId = new PublicKey(process.env.FANTASY_POOL_PROGRAM_ID ?? "CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk");
const wallet = new PublicKey(process.env.FANTASY_WALLET ?? "");
const mint = new PublicKey(process.env.FANTASY_TEST_MINT ?? "");
const contest = new PublicKey(process.env.FANTASY_CONTEST ?? "");
const entry = new PublicKey(process.env.FANTASY_ENTRY ?? "");
const amount = BigInt(process.env.FANTASY_AMOUNT ?? "0");
const proof = (process.env.FANTASY_PROOF ?? "").split(",").filter(Boolean).map((node) => { if (!/^[0-9a-f]{64}$/i.test(node)) throw new Error("Proof node must be 32-byte hex."); return Buffer.from(node, "hex"); });
const send = process.argv.includes("--send");
if (amount <= 0n) throw new Error("FANTASY_AMOUNT must be positive.");
const [settlement] = PublicKey.findProgramAddressSync([Buffer.from("settlement"), contest.toBuffer()], programId);
const walletToken = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const u64le = (value) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const discriminator = createHash("sha256").update("global:claim_prize").digest().subarray(0, 8);
const length = Buffer.alloc(4); length.writeUInt32LE(proof.length);
const instruction = new TransactionInstruction({ programId, keys: [
  { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: walletToken, isSigner: false, isWritable: true },
  { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: entry, isSigner: false, isWritable: true }, { pubkey: settlement, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
], data: Buffer.concat([discriminator, u64le(amount), length, ...proof]) });
const connection = new Connection(rpcUrl, "confirmed");
const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ feePayer: wallet, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(instruction);
const simulation = await connection.simulateTransaction(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
if (simulation.value.err) throw new Error(`Claim simulation failed: ${JSON.stringify(simulation.value.err)}`);
const details = { cluster: "devnet", programId: programId.toBase58(), contest: contest.toBase58(), settlement: settlement.toBase58(), entry: entry.toBase58(), wallet: wallet.toBase58(), mint: mint.toBase58(), vault: vault.toBase58(), walletToken: walletToken.toBase58(), amount: amount.toString(), proofNodes: proof.length };
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
if (afterWallet.amount - beforeWallet.amount !== amount || beforeVault.amount - afterVault.amount !== amount) throw new Error("Claim balance verification failed.");
console.log(JSON.stringify({ mode: "sent", signature, ...details, walletBalance: afterWallet.amount.toString(), vaultBalance: afterVault.amount.toString() }, null, 2));
