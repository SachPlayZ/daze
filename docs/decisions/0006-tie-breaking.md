# 0006 — Tie-breaking order

## Context

PLAN.md 6.13/12 requires a published, deterministic tie-breaking policy that never uses stake size, wallet balance, or admin discretion.

## Decision

`rankEntries` (`packages/domain/src/ranking.ts`) orders entries by, in order: (1) highest finalized fantasy points, (2) highest non-captain base points, (3) most selected-player goals, (4) earliest team-lock timestamp (`locked_at`, ascending — earlier lock wins), (5) stable ascending `entryHash` as the final deterministic tiebreak so no two entries can ever compare equal. `entry_totals.rank` (computed by `apps/worker/src/pipeline.ts`'s `recomputeRanks`) currently implements only criterion (1) plus a stable ascending `entry_id` sort as its tiebreak during live play — full criteria (2)-(5) apply at final reconciliation via `rankEntries`, matching PLAN.md 6.11's "live rank is always labelled provisional" distinction.

## Alternatives

Break ties by stake size or wallet — explicitly rejected (PLAN.md 12: "Never rank by: Stake amount... Wallet balance... Manual admin priority").

## Consequences

Live leaderboard order and final leaderboard order can legitimately differ for tied entries until reconciliation runs `rankEntries` with the full criteria. The UI must label live rank provisional (already required by PLAN.md 6.11/7.1) so this divergence is not surprising to users.

## Migration

If a sixth tiebreak criterion is ever needed (e.g. two entries identical through `entryHash`, which cannot happen since hashes are unique per commitment), it must be appended after criterion (5), never inserted earlier, to avoid silently reordering previously-settled contests.
