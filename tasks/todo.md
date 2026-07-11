# Todo

## Plan

- [x] Create implementation-ready logo raster exports from the supplied logo artwork.
- [x] Package theme tokens, app icons, social artwork, and an agent handoff manifest.
- [x] Validate exported asset dimensions, alpha channels, and file references.
- [x] Export the Daze brand-kit board into individually addressable design references.
- [x] Package approved logo source references and an implementation handoff.
- [x] Verify asset dimensions and handoff contents.
- [x] Create a Daze brand-kit overview from the approved wordmark and visual contract.
- [x] Inspect the generated board and save the selected asset in the workspace.
- [x] Establish workspace structure and environment contract.
- [x] Implement domain validation, canonical team hash, deterministic Quick Pick, and scoring primitives.
- [x] Add secure TxLINE server client, raw event contracts, identity, and capability registry scaffold.
- [x] Add API lock command, worker ingestion/recovery, Telegram outbox, database, and Solana boundary scaffolds.
- [x] Replace starter frontend with Daze mobile-first contest experience and design tokens.
- [x] Document setup, invariants, and externally gated release steps.
- [x] Record TxODDS-confirmed World Cup soccer position mapping in a versioned registry and ADR.
- [x] Re-evaluate the captured TxLINE lineup against the confirmed mapping.
- [x] Replace the frontend feed gate with a server-side authenticated fixture-snapshot check.
- [x] Expose a real captured TxLINE historical replay read model with fail-closed readiness.
- [x] Build mobile formation, Quick Pick, captain, and vice flow from real TxLINE lineups.
- [x] Add authoritative server validation and replay scoring projection.
- [x] Verify replay UI states and full boundary/build checks.
- [x] Deploy the canonical fantasy-pool SBF program to Solana devnet.
- [x] Correct and upgrade the deployed contest account layout before creating any contest.
- [x] Enforce Token-2022 with runtime checks and upgrade before creating any contest.
- [x] Preflight a valueless Token-2022 test mint.
- [x] Create a valueless Token-2022 test mint and preflight fixture contest configuration.
- [x] Create the captured-fixture devnet contest and verify its program-owned vault.
- [x] Create the captured-fixture devnet contest and verify its program-owned vault.
- [x] Allocate valueless test tokens and simulate the first contest entry.
- [x] Run the full three-entry devnet settlement and claim path.
- [x] Build, simulate, and authorize the end-to-end devnet entry, settlement, and claim flow.
- [x] Build a real runnable worker process (fixture import, SSE ingestion, scoring projection, telegram outbox dispatch).
- [x] Build a real runnable Telegram bot process with all 8 commands and wallet-linking handshake.
- [x] Wire the contest lock/entry transaction flow into the frontend end to end.
- [x] Create a fresh, currently-joinable devnet demo contest (prior contests were expired/one-off tests).
- [x] Build the protected /ops diagnostics page.
- [x] Set up a real runnable test suite (root package.json + scripts/run-tests.mjs).
- [x] Write the 6 remaining ADRs required by AGENTS.md 3.3.
- [x] Build the live match centre page and shareable result card.
- [x] Add packages/observability (metrics registry + structured logging), wired into the worker.
- [ ] P1 differentiators (Fantasy Pulse/StablePrice odds, TxLINE verification receipts, World Cup season table) -- explicitly deferred by PLAN.md itself until P0 is green; not started.
- [ ] Vector brand SVGs (only PNG rasters exist) -- asset production, not an engineering task.
- [ ] Public production deployment, demo video recording, final submission -- requires human decisions (hosting provider/credentials, on-camera narration) this agent cannot make unilaterally.

## Verification

- [x] Check logo treatment, palette, football-first positioning, and readable board layout.
- [x] Type-check domain/scoring/config/client sources.
- [x] Run frontend lint and production build.
- [x] Audit no browser-exposed provider secrets or fabricated player fallback.
- [x] Inspect mobile (320px) and desktop UI shell.
- [x] Compile and execute provider, readiness, scoring, ranking, API, worker, and bot boundary tests.
- [x] Verify confirmed mapping contract, frontend production build, and Anchor compile.
- [x] Verify the running no-secret health endpoint against TxLINE devnet.
- [x] Exercise historical replay read/build/validation flow from captured provider data.

## Review

### Changed

- Added `assets/brand/daze-brand-kit-overview-v1.png`.
- Added individual Daze panel references, approved raster logo references, and `assets/brand/README.md` handoff guidance.
- Added build-ready logo raster exports, icons, Open Graph artwork, theme token files, and `frontend/BRAND-HANDOFF.md`.
- Added Daze workspace boundaries, secure environment template, capability ADR and release gate.
- Added pure domain/scoring scaffolds and a server-only TxLINE client.
- Added fail-closed position readiness, raw event identity/deduplication, capability-gated projection, replay, command/outbox primitives, and append-only DB migration.
- Added nonce-bound wallet-auth and Telegram-link service boundaries plus a dynamic server-only UI feed-health check.
- Replaced the Anchor placeholder with compiling `create_contest` and `enter_contest` PDA/token-vault instructions.
- Added compiling settlement publication and Merkle-proof prize claim instructions with a cumulative payout guard.
- Added vault-program cancel and per-entry fixed-stake refund instructions; refunds are mutually exclusive with prize claims.
- Activated the real TxLINE devnet free tier, stored its API token outside the workspace, and captured authenticated fixture/score snapshots.
- Captured a historical lineup/action sequence and verified the actual action-player join through `player.normativeId`.
- Added server-only on-demand guest-JWT refresh, a Keychain environment bridge, and captured soccer normalizers for lineups, substitutions, goals, and final score.
- Promoted the TxODDS-confirmed World Cup soccer mapping (`34=GK`, `35=DEF`, `36=MID`, `37=FWD`, taxonomy unit `0`) to a versioned, fail-closed registry and ADR.
- Replaced Next starter page with tokenized Daze responsive shell.
- Updated the frontend health route to verify authenticated fixture-snapshot access server-side and report only feed state/count.
- Added a real historical replay API and builder: captured France–Sweden lineups, server Quick Pick, team validation, and a deterministic provisional ledger projection.
- Added committed-ledger impact timeline and real-data Judge Mode provisional leaderboard for the captured historical replay.
- Added nonce-bound Ed25519 wallet authentication, signed HTTP-only session cookies, and native Phantom message-signing UI.
- Added a credential-safe server SSE proxy for TxLINE score updates.
- Added Solana-program-compatible deterministic settlement Merkle/proof builder and committed-ledger Telegram impact/correction message construction.
- Added server-only Telegram Bot API direct-message delivery with group-ID rejection.
- Added approved Solana web3/Token-2022 dependencies and a tested devnet `enter_contest` instruction/transaction builder.
- Added unsigned `create_contest` instruction construction and a no-send Token-2022 mint RPC simulation.
- Added a guarded `--send` path for the valueless Token-2022 mint; it verifies zero decimals, mint authority, null freeze authority, and Token-2022 ownership after confirmation.
- Added a guarded contest-creation path with post-confirmation contest-PDA and program-owned Token-2022 vault verification.
- Added a guarded valueless Token-2022 allocation path for devnet entry testing.
- Added guarded entry, settlement-publication, and Merkle-claim scripts with preflight simulation and post-confirmation balance/account checks.
- Enforced contest lock before settlement publication after the initial devnet proof revealed premature finalization was possible.
- Resolved legacy Solana SBF dependency compatibility and produced the local fantasy-pool SBF binary.
- Added public devnet program-readiness probing so contest entry remains fail-closed before deployment.
- Added a dry-run devnet deployment preflight that validates binary digest, deployer balance, and synchronized Anchor program ID.
- Deployed the canonical fantasy-pool program to Solana devnet and configured its public program ID for the web readiness gate.
- Corrected the discovered `Contest` account-space calculation before any contest account was created.
- Enforced Token-2022 program identity in every contest vault, entry, settlement, and refund instruction.
- Replaced insufficient declarative Token-2022 constraints with explicit runtime checks after a devnet simulation accepted a legacy SPL Token path.
- Corrected TxLINE provider notes to match the checked-in verified capability registry.
- Updated operator release documentation to distinguish completed replay/program evidence from remaining live-contest gates.
- Added ignored root `.env` with Keychain-backed TxLINE token, generated session secret, supplied Neon URL, and supplied Telegram token; Next now loads it server-side.

### Verified

- `pnpm lint`, `pnpm build` in `frontend/`.
- Static TypeScript compile of packages.
- Boundary test suite compiled and passed using TypeScript emit to a temporary test directory.
- `/api/health` returns a no-secret `NOT_CONFIGURED` state locally when TxLINE credentials are absent.
- `cargo check` passes for `programs/fantasy-pool` (Anchor macro cfg warnings only).
- TxLINE devnet fixture snapshot returned HTTP 200; six fixtures were captured as immutable provider fixtures.
- Captured lineup contract test and all existing TypeScript boundary tests pass.
- Frontend lint and production build pass after live-credential flow changes.
- Captured fixture `18175981` now passes lineup readiness with the confirmed mapping; all 52 players resolve and no unknown position/unit IDs remain.
- Keychain-backed `/api/health` returns `CONNECTED` with six currently observed fixtures; no credential is returned.
- Historical replay endpoint returns 52 real players, three verified goals, and ten amended/resolved substitutions; server projection and Judge Mode now complete reconciliation for this capture.
- Generated-keypair HTTP probe completed the wallet challenge/signature/session flow successfully; no user key material was accessed.
- Stream proxy contract test confirms both TxLINE auth headers stay server-side; a five-second real devnet probe stayed open without a score message, which is expected outside an active update window.
- Settlement proof and Telegram copy tests pass, including captain/rank and correction explanations.
- Telegram delivery client test passes; it posts only direct user IDs and keeps the bot token server-side.
- Contest transaction builder test validates the nine required accounts, signer position, Anchor discriminator payload length, and Token-2022 account derivation without signing or submitting.
- `create_contest` builder test validates its seven accounts, PDA parity, signer position, and 64-byte Anchor payload. Token-2022 test-mint simulation succeeds with a zero-decimal mint and 1,461,600-lamport rent requirement; no transaction was signed or sent.
- Token-2022-only constraint build and account-layout tests pass. Upgrade dry-run targets the canonical devnet program from `BHh9…RPya`, with rebuilt SBF SHA-256 `8cbb91e16e69171f2d61cd6e6235621c32dc5c6148a4f22989ab5a3a0ceada4e`; no upgrade was sent.
- The Token-2022-only binary reached devnet despite a CLI `AlreadyProcessed` retry failure: `solana program show` reports deployment slot `475473388` and program data length `381672`, increased from `371432`. No retry was sent.
- A real devnet negative simulation showed the deployed declarative account constraint still accepted a legacy SPL Token pairing. The corrected explicit-runtime-check SBF passes tests/build with SHA-256 `6d470c4ec51fcc4375a7654fe82c756d76b4732adf391a48187fe202d56643a8`; upgrade dry-run is clean and no transaction was sent.
- Runtime guard unit test now proves Token-2022 accepts and legacy SPL Token rejects. Final rebuilt SBF SHA-256 is `940a9deded039a9243ffad944f17cac3875e60e563265be7df2e29d92d2873d6`; upgrade dry-run remains clean and no transaction was sent.
- Runtime Token-2022 enforcement upgrade transaction `58dqd4r9VU6hH89G6RTGCqqu581N6t2h3dGZQxArfGWqs827KzvqN8Bxuy1Z9cqQ7SszLqhb1kkW2eq2vugJk77r` confirmed at slot `475475077`. Real devnet simulation now succeeds for Token-2022 and fails legacy SPL Token with Anchor `ConstraintAddress` error `2012`.
- `cargo-build-sbf` passed; `programs/fantasy-pool/target/deploy/fantasy_pool.so` is 363 KB with SHA-256 `e9853e321d93c27badfd50eacba72a10d656107137ca0216e928c5ecd106d2d8`.
- The corrected account-layout unit test passes; rebuilt SBF SHA-256 is `5add9a7dceeda87d79f1c0e401a6a24412036c35a06f503d7f2c779c06285d72`. Upgrade dry-run confirms the canonical program ID and 7.40854368 devnet SOL deployer balance; no upgrade transaction was sent.
- Corrected program upgrade transaction `52QxMSN5uzPLWXDzma2bAPdPkcyd6LxSU89RAkxLSEu6bJ2tQbZacZpQKkQbgW9BmTrAYc6TWyK8ezDnAAPHm3sK` confirmed for the same devnet program.
- Running `/api/contest/readiness` returns `PROGRAM_NOT_CONFIGURED` until a deployed program ID is explicitly configured.
- Deployment dry-run verified canonical program ID `CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk` and 9.99791592 devnet SOL; no deployment transaction was submitted.
- Browser smoke check at 320px and desktop.
- Devnet deployment transaction `5LWU5EvbvbY21pfLgunRysQ4cjrJBdrKHXhXqw7PLfCE6FYSeMypNGpZa3XvkgrjebaJT6oCTsyMBozTnEf1N3Nw` confirmed for program `CYWN8hXCXREiUajoVEsxFoxP96fXkgV5MoTBexguAnSk`; RPC reports it executable under the BPF upgradeable loader.
- Running `/api/contest/readiness` with the configured public program ID returns `READY_FOR_CONTEST_CONFIGURATION`.

### Risks

- Penalty, own-goal, and card scoring remain disabled until their exact payload enums are captured and tested.
- The program is deployed, but no valueless test mint, contest, entry, settlement, or claim transaction has been created or authorized.
- The deployed program now includes the corrected 187-byte `Contest` account layout; no contest account existed before the upgrade.
- Token-2022-only runtime enforcement is verified on devnet; no contest account exists yet.
- The captured historical replay fully resolves scoring-relevant goal/substitution updates through provider amendment records; its replay can reconcile.
- Program-level integration/attack tests against a configured devnet contest remain outstanding.
- Anchor CLI 0.30.1 and Rust 1.79 are installed through AVM, but SBF build still needs a Solana 1.18-compatible dependency lock; native `cargo check` is green.
- Anchor 0.30 IDL generation remains toolchain-incompatible; SBF binary generation and devnet deployment are green.
- Challenge storage is in-memory only until DATABASE_URL is wired; production wallet sessions must use a durable challenge store.

### Follow-ups

- Wire captured/current TxLINE lineup data into the team-builder read model; retain fixture unready state when lineup data is absent.
- Promote scoring capabilities only with exact provider event-enum evidence and regression fixtures.
- Create and preflight a valueless Token-2022 mint plus a captured-fixture contest; obtain separate approval before sending either transaction.
- Mint preflight uses a transient keypair and does not reserve the simulated mint address; mint creation must use a persisted local mint keypair after approval.
- Mint creation uses a transient mint signer only for the creation transaction; it does not persist a new private key and emits only public verification data.
- Test mint `Dcr2NHLK1KBJGgDkktsJB4A218vtPcyukFHf1UEZrRcp` was confirmed on devnet (zero decimals, Token-2022 owner, no freeze authority). Real-mint contest simulation succeeds for fixture `18175981`, tier `1`, and stake `100`; no contest transaction was sent.
- Contest `5QrV6Ee8vE85pgLEHBfsTf4NoF5aCMsh9K6ar217AizT` was confirmed for fixture `18175981`, tier `1`, stake `100`, and lock `1783793115`; its 195-byte program account and empty Token-2022 vault `H33RyCdDWb5iiWHD8f4Rt4VzrCB1yHS14S5hH9tBbZxK` verified.
- The tier-1 contest expired before entry approval. Tier-2 replacement preflight succeeds for the same real fixture, stake `100`, contest `66xCqi19aJn41Ed2QaAM5sL6YovYj7fYT7tfPCjmkbjh`, and vault `H2sVdV9wPuowXj8swTV9Bso1XojhLBuGPSKenZi2GP3N`; no replacement contest was sent.
- Tier-2 contest creation `5NdXo9ats2JtQoThd95dhjj1w3y9NPiij8h9bm8GhxwvWkkCuPhZEod4CCQ2BHaA4VUXNQ7nLhET1S1xV7PtSEbb` confirmed. Three deterministic, real-lineup entries transferred 100 valueless tokens each into the program vault. Settlement publication `6hBxcP5LfrU1B3ktJFYmGXpvtW5F3yxgctEFfmWWpDAPjk1j6QrgbgLVH2rJQR1LvfcowS9nVKLmAMKMkgWWvhC` committed 150/90/60 Merkle payouts; all three claim transactions succeeded and left the vault token balance at zero.
- Duplicate-claim simulation fails with program custom error `6006` (`AlreadyClaimed`). Frontend lint/build, TypeScript boundary suite, and program unit tests pass; Cargo emits only known Anchor 0.30 cfg warnings.
- Settlement-lock guard upgraded at devnet slot `475582334`. Fresh tier-3 contest `AeUYSa4pQKDhj22355sUqBMS7SyW44wRxkNeQMC6jxid` confirms a pre-lock settlement simulation now fails with custom error `6010` (`SettlementBeforeLock`). A fresh post-lock three-entry/claim run remains required for release-grade timing evidence.
- Root `.env` is owner-readable only. Runtime `/api/health` confirms authenticated TxLINE access, wallet-auth challenge setup is active, and Telegram `getMe` confirms the configured bot token. Database migration has not yet been applied.
- Simulate then execute the complete devnet entry, settlement, and claim workflow only after each state-changing transaction is explicitly approved.

## Session: worker/bot/entry-flow build-out

### Changed

- All three DB migrations (0001, 0002, and new 0003) are now actually applied to the live Neon DB; the wallet-challenge store was already DB-backed contrary to the prior stale note above.
- Added `apps/worker` as a real runnable Node process (package.json/tsconfig/tsx, `pg` dependency): fixture-importer, player-readiness-poller, score-sse-consumer with reconnect/backoff, soccer-event normalization, deterministic scoring projection (rebuilt from persisted `normalized_events` on restart via `fullReplay`, not an ad hoc in-memory-only state), ledger/entry-totals/rank persistence, and a telegram-notifier outbox drain. Added migration `0003_worker_state.sql` (`provider_cursors`, `telegram_links`, `telegram_link_tokens`, `notification_preferences`, `entry_totals`).
- Added `apps/bot` as a real long-polling Telegram bot process implementing all 8 commands from PLAN.md 8.2, plus `frontend/app/link` and `frontend/app/api/telegram/link` completing the wallet<->Telegram linking handshake. The bot never drains `notification_outbox` itself — only the worker does, to avoid double-sends (documented in ADR 0009).
- Wired the actual contest lock + devnet entry transaction flow into the frontend: `/api/auth/session`, `/api/contest/lock-team` (server-revalidates the draft, computes the canonical team hash, persists an immutable `locked_teams` row), `/api/contest/entry-transaction` (builds the unsigned `enter_contest` instruction), and a lock/entry panel in `ReplayBuilder.tsx` that signs and submits via Phantom and confirms on devnet.
- Created a fresh devnet contest (`F5tCE7LDBVistE8ax24jPpr6wXbZT1GuWv1wTydqsie`, tier 4, stake 100, lock ~3 days out) since the prior contests from earlier sessions had already expired or were one-off settlement tests; updated root `.env` and `frontend/.env.local` to point at it.
- Added the protected `/ops` diagnostics page and `/api/ops/diagnostics` (token-gated via new `OPS_ACCESS_TOKEN`), showing the capability registry, position mapping, and live per-fixture readiness from the DB the worker populates.
- Added a root `package.json` + `scripts/run-tests.mjs` so the 17 `tests/**/*.spec.ts` files run uniformly via `npm test` instead of manual per-session `tsc`-to-temp-dir compilation.
- Wrote the 6 ADRs required by AGENTS.md 3.3 that were missing (`docs/decisions/0003`-`0010`): player/action ID join, scoring/captain semantics, lock time policy, tie-breaking, contest economics, settlement trust model, Telegram notification policy, Solana program account layout.
- Fixed a pre-existing `as` type-cast error in `packages/config/src/capabilities.ts` (blocked a clean `tsc --noEmit` for any new consumer of the module).

### Verified

- `npm test` (new root runner): 17/17 specs pass.
- `cd frontend && pnpm build && pnpm lint`: pass with zero errors after every change in this session (worker, bot/link, ops, entry-flow).
- `apps/worker`: typechecks clean, 25s live smoke test against real Neon DB + real TxLINE devnet — schema applied, fixture-importer synced 6 real fixtures, safe no-op fallback when no contest configured (this was true until the contest-creation step later in the session).
- `apps/bot`: typechecks clean, 8s live smoke test — DB schema ready, polling loop connects to `getUpdates`.
- Contest creation: `create_contest` simulated then sent on devnet, confirmed (`4UFAXjP4i1gKBGWKqPeEGai8eWgCbXy2PpFsLmPyYuwryKvZ8cy2fGCdUxZQnFb65c97xJfQihdzgKA1hUPEiuqS`), 195-byte contest account, empty vault, matches expected PDAs.
- Entry flow: real quick-picked XI -> `/api/contest/lock-team` rejects a bogus 11-ID roster with precise per-position errors, accepts and persists a real quick-picked roster with a 64-hex-char hash -> `/api/contest/entry-transaction` returns an unsigned transaction that independently simulates successfully against devnet (`EnterContest`/`TransferChecked` logs, `err: null`).
- `/ops`: curl proof of 401 without token, 200 with real capability/fixture data with the correct token.

### Risks

- The live worker pipeline (SSE consumer -> scoring -> ledger) has not yet been exercised against a real *live* in-progress match, only against the fixture-importer path and the historical replay path — the newly created demo contest's fixture (`18175981`) is not currently live, so end-to-end live-event scoring through the new worker remains to be observed on a real in-progress fixture before the demo.
- Card scoring (yellow/red) remains correctly `SHADOW` in the capability registry because no card action has ever appeared in any captured TxLINE payload for this fixture — this is fail-closed-correct per PLAN.md, not a bug, but means the live demo cannot show a card-driven point swing unless a fixture with a captured card payload is found and the normalizer is extended with real evidence.
- `/ops` access token and `NEXT_PUBLIC_APP_URL` were added to `frontend/.env.local`/root `.env` (gitignored) — a fresh deployment needs these set explicitly, they are not committed anywhere.

### Follow-ups

- Live match centre page and shareable result card build-out was in progress via a background agent as of this note; check its outcome before considering Phase 5/7's UI requirements (PLAN.md 7.1-7.5) closed.
- No `contests` table exists off-chain; the whole stack (worker, bot, frontend) currently assumes exactly one active contest via `NEXT_PUBLIC_FANTASY_CONTEST_ID`/`FANTASY_CONTEST` env vars, consistent with how this repo was already built pre-session. Multi-contest support would need a real `contests` table and is out of scope for the hackathon P0 path.
- Lock time (`lock_ts`) is still set manually per contest at creation, not derived from `kickoff_at - 5min` — see ADR 0005 for why, and what evidence would be needed to automate it.
