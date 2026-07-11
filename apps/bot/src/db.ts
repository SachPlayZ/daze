import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../../../packages/db/migrations");

let pool: Pool | undefined;
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 8, ssl: { rejectUnauthorized: true } });
  return pool;
}

/** Applies every migration file in order. All statements are idempotent (IF NOT EXISTS), safe on a fresh or existing deployment. */
export async function ensureSchema(): Promise<void> {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await db().query(sql);
  }
}
