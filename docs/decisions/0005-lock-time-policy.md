# 0005 — Lock time policy

## Context

PLAN.md section 4 "Lock policy" requires two independent locks and explicitly forbids defaulting to a one-hour pre-kickoff lock unless production evidence shows lineup data reliably arrives earlier. AGENTS.md 10.1 requires the server and the Solana program to independently enforce the deadline; the client countdown is informational only.

## Decision

- **User lock**: pressing "Lock team & confirm entry" immediately persists an immutable `locked_teams` row (`frontend/app/api/contest/lock-team/route.ts`), keyed uniquely on `(contest_id, wallet)`. A second lock attempt for the same wallet returns the existing row (`alreadyLocked: true`) rather than overwriting it — locks are never mutated.
- **Contest lock**: enforced independently in two places that must agree: (1) the API checks `Date.now() >= lockTs * 1000` before accepting a lock or building an entry transaction (server clock, not client); (2) the Solana program's `lock_ts` field is checked on-chain in `enter_contest`, so even a client that bypasses the API cannot enter after lock.
- The lock timestamp is set explicitly per contest at `create_contest` time (an operator-supplied Unix timestamp), not derived automatically as "kickoff minus 5 minutes" in code yet — no production evidence has been captured showing TxLINE lineup data reliably arrives further ahead of kickoff than a manually-chosen window. The demo/devnet contest deployed in this session (`F5tCE7LDBVistE8ax24jPpr6wXbZT1GuWv1wTydqsie`) uses `lock_ts = now + 3 days` to keep the contest joinable through the demo window, not a kickoff-relative calculation.

## Alternatives

Derive `lock_ts` automatically as `kickoff_at - 5 minutes` at contest-creation time — deferred, not rejected, pending real evidence of lineup-data timing across multiple captured fixtures (PLAN.md 4 explicitly warns against guessing this).

## Consequences

Operators must set `lock_ts` deliberately per contest today. A fixture whose lineup arrives late relative to a manually-chosen lock risks an unready contest at lock time; the readiness gate (`packages/domain/src/readiness.ts`) still fails closed in that case (team building simply never opens).

## Migration

Once several fixtures' lineup-arrival timing is captured, promote a `kickoff_at - Nmin` formula into `create_contest`'s off-chain caller, with `N` justified by observed data, and log the change here rather than silently changing the default.
