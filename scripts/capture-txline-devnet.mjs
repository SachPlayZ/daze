import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const origin = process.env.TXLINE_API_ORIGIN ?? "https://txline-dev.txodds.com";
const apiToken = process.env.TXLINE_API_TOKEN;
if (!apiToken) throw new Error("TXLINE_API_TOKEN is required; do not commit it.");

const guest = await fetch(`${origin}/auth/guest/start`, { method: "POST" });
if (!guest.ok) throw new Error(`Guest session failed (${guest.status}).`);
const jwt = (await guest.json()).token;
if (typeof jwt !== "string" || !jwt) throw new Error("Guest session did not include a token.");
const headers = { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };
const response = await fetch(`${origin}/api/fixtures/snapshot`, { headers });
if (!response.ok) throw new Error(`Fixture snapshot failed (${response.status}).`);

const receivedAt = new Date().toISOString();
const destination = join("tests", "provider-fixtures", "txline-devnet");
await mkdir(destination, { recursive: true });
const fixtures = await response.json();
await writeFile(join(destination, "fixtures-snapshot.json"), JSON.stringify({ provider: "TxLINE", endpoint: "/api/fixtures/snapshot", receivedAt, payload: fixtures }, null, 2));
const fixtureIds = [...new Set([
  ...(Array.isArray(fixtures) ? fixtures.map((fixture) => String(fixture.FixtureId)) : []),
  ...(process.env.TXLINE_CAPTURE_FIXTURE_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
])];
const scoreResults = await Promise.all(fixtureIds.map(async (fixtureId) => {
  const score = await fetch(`${origin}/api/scores/snapshot/${fixtureId}`, { headers });
  const filename = `scores-snapshot-${fixtureId}.json`;
  const record = score.ok ? { provider: "TxLINE", endpoint: `/api/scores/snapshot/${fixtureId}`, fixtureId, receivedAt, payload: await score.json() } : { provider: "TxLINE", endpoint: `/api/scores/snapshot/${fixtureId}`, fixtureId, receivedAt, status: score.status };
  await writeFile(join(destination, filename), JSON.stringify(record, null, 2));
  return { fixtureId, status: score.status };
}));

const historicalFixtureIds = (process.env.TXLINE_CAPTURE_HISTORICAL_FIXTURE_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
const parseSse = (body) => body.split(/\r?\n\r?\n/).flatMap((frame) => {
  const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
  if (!data) return [];
  return [JSON.parse(data)];
});
const historicalResults = await Promise.all(historicalFixtureIds.map(async (fixtureId) => {
  const historical = await fetch(`${origin}/api/scores/historical/${fixtureId}`, { headers });
  const filename = `scores-historical-${fixtureId}.json`;
  if (!historical.ok) {
    await writeFile(join(destination, filename), JSON.stringify({ provider: "TxLINE", endpoint: `/api/scores/historical/${fixtureId}`, fixtureId, receivedAt, status: historical.status }, null, 2));
    return { fixtureId, status: historical.status, events: 0 };
  }
  const payload = parseSse(await historical.text());
  await writeFile(join(destination, filename), JSON.stringify({ provider: "TxLINE", endpoint: `/api/scores/historical/${fixtureId}`, fixtureId, receivedAt, payload }, null, 2));
  return { fixtureId, status: historical.status, events: payload.length };
}));
console.log(JSON.stringify({ captured: "fixtures-score-snapshots-and-historical", receivedAt, scoreResults, historicalResults }));
