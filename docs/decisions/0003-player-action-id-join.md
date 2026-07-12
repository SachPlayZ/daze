# 0003 — Player/action ID join key

## Context

Soccer score actions (`dataSoccer.PlayerId`, `PlayerInId`, `PlayerOutId`) must resolve to a specific lineup player. PLAN.md 3.4 requires the integration test to prove the join before live scoring is enabled; AGENTS.md 8.4 forbids assuming `dataSoccer.PlayerId` equals `fixturePlayerId` without evidence.

## Decision

Join action player IDs to lineup players through `player.normativeId`, not `fixturePlayerId` and not `player.id`. Captured fixture `18175981` proves `dataSoccer.PlayerId` values equal lineup `player.normativeId` values exactly; `resolveSoccerActionPlayer` (`packages/txline-client/src/lineup.ts`) implements this and returns `null` on any unresolved ID rather than guessing. Use lineup-group `normativeId` as the participant identity: score actions label the side as `Participant: 1|2` and carry the corresponding `Participant1Id`/`Participant2Id` normative ID; the group UUID `id` is never used for this join.

## Alternatives

Join on `fixturePlayerId` (rejected — action payloads never carry this field) or on `player.id` (a UUID; rejected — action payloads carry the smaller numeric `normativeId`, confirmed by direct comparison against the captured payload).

## Consequences

Any action whose player ID or participant does not match the captured lineup's normative identities is silently quarantined (returns no normalized event) rather than mis-scored. `packages/txline-client/src/soccer-normalizer.ts` depends on this resolver for every action kind.

## Migration

If TxLINE support later documents a different canonical field for World Cup soccer, capture a payload proving it, add a regression fixture showing the old assumption would have mis-joined, and bump `parserVersion` in the capability registry entries that depend on player resolution (`SUBSTITUTION`, `GOAL`).
