# 0012 — Lock time policy amendment: automated fixed buffer

## Context

ADR 0005 requires `lock_ts` to be an operator-supplied Unix timestamp, with `kickoff_at - 5min` auto-derivation explicitly "deferred, not rejected" pending real evidence, captured across multiple fixtures, of how far ahead of kickoff TxLINE lineup data reliably arrives. That evidence has not been captured — this repo still has only one fixture (`18175981`) with a fully captured, confirmed-lineup historical record.

The user requested full automation of contest creation (docs/decisions/0013-automated-contest-lifecycle.md), which requires a `lock_ts` to be computable without a human setting one per contest. Per ADR 0005's own migration clause ("log the change here rather than silently changing the default"), this amendment documents that decision rather than silently overriding it.

## Decision

`autoCreateContests()` (`apps/worker/src/contest-lifecycle.ts`) computes `lock_ts = kickoff_at - 30 minutes` for every automatically created contest. This is adopted **without** the timing evidence ADR 0005 asked for. It is justified only by:

- This is a devnet deployment; devnet tokens have no real value (`ContestShell.tsx`: "Devnet tokens have no value"). The cost of a poorly-timed lock is cosmetic, not financial.
- 30 minutes (not the originally-floated 5 minutes) is a deliberately wider, more conservative buffer, chosen to absorb RPC retry latency, DB write contention, and the auto-creation loop's own 5-minute polling interval — none of which existed as considerations when ADR 0005 floated 5 minutes for a manually-triggered, human-timed creation.

## Alternatives

Keep requiring operator-set `lock_ts` and only automate contest creation up to that point, holding for a human to confirm/adjust the timestamp before a contest opens. Rejected for this pass because the user explicitly asked for zero manual steps per contest; noted here as the safer fallback if the 30-minute default proves wrong in practice.

## Consequences

A fixture whose lineup arrives less than 30 minutes before kickoff will lock before `readinessLoop` (`apps/worker/src/main.ts`) resolves a ready lineup — team building never opens for that fixture, fail-closed, same as ADR 0005's existing consequence. This has not been validated against real timing data and may need revision.

## Migration

Once several fixtures' real lineup-arrival timing is captured (the original condition ADR 0005 asked for), that evidence should be used to validate or revise the 30-minute constant in `contest-lifecycle.ts`, not treat it as permanently settled. Log any change here.
