import { Pool } from "pg";

let pool: Pool | undefined;
export function db(): Pool | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4, ssl: { rejectUnauthorized: true } });
  return pool;
}
