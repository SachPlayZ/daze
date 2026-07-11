import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount, getAssociatedTokenAddressSync, getMint, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const authority = new PublicKey(process.env.FANTASY_AUTHORITY ?? "");
const mint = new PublicKey(process.env.FANTASY_TEST_MINT ?? "");
const recipient = new PublicKey(process.env.FANTASY_TOKEN_RECIPIENT ?? authority);
const amount = BigInt(process.env.FANTASY_TOKEN_AMOUNT ?? "1000");
const send = process.argv.includes("--send");
if (amount <= 0n) throw new Error("FANTASY_TOKEN_AMOUNT must be positive.");

const connection = new Connection(rpcUrl, "confirmed");
const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
if (mintInfo.decimals !== 0 || !mintInfo.mintAuthority?.equals(authority) || mintInfo.freezeAuthority !== null) throw new Error("Mint does not match the valueless Token-2022 policy.");
const recipientAta = getAssociatedTokenAddressSync(mint, recipient, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const instructions = [];
if (!await connection.getAccountInfo(recipientAta, "confirmed")) instructions.push(createAssociatedTokenAccountInstruction(authority, recipientAta, recipient, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
instructions.push(createMintToInstruction(mint, recipientAta, authority, amount, [], TOKEN_2022_PROGRAM_ID));
const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ feePayer: authority, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(...instructions);
const simulation = await connection.simulateTransaction(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
if (simulation.value.err) throw new Error(`Token allocation simulation failed: ${JSON.stringify(simulation.value.err)}`);
const details = { cluster: "devnet", mint: mint.toBase58(), tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(), recipient: recipient.toBase58(), recipientAta: recipientAta.toBase58(), amount: amount.toString(), createsAta: instructions.length === 2 };
if (!send) {
  console.log(JSON.stringify({ mode: "simulation", ...details, simulationError: null, logs: simulation.value.logs }, null, 2));
  process.exit(0);
}
const keypairPath = process.env.SOLANA_KEYPAIR_PATH ?? join(homedir(), ".config", "solana", "id.json");
const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keypairPath, "utf8"))));
if (!authorityKeypair.publicKey.equals(authority)) throw new Error("FANTASY_AUTHORITY does not match the configured signing keypair.");
const signature = await sendAndConfirmTransaction(connection, transaction, [authorityKeypair], { commitment: "confirmed", preflightCommitment: "confirmed" });
const account = await getAccount(connection, recipientAta, "confirmed", TOKEN_2022_PROGRAM_ID);
if (!account.mint.equals(mint) || !account.owner.equals(recipient) || account.amount < amount) throw new Error("Token allocation verification failed.");
console.log(JSON.stringify({ mode: "sent", signature, ...details, balance: account.amount.toString() }, null, 2));
