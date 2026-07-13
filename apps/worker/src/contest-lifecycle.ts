import type { Pool } from "pg";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction, type RpcResponseAndContext, type SimulatedTransactionResponse } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { db } from "./db";
import { buildSettlementPayouts, decodeSolanaAddress, type SettlementLeaf } from "../../../packages/solana-client/src/settlement";
import { buildHistoricalReplayReadModel } from "../../api/src/historical-replay";

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

// IMPORTANT: every Solana object (Transaction, PublicKey, Connection, ...) used here is built with THIS
// package's own @solana/web3.js. Do not import instruction builders from frontend/lib/contest-transaction.ts —
// pnpm gives each workspace package its own physical copy of @solana/web3.js, so a Transaction built with one
// copy fails `instanceof` checks inside a Connection built with another, and simulate/send breaks with an
// opaque "Cannot read properties of undefined (reading 'numRequiredSignatures')". Confirmed by testing against
// real devnet during this feature's build — the account layouts below are copied from frontend/lib/contest-transaction.ts
// and the working preflight-fantasy-*.mjs scripts, not reinvented.

const u64le = (value: bigint) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes; };
const i64le = (value: bigint) => { const bytes = Buffer.alloc(8); bytes.writeBigInt64LE(value); return bytes; };
const discriminator = (method: string) => createHash("sha256").update(`global:${method}`).digest().subarray(0, 8);
const fixtureHash = (fixtureId: string) => createHash("sha256").update(fixtureId).digest();

type BuiltCreateContest = { instruction: TransactionInstruction; contest: PublicKey; vault: PublicKey; authority: PublicKey };
function buildCreateContestInstruction(input: { programId: string; mint: string; authority: string; fixtureId: string; stakeTier: bigint; stakeAmount: bigint; lockTs: bigint }): BuiltCreateContest {
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

type BuiltPublishSettlement = { instruction: TransactionInstruction; contest: PublicKey; vault: PublicKey; settlement: PublicKey; authority: PublicKey };
function buildPublishSettlementInstruction(input: { programId: string; mint: string; authority: string; contest: string; root: Uint8Array; payoutTotal: bigint }): BuiltPublishSettlement {
  const programId = new PublicKey(input.programId); const mint = new PublicKey(input.mint); const authority = new PublicKey(input.authority); const contest = new PublicKey(input.contest);
  const [settlement] = PublicKey.findProgramAddressSync([Buffer.from("settlement"), contest.toBuffer()], programId);
  const vault = getAssociatedTokenAddressSync(mint, contest, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const instruction = new TransactionInstruction({ programId, keys: [
    { pubkey: authority, isSigner: true, isWritable: true }, { pubkey: contest, isSigner: false, isWritable: true }, { pubkey: vault, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: settlement, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], data: Buffer.concat([discriminator("publish_settlement"), Buffer.from(input.root), u64le(input.payoutTotal)]) });
  return { instruction, contest, vault, settlement, authority };
}

async function buildTransaction(connection: Connection, feePayer: PublicKey, instruction: TransactionInstruction): Promise<Transaction> {
  const latest = await connection.getLatestBlockhash("confirmed");
  return new Transaction({ feePayer, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(instruction);
}

/** Same call shape as the proven preflight-fantasy-contest.mjs / preflight-fantasy-settlement.mjs scripts.
 * @solana/web3.js's legacy-Transaction simulate overload is typed as (tx, signers?, includeAccounts?), but the
 * runtime accepts a simulate-config object here too — cast narrowly instead of changing the proven call shape. */
function simulateLegacyTransaction(connection: Connection, transaction: Transaction): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  const simulate = connection.simulateTransaction.bind(connection) as unknown as (tx: Transaction, signers: undefined, config: { sigVerify: boolean; replaceRecentBlockhash: boolean; commitment: string }) => Promise<RpcResponseAndContext<SimulatedTransactionResponse>>;
  return simulate(transaction, undefined, { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
}

/** Kill switch: every exported function here is a true no-op unless this is exactly "true". */
function autoLifecycleEnabled(): boolean {
  return process.env.FANTASY_AUTO_LIFECYCLE_ENABLED === "true";
}

type ChainConfig = { rpcUrl: string; programId: string; authority: string; mint: string; stakeTier: bigint; stakeAmount: bigint };

/** Same env vars as the manual preflight-fantasy-contest.mjs / preflight-fantasy-settlement.mjs scripts, no new naming invented. */
function loadChainConfig(): ChainConfig | null {
  const programId = process.env.FANTASY_POOL_PROGRAM_ID;
  const authority = process.env.FANTASY_AUTHORITY;
  const mint = process.env.FANTASY_TEST_MINT;
  if (!programId || !authority || !mint) { log("contest-lifecycle: FANTASY_POOL_PROGRAM_ID / FANTASY_AUTHORITY / FANTASY_TEST_MINT not configured; skipping."); return null; }
  return {
    rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    programId, authority, mint,
    stakeTier: BigInt(process.env.FANTASY_STAKE_TIER ?? "1"),
    stakeAmount: BigInt(process.env.FANTASY_STAKE_AMOUNT ?? "100"),
  };
}

/** Same keypair-file convention as both preflight scripts — a file the worker host must have, not a new secret-encoding scheme. */
async function loadAuthorityKeypair(): Promise<Keypair> {
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH ?? join(homedir(), ".config", "solana", "id.json");
  const raw = JSON.parse(await readFile(keypairPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/** In-memory cache so the SSE consumer can resolve fixtureId -> contestId per message without a DB round trip. */
const fixtureToContest = new Map<string, string>();
export function getContestIdForFixture(fixtureId: string): string | undefined { return fixtureToContest.get(fixtureId); }
export async function refreshContestCache(): Promise<void> {
  const rows = await db().query<{ fixture_id: string; id: string }>("select fixture_id, id from contests where status in ('CREATED', 'LOCKED')");
  fixtureToContest.clear();
  for (const row of rows.rows) fixtureToContest.set(row.fixture_id, row.id);
}
export async function getActiveContests(): Promise<{ fixtureId: string; contestId: string }[]> {
  const rows = await db().query<{ fixture_id: string; id: string }>("select fixture_id, id from contests where status in ('CREATED', 'LOCKED')");
  return rows.rows.map((row) => ({ fixtureId: row.fixture_id, contestId: row.id }));
}

/** contest-auto-creator: opens a devnet contest for every fixture that doesn't have one yet, lock_ts = kickoff - 30min. See ADR 0012. */
export async function autoCreateContests(): Promise<void> {
  if (!autoLifecycleEnabled()) return;
  const config = loadChainConfig();
  if (!config) return;
  const pool = db();
  const eligible = await pool.query<{ fixture_id: string; kickoff_at: string; existing_id: string | null }>(
    `select f.id as fixture_id, f.kickoff_at, c.id as existing_id
     from fixtures f
     left join contests c on c.fixture_id = f.id and c.stake_tier = $1
     where f.kickoff_at > now() and f.kickoff_at < now() + interval '7 days'
     and (c.id is null or c.status = 'PENDING_CREATION')`,
    [config.stakeTier.toString()],
  );
  if (!eligible.rows.length) return;
  const connection = new Connection(config.rpcUrl, "confirmed");
  for (const row of eligible.rows) {
    try {
      const lockTs = BigInt(Math.floor(new Date(row.kickoff_at).getTime() / 1000) - 30 * 60);
      const built = buildCreateContestInstruction({ programId: config.programId, mint: config.mint, authority: config.authority, fixtureId: row.fixture_id, stakeTier: config.stakeTier, stakeAmount: config.stakeAmount, lockTs });
      const transaction = await buildTransaction(connection, built.authority, built.instruction);
      const simulation = await simulateLegacyTransaction(connection, transaction);
      if (simulation.value.err) { log(`contest-auto-creator: simulation failed for fixture ${row.fixture_id}:`, JSON.stringify(simulation.value.err)); continue; }
      const contestId = built.contest.toBase58();
      if (!row.existing_id) {
        await pool.query(
          `insert into contests (id, fixture_id, stake_tier, stake_amount, lock_ts, mint, status) values ($1, $2, $3, $4, $5, $6, 'PENDING_CREATION') on conflict (fixture_id, stake_tier) do nothing`,
          [contestId, row.fixture_id, config.stakeTier.toString(), config.stakeAmount.toString(), lockTs.toString(), config.mint],
        );
      }
      const authorityKeypair = await loadAuthorityKeypair();
      if (!authorityKeypair.publicKey.equals(built.authority)) { log(`contest-auto-creator: SOLANA_KEYPAIR_PATH keypair does not match FANTASY_AUTHORITY for fixture ${row.fixture_id}.`); continue; }
      const signature = await sendAndConfirmTransaction(connection, transaction, [authorityKeypair], { commitment: "confirmed", preflightCommitment: "confirmed" });
      const contestAccount = await connection.getAccountInfo(built.contest, "confirmed");
      const vaultAccount = await getAccount(connection, built.vault, "confirmed", TOKEN_2022_PROGRAM_ID);
      if (!contestAccount?.owner.equals(new PublicKey(config.programId)) || contestAccount.data.length !== 8 + 187 || !vaultAccount.mint.equals(new PublicKey(config.mint)) || !vaultAccount.owner.equals(built.contest)) {
        log(`contest-auto-creator: on-chain verification failed for fixture ${row.fixture_id}, contest ${contestId} (tx ${signature}).`);
        continue;
      }
      await pool.query("update contests set status = 'CREATED' where id = $1", [contestId]);
      log(`contest-auto-creator: created contest ${contestId} for fixture ${row.fixture_id} (tx ${signature}).`);
    } catch (error) {
      log(`contest-auto-creator: failed for fixture ${row.fixture_id}:`, error instanceof Error ? error.message : error);
    }
  }
  await refreshContestCache();
}

// Product decision, not an implementation detail: top-3 split of the vault. 1 entrant -> 100%, 2 -> 70/30, 3+ -> 50/30/20.
// Confirm with product before changing. See ADR 0013.
const PAYOUT_CURVE: Record<number, number[]> = { 1: [1], 2: [0.7, 0.3], 3: [0.5, 0.3, 0.2] };

/** contest-auto-settler: after TxLINE reports game_finalised and the ledger is fully reconciled, publishes payouts on-chain. See ADR 0013. */
export async function checkAndSettleContests(): Promise<void> {
  if (!autoLifecycleEnabled()) return;
  const config = loadChainConfig();
  if (!config) return;
  const pool = db();
  const settleable = await pool.query<{ id: string; fixture_id: string; mint: string }>(
    `select c.id, c.fixture_id, c.mint from contests c
     where c.status in ('CREATED', 'LOCKED')
     and exists (select 1 from normalized_events ne where ne.fixture_id = c.fixture_id and ne.normalized_json->>'kind' = 'MATCH_FINALIZED')`,
  );
  if (!settleable.rows.length) return;
  const connection = new Connection(config.rpcUrl, "confirmed");
  for (const contest of settleable.rows) {
    try {
      if (!(await isLedgerReconciled(pool, contest.fixture_id))) { log(`contest-auto-settler: fixture ${contest.fixture_id} not yet reconciled; retrying next cycle.`); continue; }
      const ranked = await pool.query<{ wallet: string }>("select wallet from entry_totals where contest_id = $1 order by total desc, entry_id asc limit 3", [contest.id]);
      if (!ranked.rows.length) { await pool.query("update contests set status = 'SETTLED', settled_at = now() where id = $1", [contest.id]); log(`contest-auto-settler: contest ${contest.id} had no entrants; marked settled with no payout.`); continue; }
      const curve = PAYOUT_CURVE[Math.min(ranked.rows.length, 3)];
      const contestPubkey = new PublicKey(contest.id);
      const mintPubkey = new PublicKey(contest.mint);
      const vault = getAssociatedTokenAddressSync(mintPubkey, contestPubkey, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const vaultAccount = await getAccount(connection, vault, "confirmed", TOKEN_2022_PROGRAM_ID);
      const leaves: SettlementLeaf[] = ranked.rows.map((row, index) => ({ entryPublicKey: decodeSolanaAddress(row.wallet), amount: BigInt(Math.floor(Number(vaultAccount.amount) * curve[index])) })).filter((leaf) => leaf.amount > BigInt(0));
      if (!leaves.length) { log(`contest-auto-settler: contest ${contest.id} vault has nothing to distribute; skipping.`); continue; }
      const { root, payouts } = buildSettlementPayouts(leaves);
      const payoutTotal = payouts.reduce((sum, payout) => sum + payout.amount, BigInt(0));
      const built = buildPublishSettlementInstruction({ programId: config.programId, mint: contest.mint, authority: config.authority, contest: contest.id, root, payoutTotal });
      const transaction = await buildTransaction(connection, built.authority, built.instruction);
      const simulation = await simulateLegacyTransaction(connection, transaction);
      if (simulation.value.err) { log(`contest-auto-settler: simulation failed for contest ${contest.id}:`, JSON.stringify(simulation.value.err)); continue; }
      const authorityKeypair = await loadAuthorityKeypair();
      if (!authorityKeypair.publicKey.equals(built.authority)) { log(`contest-auto-settler: SOLANA_KEYPAIR_PATH keypair does not match FANTASY_AUTHORITY for contest ${contest.id}.`); continue; }
      const signature = await sendAndConfirmTransaction(connection, transaction, [authorityKeypair], { commitment: "confirmed", preflightCommitment: "confirmed" });
      const settlementAccount = await connection.getAccountInfo(built.settlement, "confirmed");
      if (!settlementAccount?.owner.equals(new PublicKey(config.programId)) || settlementAccount.data.length !== 8 + 89) { log(`contest-auto-settler: on-chain verification failed for contest ${contest.id} (tx ${signature}).`); continue; }
      const rootHex = Buffer.from(root).toString("hex");
      await pool.query("update contests set status = 'SETTLED', settled_at = now(), settlement_root = $1, settlement_tx = $2 where id = $3", [rootHex, signature, contest.id]);
      await pool.query(
        `insert into contest_settlements (contest_id, merkle_root, tx_signature, published_at) values ($1, $2, $3, now()) on conflict (contest_id) do nothing`,
        [contest.id, rootHex, signature],
      );
      log(`contest-auto-settler: settled contest ${contest.id} (tx ${signature}), ${payouts.length} payouts, total ${payoutTotal}.`);
    } catch (error) {
      log(`contest-auto-settler: failed for contest ${contest.id}:`, error instanceof Error ? error.message : error);
    }
  }
}

async function isLedgerReconciled(pool: Pool, fixtureId: string): Promise<boolean> {
  const rows = await pool.query<{ raw_json: unknown }>("select raw_json from raw_provider_events where fixture_id = $1 order by id asc", [fixtureId]);
  if (!rows.rows.length) return false;
  try {
    const model = buildHistoricalReplayReadModel(rows.rows.map((row) => row.raw_json));
    return model.eventSummary.unresolvedScoringActions === 0;
  } catch {
    return false;
  }
}
