# 0009 — Telegram notification policy

## Context

PLAN.md section 8.6 and AGENTS.md 13.3/13.4 require idempotent, aggregated, opt-in Telegram delivery built only from committed ledger state, never from raw provider events directly, and never duplicated across retries or reconnects.

## Decision

- **Outbox pattern, not direct send**: `apps/worker/src/pipeline.ts`'s `enqueueNotifications` inserts a row into `notification_outbox` inside the same logical step as the ledger write (after the DB write commits, before any network call), and a separate loop (`apps/worker/src/main.ts`'s `dispatchNotifications`) drains unsent rows and calls `TelegramClient.sendDirectMessage`. This guarantees a Telegram DM is never sent for points that didn't actually commit (AGENTS.md 15: "Never send Telegram or submit Solana transactions inside a DB transaction").
- **Idempotency key**: `${wallet}:${sourceEventKey}:${ruleCode}:${sourceRevision}`, matching `notification_outbox.idempotency_key UNIQUE`. A duplicate SSE delivery or worker restart re-derives the identical key and the insert is a no-op (`ON CONFLICT DO NOTHING`), so retries cannot double-send.
- **Opt-in and pause**: a DM is only queued when `telegram_links` has a row for the entry's wallet (linking is initiated via `/link` in the bot and completed via wallet-authenticated `frontend/app/api/telegram/link`) and `notification_preferences.paused = false` and `.point_impacts = true` (default true, but explicitly toggleable, and `/stop` sets `paused = true`).
- **One process owns delivery**: only `apps/worker`'s `telegram-notifier` loop drains `notification_outbox`. `apps/bot` (the interactive command process) never drains the outbox itself — this avoids two processes racing to claim the same row and double-sending.

## Alternatives

Have the bot process poll and send outbox rows itself (since it already holds a `TelegramClient`) — rejected to keep exactly one writer of `notification_outbox.sent_at`, avoiding a race between the worker and bot processes.

## Consequences

Telegram delivery latency is bounded by the worker's poll interval (5s), not instant — acceptable against PLAN.md's "point projection <= 2 seconds" bar, which applies to the web app's own projection, not DM delivery specifically.

## Migration

If notification volume ever requires a dedicated queue (e.g. Redis/SQS) instead of polling `notification_outbox`, the idempotency key and "only the worker sends" rule must both carry over unchanged.
