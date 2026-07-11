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
4. Run a fresh post-lock end-to-end proof: real captured fixture -> valid XI -> three devnet entries -> lock elapsed -> final replay -> 50/30/20 settlement -> three claims. Contest `66xCqi19aJn41Ed2QaAM5sL6YovYj7fYT7tfPCjmkbjh` proved the entry, Merkle settlement, and claim mechanics (vault token balance reached zero), but it was finalized before its lock in the pre-guard binary and is not release-grade timing evidence.
5. Confirm replay checksum equality, no unresolved scoring actions, no duplicate ledger/DM rows, and 320px UI checks against the configured contest.
6. Replace the in-memory wallet challenge store with the configured durable database before production deployment.

External blockers: explicit approval for each devnet state-changing transaction, a funded devnet fee payer, and durable database/Telegram production credentials. These cannot be fabricated or bypassed.
