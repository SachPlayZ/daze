# 0010 — Solana program account layout

## Context

`programs/fantasy-pool` needed a fixed PDA/account layout early because a mis-sized account discovered after real contests exist is expensive to fix (this happened once already in this project — see `tasks/todo.md`: "Corrected the discovered `Contest` account-space calculation before any contest account was created").

## Decision

Four PDAs, all program-derived (never an operator-owned account):

```text
ContestPda    = ["contest", sha256(fixture_id), stake_tier_u64_le]
VaultPda      = associated-token-account(mint, ContestPda, allowOwnerOffCurve=true) — Token-2022 only
EntryPda      = ["entry", ContestPda, wallet]
SettlementPda = ["settlement", ContestPda]
```

Fixed, unit-tested account sizes (`programs/fantasy-pool/src/lib.rs`, asserted in `account_space_matches_serialized_fields`): `Contest::LEN = 187`, `Entry::LEN = 99`. The vault is a standard Token-2022 associated token account, not a custom struct — its size follows SPL Token-2022's own layout.

Token-2022 is enforced at the *instruction* level with explicit runtime checks on every account that touches the vault or a wallet's token account, not only via Anchor's declarative `token::token_program` constraint — a devnet negative-simulation test proved the declarative constraint alone still accepted a legacy SPL Token pairing, which the explicit runtime guard now rejects (`ConstraintAddress`/custom error, confirmed via devnet simulation transaction history in `tasks/todo.md`).

## Alternatives

Derive the vault as a custom PDA-owned token account instead of an ATA — rejected in favor of the standard ATA derivation (`getAssociatedTokenAddressSync`) since it's directly reproducible by any off-chain client without needing the program's IDL, simplifying `packages/solana-client` and `frontend/lib/contest-transaction.ts`.

## Consequences

`Contest`/`Entry` account sizes are load-bearing constants duplicated in three places that must stay in sync: the Rust struct definitions, the Rust unit test asserting `LEN`, and any off-chain code that manually verifies `contestAccount.data.length` after a transaction (e.g. `frontend/scripts/preflight-fantasy-contest.mjs` checks `contestAccount.data.length !== 8 + 187`). A future field addition to `Contest` or `Entry` must update all three or the preflight checks will (correctly) start failing closed.

## Migration

Any account layout change requires a program upgrade (the program is deployed with an upgrade authority, not immutable) and must not be applied while any contest for the old layout is still in `LOCKED`/`LIVE`/`RECONCILING` state, since existing account data would no longer deserialize correctly under a changed struct.
