import { Pool } from "pg";
import { inMemoryChallengeStore, type ChallengeStore, type WalletChallenge } from "../../apps/api/src/auth";

let pool: Pool | undefined;
function databasePool(): Pool | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4, ssl: { rejectUnauthorized: true } });
  return pool;
}

export const challengeStore: ChallengeStore = {
  async save(challenge: WalletChallenge) {
    const db = databasePool();
    if (!db) return inMemoryChallengeStore.save(challenge);
    await db.query("create table if not exists public.wallet_challenges (nonce text primary key, wallet text not null, domain text not null, issued_at timestamptz not null, expires_at timestamptz not null)");
    await db.query("insert into public.wallet_challenges (nonce, wallet, domain, issued_at, expires_at) values ($1, $2, $3, $4, $5) on conflict (nonce) do update set wallet = excluded.wallet, domain = excluded.domain, issued_at = excluded.issued_at, expires_at = excluded.expires_at", [challenge.nonce, challenge.wallet, challenge.domain, challenge.issuedAt, challenge.expiresAt]);
  },
  async consume(nonce: string, wallet: string) {
    const db = databasePool();
    if (!db) return inMemoryChallengeStore.consume(nonce, wallet);
    const result = await db.query<{ nonce: string; wallet: string; domain: string; issued_at: Date; expires_at: Date }>("delete from public.wallet_challenges where nonce = $1 and wallet = $2 returning nonce, wallet, domain, issued_at, expires_at", [nonce, wallet]);
    const row = result.rows[0];
    return row ? { nonce: row.nonce, wallet: row.wallet, domain: row.domain, issuedAt: row.issued_at.toISOString(), expiresAt: row.expires_at.toISOString() } : null;
  },
};
