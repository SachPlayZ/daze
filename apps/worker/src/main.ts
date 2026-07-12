import "./env";
import { db, ensureSchema } from "./db";
import { txlineFromEnvironment } from "../../../packages/txline-client/src/index";
import { TelegramClient } from "../../../packages/telegram/src/index";
import { bootstrapFixture, handleProviderMessage } from "./pipeline";
import { incrementCounter, observeHistogram, setGauge, snapshotMetrics } from "../../../packages/observability/src/index";

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

/** fixture-importer: keeps the fixtures table current from the TxLINE snapshot so /today and readiness reflect real coverage. */
async function importFixtures(): Promise<void> {
  const client = txlineFromEnvironment();
  try {
    const fixtures = await client.getJson<Array<Record<string, unknown>>>("/api/fixtures/snapshot");
    if (!Array.isArray(fixtures)) return;
    for (const fixture of fixtures) {
      const id = String(fixture.FixtureId ?? "");
      if (!id) continue;
      const kickoff = typeof fixture.StartTime === "number" ? new Date(fixture.StartTime) : new Date();
      await db().query(
        `insert into fixtures (id, lifecycle, kickoff_at, feed_state, home_participant_id, away_participant_id, updated_at) values ($1, 'DISCOVERED', $2, 'WAITING_FOR_PLAYER_DATA', $3, $4, now())
         on conflict (id) do update set kickoff_at = excluded.kickoff_at, home_participant_id = excluded.home_participant_id, away_participant_id = excluded.away_participant_id, updated_at = now()`,
        [id, kickoff.toISOString(), String(fixture.Participant1Id ?? ""), String(fixture.Participant2Id ?? "")],
      );
    }
    log(`fixture-importer: synced ${fixtures.length} fixtures.`);
  } catch (error) {
    log("fixture-importer failed:", error instanceof Error ? error.message : error);
  }
}

/** odds-snapshot-poller: periodic Market Pulse capture, fully isolated from the scoring pipeline. Display-only — never affects the ledger. */
async function captureOddsSnapshot(fixtureId: string): Promise<void> {
  const client = txlineFromEnvironment();
  const payload = await client.getJson<unknown[]>(`/api/odds/snapshot/${fixtureId}`);
  if (!Array.isArray(payload)) return;
  await db().query(
    `insert into fixture_odds_snapshots (fixture_id, snapshot_ts, raw_json) values ($1, now(), $2)
     on conflict (fixture_id, snapshot_ts) do nothing`,
    [fixtureId, JSON.stringify(payload)],
  );
  log(`odds-snapshot-poller: captured ${payload.length} markets for fixture ${fixtureId}.`);
}

async function oddsPollingLoop(fixtureId: string): Promise<never> {
  for (;;) {
    await captureOddsSnapshot(fixtureId).catch((error) => log("odds-snapshot-poller failed (non-fatal):", error instanceof Error ? error.message : error));
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

/** score-sse-consumer + score-gap-recovery: reconnects with backoff and never scores a message that was not durably stored first. */
async function consumeScoreStream(fixtureId: string, contestId: string): Promise<never> {
  const client = txlineFromEnvironment();
  let backoffMs = 1000;
  for (;;) {
    try {
      const response = await client.openEventStream("/api/scores/stream");
      log("score-sse-consumer: connected.");
      setGauge("txline_stream_connected", 1);
      backoffMs = 1000;
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          const dataLines = message.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
          if (!dataLines.length) continue;
          try {
            const payload = JSON.parse(dataLines.join(""));
            setGauge("txline_last_event_age_seconds", 0);
            const startedAt = Date.now();
            await handleProviderMessage(db(), contestId, payload);
            observeHistogram("scoring_projection_latency_ms", Date.now() - startedAt);
          } catch (error) {
            log("score-sse-consumer: message failed:", error instanceof Error ? error.message : error);
          }
        }
      }
      log("score-sse-consumer: stream closed, reconnecting.");
      setGauge("txline_stream_connected", 0);
    } catch (error) {
      log("score-sse-consumer: connection error:", error instanceof Error ? error.message : error);
      setGauge("txline_stream_connected", 0);
    }
    await new Promise((resolve) => setTimeout(resolve, backoffMs + Math.random() * 500));
    backoffMs = Math.min(backoffMs * 2, 30_000);
  }
}

/** telegram-notifier: drains the committed notification outbox. Never sends before the scoring transaction that created the row commits. */
async function dispatchNotifications(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const telegram = new TelegramClient(token);
  const pending = await db().query<{ id: number; payload: { text: string }; telegram_user_id: string | null }>(
    "select id, payload, telegram_user_id from notification_outbox where sent_at is null and telegram_user_id is not null order by id asc limit 20",
  );
  for (const row of pending.rows) {
    try {
      await telegram.sendDirectMessage(row.telegram_user_id!, row.payload.text);
      await db().query("update notification_outbox set sent_at = now() where id = $1", [row.id]);
      incrementCounter("telegram_delivery_success_total");
    } catch (error) {
      incrementCounter("telegram_delivery_failure_total");
      log("telegram-notifier: delivery failed for outbox row", row.id, error instanceof Error ? error.message : error);
    }
  }
}

/** player-readiness-poller: retries lineup bootstrap until both participant lineups resolve, per fail-closed readiness rules. */
async function readinessLoop(fixtureId: string, contestId: string): Promise<void> {
  const client = txlineFromEnvironment();
  for (;;) {
    const runtime = await bootstrapFixture(db(), client, fixtureId, contestId).catch((error) => { log("player-readiness-poller failed:", error instanceof Error ? error.message : error); return null; });
    if (runtime) { setGauge("fixture_readiness_state", 1, { fixtureId }); log(`Fixture ${fixtureId} is ready: ${runtime.players.length} players loaded.`); return; }
    setGauge("fixture_readiness_state", 0, { fixtureId });
    log(`Fixture ${fixtureId} not yet ready; retrying in 60s.`);
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

async function main(): Promise<void> {
  await ensureSchema();
  log("Daze worker: schema ready.");

  await importFixtures();
  setInterval(importFixtures, 5 * 60_000);

  const fixtureId = process.env.FANTASY_FIXTURE_ID;
  const contestId = process.env.NEXT_PUBLIC_FANTASY_CONTEST_ID ?? process.env.FANTASY_CONTEST;
  if (fixtureId && contestId) {
    await readinessLoop(fixtureId, contestId);
    void consumeScoreStream(fixtureId, contestId);
    void oddsPollingLoop(fixtureId);
  } else {
    log("FANTASY_FIXTURE_ID / contest id not configured; running fixture-importer only.");
  }

  setInterval(() => { dispatchNotifications().catch((error) => log("telegram-notifier loop failed:", error instanceof Error ? error.message : error)); }, 5_000);
  setInterval(() => { log("metrics", JSON.stringify(snapshotMetrics())); }, 60_000);
}

main().catch((error) => { log("Daze worker crashed:", error); process.exitCode = 1; });
