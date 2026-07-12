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
const contest = new PublicKey(process.env.FANTASY_CONTEST ?? "");
const payoutsInput = process.env.FANTASY_PAYOUTS ?? "";
const send = process.argv.includes("--send");
const u64le = (value) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const hash = (...parts) => { const digest = createHash("sha256"); parts.forEach((part) => digest.update(part)); return digest.digest(); };
const compare = (left, right) => Buffer.compare(left, right);
const pair = (left, right) => compare(left, right) <= 0 ? hash(left, right) : hash(right, left);
const payouts = payoutsInput.split(",").filter(Boolean).map((item) => { const [address, amount] = item.split(":"); const entry = new PublicKey(address); const value = BigInt(amount); if (value <= 0n) throw new Error("Settlement payouts must be positive."); return { entry, amount: value, leaf: hash(entry.toBuffer(), u64le(value)), proof: [] }; });
if (payouts.length !== 3) throw new Error("Provide exactly three entry:amount payouts.");
if (new Set(payouts.map((payout) => payout.entry.toBase58())).size !== payouts.length) throw new Error("Settlement entry must be unique.");
let level = payouts.map((_, index) => ({ hash: payouts[index].leaf, members: [index] }));
while (level.length > 1) {
  const next = [];
  for (let index = 0; index < level.length; index += 2) {
    const left = level[index]; const right = level[index + 1];
    if (!right) { next.push(left); continue; }
    left.members.forEach((member) => payouts[member].proof.push(right.hash));
    right.members.forEach((member) => payouts[member].proof.push(left.hash));
    next.push({ hash: pair(left.hash, right.hash), members: [...left.members, ...right.members] });
  }
  level = next;
}
const root = level[0].hash;
const payoutTotal = payouts.reduce((total, payout) => total + payout.amount, 0n);
const [settlement] = PublicKey.findProgramAddressSync([Buffer.from("settlement"), contest.toBuffer()], programId);
const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const discriminator = hash(Buffer.from("global:publish_settlement")).subarray(0, 8);
const instruction = new TransactionInstruction({ programId, keys: [
  { pubkey: authority, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
  { pubkey: settlement, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
], data: Buffer.concat([discriminator, root, u64le(payoutTotal)]) });
const connection = new Connection(rpcUrl, "confirmed");
const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ feePayer: authority, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(instruction);
const simulation = await connection.simulateTransaction(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
if (simulation.value.err) throw new Error(`Settlement simulation failed: ${JSON.stringify(simulation.value.err)}\n${(simulation.value.logs ?? []).join("\n")}`);
const payoutProofs = payouts.map((payout) => ({ entry: payout.entry.toBase58(), amount: payout.amount.toString(), proofHex: payout.proof.map((node) => node.toString("hex")) }));
const details = { cluster: "devnet", programId: programId.toBase58(), contest: contest.toBase58(), mint: mint.toBase58(), vault: vault.toBase58(), settlement: settlement.toBase58(), root: root.toString("hex"), payoutTotal: payoutTotal.toString(), payouts: payoutProofs };
if (!send) {
  console.log(JSON.stringify({ mode: "simulation", ...details, simulationError: null, logs: simulation.value.logs }, null, 2));
  process.exit(0);
}
const keypairPath = process.env.SOLANA_KEYPAIR_PATH ?? join(homedir(), ".config", "solana", "id.json");
const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keypairPath, "utf8"))));
if (!authorityKeypair.publicKey.equals(authority)) throw new Error("FANTASY_AUTHORITY does not match the configured signing keypair.");
const signature = await sendAndConfirmTransaction(connection, transaction, [authorityKeypair], { commitment: "confirmed", preflightCommitment: "confirmed" });
const settlementAccount = await connection.getAccountInfo(settlement, "confirmed");
const vaultAccount = await getAccount(connection, vault, "confirmed", TOKEN_2022_PROGRAM_ID);
if (!settlementAccount?.owner.equals(programId) || settlementAccount.data.length !== 8 + 89 || vaultAccount.amount < payoutTotal) throw new Error("Settlement verification failed.");
console.log(JSON.stringify({ mode: "sent", signature, ...details, settlementDataLength: settlementAccount.data.length, vaultBalance: vaultAccount.amount.toString() }, null, 2));
