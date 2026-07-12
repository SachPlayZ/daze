# TxLINE provider notes

## Confirmed soccer goal and card contracts

Captured historical fixture `18175981` contains confirmed `goal` actions with `Data.PlayerId` and `Data.GoalType = "Shot"`. TxODDS Soccer Feed v1.1 documents `Data.GoalType` examples as `Shot` and `Head`; Daze maps only these two values to a verified non-penalty goal. Captured historical fixtures `18218149` and `18222446` contain confirmed `yellow_card` actions with `Data.PlayerId`, resolved through the same lineup-player `normativeId` join. Fixture `18222446` also contains `action_discarded` for an already-confirmed yellow card, which reverses its ledger row. Yellow-card and second-yellow scoring are verified. Fixture `18172379` captures `red_card` with `Data.Type = StraightRed` and a player ID; fixture `18188721` captures a regulation `penalty_outcome` with `Outcome = Scored` and a taker ID. Direct-red and penalty-goal scoring are therefore verified. Fixtures `18175918` and `18176123` capture own-goal `action_amend` replacements. Their omitted amendment action ID is resolved only when one prior confirmed goal has the exact participant, previous clock, goal type, and compatible player identity; ambiguous matches are quarantined. Own goals are verified. Penalty misses remain fail-closed because every captured miss omits the taker ID.

## Confirmed substitution amendment contract

Fixture `18175981` also contains `action_amend` records where `Data.Action = "substitution"`. The amendment carries `Data.Previous.Clock`, `Data.New.PlayerInId`, and `Data.New.PlayerOutId`. Daze treats the provider participant plus prior clock as the captured supersession key: it excludes the prior confirmed substitution revision and normalizes the amendment replacement. All 10 logical substitutions in the historical sequence resolve through this contract.

## Captured devnet evidence — 2026-07-10

- Devnet subscription: service level `1`, 4 weeks, no TxL payment.
- Live pricing row reported `pricePerWeekToken = 0` and `samplingIntervalSec = 0`.
- `/api/fixtures/snapshot` returned six fixtures, including World Cup fixture IDs `18213979`, `18218149`, and `18222446`.
- The current OpenAPI declares `Scores.lineups[]` with `fixturePlayerId`, `statusId`, `positionId`, `unitId`, `rosterNumber`, `starter`, and nested player identity. This is the expected lineup source.
- Historical fixture `18175981` contains an actual `Action = lineups` record: two participants, 52 fixture players, and 22 players with `starter = true`.
- Captured `goal.Data.PlayerId`, `injury.Data.PlayerId`, `substitution.Data.PlayerInId`, `substitution.Data.PlayerOutId`, `yellow_card.Data.PlayerId`, `red_card.Data.PlayerId`, and `penalty_outcome.Data.PlayerId` resolve to `lineups[].player.normativeId`; they do **not** resolve to `fixturePlayerId`.
- `/api/scores/snapshot/:fixtureId` returned either no records or `comment`/`coverage_update` records for the currently scheduled captured fixtures; no lineup-bearing score record has been captured yet.
- Raw payloads are stored under `tests/provider-fixtures/txline-devnet/`.

These captures prove fixture discovery and authenticated score snapshots. Historical fixture `18175981` additionally supplies the verified lineup, starter, substitution, open-play-goal, match-clock, and final-score evidence used by the replay. Historical fixtures `18218149` and `18222446` supply verified player-yellow/second-yellow evidence and a discard correction; `18172379` supplies straight-red evidence; `18188721` supplies regulation penalty-goal evidence; `18175918` and `18176123` supply own-goal amendment evidence. Do **not** promote penalty misses or any uncaptured scoring enum until its exact payload contract and regression tests exist.

## Confirmed World Cup soccer mapping

An external cross-reference of 14 World Cup starting XIs observed the following pattern under `unitId = 0`:

```text
34 -> GK
35 -> DEF
36 -> MID
37 -> FWD
```

TxODDS team confirmed this mapping on 2026-07-11 for the World Cup soccer scope. It is now versioned as `txline-soccer-world-cup-v1` and may be used only with the captured `unitId = 0` taxonomy. Unknown position or unit IDs remain fail-closed.

Required confirmations:

1. World Cup `positionId` and `unitId` mappings.
2. `dataSoccer.PlayerId` join key against fixture player IDs.
3. Own-goal `GoalType` value.
4. Regulation/extra-time penalty scored, missed, retake, and amendment payloads.
5. Second-yellow representation.
6. Starter/substitution correction semantics.
7. Canonical elapsed-time/stoppage-time field.
8. Pre-lock lineup availability guarantees.
