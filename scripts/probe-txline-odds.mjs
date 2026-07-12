import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const origin = process.env.TXLINE_API_ORIGIN ?? "https://txline-dev.txodds.com";
const apiToken = process.env.TXLINE_API_TOKEN;
if (!apiToken) throw new Error("TXLINE_API_TOKEN is required; do not commit it.");
const fixtureId = process.argv[2] ?? "18175981";

const guest = await fetch(`${origin}/auth/guest/start`, { method: "POST" });
if (!guest.ok) throw new Error(`Guest session failed (${guest.status}).`);
const jwt = (await guest.json()).token;
const headers = { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };

const response = await fetch(`${origin}/api/odds/snapshot/${fixtureId}`, { headers });
const receivedAt = new Date().toISOString();
const destination = join("tests", "provider-fixtures", "txline-devnet");
await mkdir(destination, { recursive: true });

if (!response.ok) {
  const body = await response.text().catch(() => "");
  await writeFile(join(destination, `odds-snapshot-${fixtureId}.json`), JSON.stringify({ provider: "TxLINE", endpoint: `/api/odds/snapshot/${fixtureId}`, fixtureId, receivedAt, status: response.status, body }, null, 2));
  console.log(JSON.stringify({ fixtureId, status: response.status, ok: false, body }));
} else {
  const payload = await response.json();
  await writeFile(join(destination, `odds-snapshot-${fixtureId}.json`), JSON.stringify({ provider: "TxLINE", endpoint: `/api/odds/snapshot/${fixtureId}`, fixtureId, receivedAt, payload }, null, 2));
  console.log(JSON.stringify({ fixtureId, status: response.status, ok: true, count: Array.isArray(payload) ? payload.length : null, sample: Array.isArray(payload) ? payload[0] : payload }));
}
