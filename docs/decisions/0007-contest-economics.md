# 0007 — Contest economics

## Context

PLAN.md section 1 "Official contest model" and section 9 require a fixed, published, stake-independent payout policy suitable for a devnet hackathon demo.

## Decision

- One fixed entry stake per `(fixtureId, stakeTier)` pair, enforced on-chain (`enter_contest` transfers exactly `contest.stake_amount`, checked via `TransferChecked`) — no variable-stake entries are possible.
- Devnet-only, valueless Token-2022 test mint (`FANTASY_TEST_MINT`). No path exists in this codebase to accept a real-value asset; that is explicit out-of-scope work requiring legal/audit review (PLAN.md 17, section 9.4).
- Hackathon payout preset: top three entries split the distributable pot 50% / 30% / 20%, 0% protocol fee on devnet, minimum 3 entrants (PLAN.md section 1). This split is computed off-chain by `buildSettlementPayouts` (`packages/solana-client/src/settlement.ts`) and published as a Merkle root, not hardcoded on-chain — the program only enforces that the published payout sum never exceeds the vault's distributable balance.
- Multiple independent stake tiers can coexist for the same fixture (the `ContestPda` seed includes `stake_tier`), but within one contest every entrant pays identically.

## Alternatives

Configurable per-contest payout splits stored on-chain — deferred as unnecessary complexity for a single hackathon payout preset; the off-chain Merkle publication approach already allows changing the split without a program upgrade.

## Consequences

Changing the payout split for a *future* contest requires no code change (it's a parameter to the settlement builder), but a contest that has already published a settlement root cannot have its split altered — `publish_settlement` is a one-time action per contest outside an explicit correction window (AGENTS.md 14.2).

## Migration

Real-value staking requires a new ADR covering jurisdiction/legal review, a distinct mint, and explicit user-facing risk disclosure before any code change — see PLAN.md section 17.
