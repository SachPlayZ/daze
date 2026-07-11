import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInitializeMintInstruction, getMint, MINT_SIZE, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const authority = process.env.FANTASY_AUTHORITY;
if (!authority) throw new Error("Set FANTASY_AUTHORITY to the public authority wallet address.");
const send = process.argv.includes("--send");

const connection = new Connection(rpcUrl, "confirmed");
const payer = new PublicKey(authority);
const mint = Keypair.generate();
const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE, "confirmed");
const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ feePayer: payer, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(
  SystemProgram.createAccount({ fromPubkey: payer, newAccountPubkey: mint.publicKey, lamports: rent, space: MINT_SIZE, programId: TOKEN_2022_PROGRAM_ID }),
  createInitializeMintInstruction(mint.publicKey, 0, payer, null, TOKEN_2022_PROGRAM_ID),
);
const simulation = await connection.simulateTransaction(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
if (simulation.value.err) throw new Error(`Mint simulation failed: ${JSON.stringify(simulation.value.err)}`);
if (!send) {
  console.log(JSON.stringify({ mode: "simulation", cluster: "devnet", tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(), mintAddressPreview: mint.publicKey.toBase58(), decimals: 0, rentLamports: rent, requiredSigners: [payer.toBase58(), mint.publicKey.toBase58()], simulationError: null, logs: simulation.value.logs }, null, 2));
  process.exit(0);
}

const keypairPath = process.env.SOLANA_KEYPAIR_PATH ?? join(homedir(), ".config", "solana", "id.json");
const payerKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keypairPath, "utf8"))));
if (!payerKeypair.publicKey.equals(payer)) throw new Error("FANTASY_AUTHORITY does not match the configured signing keypair.");
const signature = await sendAndConfirmTransaction(connection, transaction, [payerKeypair, mint], { commitment: "confirmed", preflightCommitment: "confirmed" });
const created = await getMint(connection, mint.publicKey, "confirmed", TOKEN_2022_PROGRAM_ID);
if (created.decimals !== 0 || !created.mintAuthority?.equals(payer) || created.freezeAuthority !== null) throw new Error("Created mint did not match the valueless Token-2022 policy.");
console.log(JSON.stringify({ mode: "sent", cluster: "devnet", signature, mint: mint.publicKey.toBase58(), tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(), decimals: created.decimals, mintAuthority: created.mintAuthority.toBase58(), freezeAuthority: null, rentLamports: rent }, null, 2));
