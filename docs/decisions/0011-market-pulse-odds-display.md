# 0011 — Market Pulse odds display

## Context

TxLINE exposes a real odds endpoint (`GET /api/odds/snapshot/{fixtureId}`), confirmed with a live probe capturing 30 real `StablePrice` records for fixture `18222446` (`scripts/probe-txline-odds.mjs`, `tests/provider-fixtures/txline-devnet/odds-snapshot-18222446.json`). AGENTS.md §18 requires a "Market Pulse" feature that shows how odds moved around a scoring event, but is explicit that odds must never affect fantasy points or payout, and unavailable/delayed odds must be labelled rather than hidden or faked. The only historical replay fixture (`18175981`) returns an empty odds array, so it cannot be used to demo this feature with real data.

## Decision

Odds is a display-only data path, entirely separate from the capability-gated scoring system in `packages/config/src/capabilities.ts`. No `CapabilityKey` entry is added for odds: that registry's `VERIFIED/SHADOW/DISABLED` states exist specifically to gate fantasy-ledger write permission (AGENTS.md §11.3), and odds never writes to the ledger — adding it there would misrepresent what the gate controls.

Odds capture is a periodic worker poll (`apps/worker/src/main.ts`, `oddsPollingLoop`, 60s interval) against the real TxLINE endpoint, isolated from `pipeline.ts` and the scoring/ledger code path, writing raw snapshots to a new `fixture_odds_snapshots` table (`packages/db/migrations/0006_fixture_odds_snapshots.sql`). `/api/contest/live` reads all snapshots for the active fixture once per request and brackets each ledger event's `provider_timestamp` against the nearest snapshot before/after in application code — not a per-event denormalized table — to avoid coupling odds capture to scoring-pipeline internals.

Replay mode (`ReplayBuilder.tsx`, `apps/api/src/historical-replay.ts`) is not wired to odds in this pass, since the only replay fixture has no real odds data and AGENTS.md §20 prohibits fabricated event data.

## Alternatives

- **Add a `MARKET_ODDS` capability-registry entry.** Rejected — the registry's states control ledger-write permission; odds can never reach `VERIFIED` in that sense since it never scores, so the entry would be permanently misleading.
- **Fetch odds on-demand inside `/api/contest/live`.** Rejected — that route is polled every 4s by every connected browser; calling the TxLINE odds endpoint per-browser-per-poll would amplify provider load by the number of active viewers.
- **Populate a per-event `fixture_event_odds` table at ingest time.** Rejected — would require the odds poller to know which raw events are scoring-relevant, coupling a display-only feature to pipeline internals it should stay independent from.
- **Fabricate/interpolate odds for the replay fixture.** Rejected outright — AGENTS.md §20 prohibits fabricated event data in the judged path.

## Consequences

A new table (`fixture_odds_snapshots`) and worker loop exist purely for display; if the worker is not running or the polled fixture has no odds data, the UI degrades to showing nothing for that event (no badge), never a fabricated or stale-looking figure passed off as current. Snapshots older than 5 minutes relative to an event are treated as stale and flagged rather than shown as the "after" price. The table has no foreign key to `fixtures` and no pruning; at 60s polling it grows negligibly per match and is safe to leave unbounded for the hackathon scope.

## Migration

None required for existing data — this is a purely additive table and code path. If a future pass wires odds into replay mode, it would need either a real replay fixture captured with concurrent odds data, or an explicit UI state distinguishing "no odds captured for this historical fixture" from "no odds moved," never a synthesized value.
