# 0002 — TxLINE World Cup soccer position mapping

## Context

Captured fixture `18175981` contains lineup `positionId` values `34`, `35`, `36`, and `37`, with `unitId = 0`. The published schemas describe these numeric fields but do not publish their semantic mapping.

## Decision

Use version `txline-soccer-world-cup-v1`:

```text
34 -> GK
35 -> DEF
36 -> MID
37 -> FWD
unitId 0 -> allowed taxonomy unit, not a position fallback
```

This mapping was confirmed by the TxODDS team and is restricted to the confirmed World Cup soccer scope. Unknown position IDs and unknown unit IDs remain ineligible.

## Alternatives

- Infer from player names or public football data: rejected.
- Treat `unitId 0` as a fantasy position: rejected.
- Keep every position unselectable: rejected after provider confirmation and captured contract tests.

## Consequences

The captured fixture becomes position-ready when all other readiness checks pass. Mapping changes require a new version, tests, evidence, and readiness re-evaluation.

## Migration

Persist the mapping version with fixture players and locked teams. Re-evaluate all open contests before exposing player selection after any replacement mapping.
