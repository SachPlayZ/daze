import { Pool } from "pg";

let pool: Pool | undefined;
export function db(): Pool | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  // SSL is controlled by the DATABASE_URL sslmode param; don't override it here.
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  return pool;
}
