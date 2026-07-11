# 0008 — Settlement trust model (hackathon)

## Context

PLAN.md section 9.4 requires an explicit, auditable trust model for the hackathon, since on-chain verification of every scoring statistic is out of scope for the submission deadline.

## Decision

- An operator-controlled settlement key (`FANTASY_AUTHORITY`) publishes a Merkle root of finalized entry totals and payouts (`publish_settlement`) after deterministic off-chain replay (`fullReplay` in `packages/scoring/src/projector.ts`) — the chain does not independently recompute fantasy points.
- This is made auditable rather than trustless: the scoring version, raw provider event hashes (`raw_provider_events.content_hash`), the full ledger export (`fantasy_ledger`), and the standings root are all inspectable; each entry's team hash is on-chain (`locked_teams.canonical_team_hash` == the hash committed in `enter_contest`), so anyone can independently replay `fullReplay` over the same raw events and verify the published root matches.
- The program enforces `SettlementBeforeLock` (custom error `6010`) — settlement cannot be published before the contest's `lock_ts`, closing the specific attack this codebase already caught in devnet testing (an early settlement attempt succeeded before this guard existed; see `tasks/todo.md` history).
- Claims are proof-based and idempotent (`AlreadyClaimed`, custom error `6006`) against the published Merkle root, not against a mutable off-chain balance.

## Alternatives

Multi-signer settlement or on-chain score verification — explicitly deferred to post-hackathon (PLAN.md 9.4 "Post-hackathon, evaluate on-chain verification of selected score-stat proofs and multi-signer settlement").

## Consequences

Trust in a single hackathon deployment currently rests on the operator key not publishing a false root — this is disclosed, not hidden, and is the reason every input to the root (raw events, ledger, hashes) is published for independent replay rather than only the final numbers.

## Migration

A production/mainnet deployment must not reuse this ADR's trust model without adding multi-signer publication and/or on-chain proof verification, per PLAN.md section 17's mainnet requirements (independent audit, legal review, abuse controls).
