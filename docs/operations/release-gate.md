# Release gate

Do not mark Daze live until every remaining gate below is evidenced.

Completed evidence:

- TxLINE devnet subscription is active; credentials are server-only in macOS Keychain.
- Captured historical fixture `18175981` provides real lineups, verified positions, player/action joins, substitutions, open-play goals, and final score.
- Replay projection, correction/replay checks, and 320px UI smoke checks pass.
- Fantasy-pool program `CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk` is executable on devnet.

Remaining gates:

1. Confirm the deployed Token-2022-only runtime guard remains active on every release.
2. Re-run a fresh devnet contest with a live lock window whenever program or client instruction code changes.
3. Simulate each entry, settlement, claim, cancel, and refund transaction before sending it.
4. Completed: fresh post-lock devnet proof on 2026-07-12. Contest `GNQKN39HarJk6K9fDqEgbcYfwr5ESR9T3kaV1n4eyp9h` accepted three 100-token entries before lock `1783868317`; pre-lock settlement simulation failed with `SettlementBeforeLock` (`6010`); post-lock settlement [`23kRcb…623Dh`](https://explorer.solana.com/tx/23kRcbHW8szj3PEy2Sa9YhX2bCp1rwrFDjawLaCeFTcifppooAKd9c66DDBLoDKTu2s6pZyHzfV2odjSrge623Dh?cluster=devnet) was published and 150/90/60 claims emptied vault `AjiUN4wssCGE1DmjUD7toN3PhwGvYxcFxGMvkVCpeUSz`. A repeat claim simulation failed with `AlreadyClaimed` (`6006`).
5. Confirm replay checksum equality, no unresolved scoring actions, no duplicate ledger/DM rows, and 320px UI checks against the configured contest.
6. Completed: wallet challenges are persisted in Neon Postgres; current migrations create and verify `wallet_challenges`, event/ledger, settlement, and odds tables.

External blockers: public production hosting, durable production credentials, and demo-submission decisions. These cannot be fabricated or bypassed.
