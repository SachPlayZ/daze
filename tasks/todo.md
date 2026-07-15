# Todo

## Current: completed fixture recovery

### Plan

- [x] Recover `game_finalised` from the durable raw sequence when its payload omits `Clock`; backfill missing normalized events on worker restart. (`apps/worker/src/pipeline.ts`)
- [x] Read completed Past/Replay fixtures from Postgres raw events, retaining checked-in captures only as a local/demo fallback. (`frontend/lib`, replay route handlers)
- [x] Add regression coverage for clockless live finalization, durable recovery, and DB-backed replay history.

### Verification

- [x] Run root tests, worker typecheck, frontend lint/build, and diff checks.
- [x] Verify France–Spain (`18237038`) builds a ready replay and `MATCH_FINALIZED` from its stored raw sequence.

### Review

#### Changed

- Live clockless finals inherit the latest durable provider clock; restart recovery backfills the missing normalized final exactly once from raw history.
- Completed fixture lineup recovery now uses stored confirmed TxLINE lineups and writes fixture ID/mapping version to the correct columns.
- Past listing, replay builder, draft commands, and Replay Theatre now use completed Postgres sequences first, with checked-in captures as fallback.
- Past cards use the normalized authoritative final score, so France–Spain displays `0–2 final` rather than undercounting penalty goals.
- Settlement advances fixture lifecycle to `FINALIZED`; UI copy now describes automatic completed fixtures.

#### Verified

- `npm test`: 21/21; worker typecheck; frontend lint/build; `git diff --check`.
- Live Postgres read: France–Spain appears first from `DATABASE`, 1,025 events, 52 ready players, zero unresolved scoring actions, final 0–2 at elapsed second 5,816.
- HTTP smoke: list/detail/Quick Pick/Theatre all `200`; Theatre reaches final at 21/21 normalized events.
- Browser: 320/390/desktop, light/dark, no horizontal overflow, visible keyboard focus, France–Spain replay card present.

#### Risks

- Repository fix is not deployed; the Oracle worker must deploy/restart to backfill `MATCH_FINALIZED` and allow settlement. Production DB and Solana state were not mutated during verification.

#### Follow-ups

- Deploy frontend and restart the worker, then confirm contest `HfBVAid2iCXUxxo7JddtTfdfS9tNhd4T4TrqRAr4p4vZ` settles or reports a concrete settlement blocker.

## Plan

- [x] Replace dense Telegram command responses with concise inline-keyboard home, fixtures, and settings flows. (`apps/bot/src/main.ts`)
- [x] Add callback-query authorization and persisted one-tap notification toggles; retain command fallbacks. (`apps/bot/src/main.ts`, `packages/db` read-only)
- [x] Add flag-labelled fixture controls using stored fixture names, without guessing teams. (`apps/bot/src/main.ts`)

## Verification

- [x] Run bot typecheck and focused Telegram interaction/message regression checks.

- [x] Verify authenticated TxLINE fixture snapshot coverage without exposing credentials; surface every non-empty captured historical fixture with an honest replay state. (`frontend/app/api/replay/route.ts`, `frontend/app/components/FixturesList.tsx`)
- [x] Verify the Telegram bot runtime/configuration and document the exact local test flow. (`apps/bot/src/main.ts`, read-only)

- [x] Reflow replay builder into a pinned left pitch and independently scrollable right picker; replace position columns with one position selector. (`frontend/app/components/ReplayBuilder.tsx`, `frontend/app/globals.css`)
- [x] Move Judge Mode below the builder and verify the settlement-gate source for the displayed replay. (`frontend/app/components/ReplayBuilder.tsx`, `apps/api/src/historical-replay.ts` read-only)

- [x] Remove the replay builder from the landing page and route its CTA to fixtures. (`frontend/app/page.tsx`)
- [x] Add country-code flag helpers and render flags in fixture and replay player/team views. (`frontend/app/lib/flags.ts`, `frontend/app/layout.tsx`, components)
- [x] Add the derived formation pitch and responsive semantic styling. (`frontend/app/components/FormationPitch.tsx`, `frontend/app/globals.css`)

## Verification

- [x] Run frontend lint and production build.
- [x] Inspect the changed diff and flag/formation rendering paths.

## Review

### Changed

- Replaced verbose Telegram command/help and settings messages with native inline buttons. Settings now update in place, with one-tap notification toggles and pause/resume.
- Fixture picker now labels stored home/away names with verified country flags when a mapping is known; unknown teams use a neutral flag instead of a guess.
- Registered a concise Telegram command menu as a fallback to the inline controls.
- Added an authenticated Historical Replay notification session, isolated from contests and settlement, plus an idempotent outbox enqueue for each committed historical point/rank change.
- Theatre now has explicit `Send Telegram updates` mode. It requires the wallet-linked Telegram account and honours pause/point-impact preferences; only the Oracle worker dispatches DMs.
- Added an explicit Historical Replay Theatre using only the captured France–Sweden TxLINE sequence. It supports deterministic start/pause/reset and 1x/4x/10x acceleration, updates its replay leaderboard on each normalized event, and renders committed-impact Telegram message previews.
- Made the Telegram direct-message validation compatible with the frontend TypeScript target.
- Replay discovery now lists all 26 non-empty captured provider histories; only records with a confirmed, valid lineup are selectable.
- Pinned the desktop pitch to the left, made only the selected-position player list scrollable, and moved Judge Mode to the bottom of the replay.
- Removed the landing-page replay builder; fixtures now own fixture/replay discovery.
- Added ISO country-code flags and a responsive, clickable formation pitch.

### Verified

- `pnpm --dir apps/bot typecheck`, `pnpm test` (19/19), `git diff --check`.
- `pnpm test` (19/19), `pnpm --dir apps/worker typecheck`, `pnpm --dir frontend lint`, `pnpm --dir frontend build`, `git diff --check`.
- Authenticated TxLINE snapshot returned seven current fixtures; replay endpoint returns 26 captured histories (25 ready, 1 unavailable).
- Telegram `getMe` verified `@dazefantasybot`; bot typecheck passes and its local long-poll process is running.
- Desktop and 320px browser checks: position selector, independent player-list scrolling, sticky pitch, and leaderboard placement.
- `pnpm lint`, `pnpm build`, `git diff --check`.
- Browser checks at 320px and desktop: flag rendering, 11 formation slots, Quick Pick fill/deselect, formation reset, and both themes.

### Risks

- The Oracle worker must deploy this change and restart once so it applies migration `0009` and drains the new outbox rows. This workspace does not include authority to alter that VM.
- Telegram links currently use `http://localhost:3000`; the `/link` completion flow works only when opened on this machine. A public `NEXT_PUBLIC_APP_URL` is required for mobile testing.
- Fixture `18188721` remains correctly settlement-blocked: TxLINE action `615`/revision `701` is a confirmed 71′22″ substitution update missing both player IDs, so it cannot be safely replayed.
- Country aliases not in the static map intentionally render no flag rather than guessing.

### Follow-ups

## Previous backlog

- [x] Capture historical TxLINE payloads for player cards, penalty outcomes, and own goals; record evidence and unresolved gaps.
- [x] Add fail-closed normalizers for captured player-level scoring actions and discard corrections.
- [x] Add provider contracts plus duplicate, correction, player-join, and full-replay regression tests; promote only proven capabilities.
- [x] Promote own goals through a strict, unique prior-payload amendment resolver; quarantine ambiguous amendments.
- [ ] Promote penalty misses only after a real player-resolved penalty miss is captured.
- [x] Add the canonical v1 player-scoring matrix, including positive/negative values and capability status.
- [x] Add a versioned, fail-closed TxLINE soccer stat/phase registry; use it for final-score parsing and penalty-shootout exclusion.
- [x] Add documented stat-key and numeric penalty-phase regression tests.
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
- [x] Quick Pick / fan onboarding: equal-weight Build-manually/Quick-Pick CTAs, 30-second onboarding sheet (fan language, no protocol jargon), first-visit auto-show + reopen affordance.
- [x] TxLINE Verified Event Receipt: per-ledger-row receipt badge (fixture ID, provider sequence, provider timestamp, content hash, proof status, settlement tx when available) in both the replay builder and live match centre.
- [x] World Cup Season Table: cross-contest cumulative leaderboard (season total, best match, top-3 finishes, captain hit rate) + personal stats + shareable season card at /season.
- [x] Fantasy Pulse / StablePrice odds -- built. Odds normalizer (`packages/txline-client/src/odds-normalizer.ts`), worker `oddsPollingLoop` (60s, isolated from scoring), `fixture_odds_snapshots` table (migration `0006`), `/api/contest/live` temporal-bracketing join, `OddsMoveBadge` component wired into `LiveMatchCentre`. No `CapabilityKey` added -- odds never gates scoring, decision recorded in ADR `0011`. Replay mode intentionally not wired: fixture `18175981` has a real empty odds array, so no real data exists to show there.
- [x] Replace the placeholder hand-drawn `DazeWordmark` SVG (the "hand-drawn SVG substitute" `assets/brand/README.md` warned against) with the real approved raster wordmark, and wire branded favicon/apple-touch-icon/OG image -- previously the navbar/footer showed a fake squiggle logo and the browser tab showed the generic unbranded Next.js favicon.
- [ ] Vector brand SVGs (only PNG rasters exist) -- asset production, not an engineering task. Note: the more urgent problem (fake placeholder logo shipping in the actual UI) is now fixed via real PNG exports; a true vector master remains a future nice-to-have, not a blocker.
- [ ] Public production deployment, demo video recording, final submission -- requires human decisions (hosting provider/credentials, on-camera narration) this agent cannot make unilaterally.

## Verification

- [x] Run provider normalizer, scoring, replay, and full boundary suites after capability promotion.
- [x] Check the published scoring matrix matches the pure scoring constants and capability registry.
- [x] Run the TxLINE normalizer contract suite and root boundary tests.
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

- Completed a fresh post-lock, three-entry devnet contest proof: settlement guard rejected pre-lock publication; 50/30/20 claims then emptied the program vault and a repeat claim was rejected.

- Added a strict own-goal amendment resolver for historical replay and durable worker ingestion; own-goal corrections now reverse and replace their ledger rows.

- Captured the covered World Cup historical feed and promoted verified yellow cards, second yellows, straight reds, and regulation penalty goals; player joins use participant normative IDs and discard corrections reverse ledger effects.

- Added a canonical player-scoring reference with every v1 addition, deduction, multiplier, and provider gate.

- Added the documented TxLINE soccer stat/phase registry; final-score parsing uses total-goal keys and numeric penalty-shootout phases cannot score.

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

- Current frontend `pnpm lint` and production `pnpm build` pass; root boundary suite passes 18/18 specs.

- Applied the full idempotent migration set to Neon; wallet challenge, provider-event, ledger, settlement, and odds tables are present.

- Fresh tier-6 contest `GNQKN39HarJk6K9fDqEgbcYfwr5ESR9T3kaV1n4eyp9h`: pre-lock settlement rejected with `6010`; post-lock claims paid 150/90/60 and vault `AjiUN4wssCGE1DmjUD7toN3PhwGvYxcFxGMvkVCpeUSz` reached zero; repeat claim rejected with `6006`.

- Captured fixture `18175981` contains all documented base keys and period prefixes; `npm test` passes all 17 specs.

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

- Penalty misses remain disabled: all captured misses omit `Data.PlayerId`.

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

## Session: P1 differentiators (onboarding, verified receipts, season table)

### Changed

- Onboarding: `frontend/app/components/OnboardingSheet.tsx` (new) — one-screen fan-language explainer (formation, Quick Pick vs manual, captain x2/vice fallback, lock & follow live), auto-shows once via `localStorage["daze-onboarding-seen"]`, reopenable from nav. `ReplayBuilder.tsx` builder-controls now shows "Build manually" and "Quick Pick" as equal-weight primary buttons (previously Quick Pick was a subordinate secondary button with no manual-build CTA at all).
- TxLINE Verified Event Receipt: new migration `packages/db/migrations/0005_contest_settlements.sql` (schema-only, populated by a future real settlement run). Joined `fantasy_ledger` -> `normalized_events` -> `raw_provider_events` in `/api/contest/live` for `content_hash`/`provider_timestamp`, plus a `contest_settlements` left-join for `tx_signature`. Historical replay path (`apps/api/src/historical-replay.ts`) computes the same provenance directly from the captured fixture JSON via the already-existing `contentHash` helper and a newly-exported `eventKey` (`packages/txline-client/src/soccer-normalizer.ts`). New `frontend/app/components/ReceiptBadge.tsx` renders an expandable "Verified by TxLINE" pill per ledger row in both `ReplayBuilder.tsx` and `LiveMatchCentre.tsx`.
- World Cup Season Table: new `frontend/app/api/season/route.ts` (cross-contest `GROUP BY wallet` aggregate over `entry_totals` — no new contest-tracking table needed since `entry_totals` already carries `wallet`/`contest_id`/`total`/`rank`), captain hit rate computed from `locked_teams.canonical_json->>captainId` joined to `fantasy_ledger`. New `/season` page (`frontend/app/season/page.tsx` + `SeasonTable.tsx`) and `frontend/app/api/season/share-card/route.tsx` (cloned from the existing single-match share-card pattern). Nav links added both directions (`/` <-> `/season`), converted to `next/link`.
- Fantasy Pulse / StablePrice odds: spike run once WebFetch's earlier session rate-limit reset. Traced TxLINE's docs index (`https://txline-docs.txodds.com/llms.txt`) to the real OpenAPI spec and confirmed `GET /api/odds/snapshot/{fixtureId}` (also `/api/odds/updates/...` and `/api/odds/stream`). Added `scripts/probe-txline-odds.mjs` (same guest-JWT pattern as `capture-txline-devnet.mjs`) and captured a real 30-record StablePrice payload for live fixture `18222446` — genuine evidence, not fabricated. The historical replay fixture (`18175981`) has no odds data (empty array), so the existing replay demo can't show Fantasy Pulse as-is. Building remains out of scope for this session per the approved plan (spike-then-decide, not spike-then-build).

### Verified

- `npm test` (root): 17/17 specs pass, unchanged.
- `cd frontend && pnpm lint && pnpm build`: zero errors.
- Live browser verification (Chrome DevTools MCP, fresh isolated context, 375px/1440px, light/dark): onboarding sheet auto-opens on first visit, dismisses and persists via `localStorage`, reopens from nav; Build-manually/Quick-Pick equal-weight buttons render and both work; ran a full Quick-Pick -> Check-XI flow against the real captured France-Sweden fixture and confirmed all 17 impact rows render a working "Verified by TxLINE" receipt badge that expands to real fixture ID/provider sequence/timestamp/content hash/proof status; `/season` loads with an honest empty state (no settled contests yet — real, not fabricated) and both nav directions work. Zero new console errors after the fix below.
- Found and fixed one real bug during verification: `OnboardingSheet`'s original lazy `useState(() => typeof window !== "undefined" && ...)` initializer caused a guaranteed hydration mismatch on every first-time visit (SSR renders no dialog since `window` is undefined; client hydration then rendered one immediately). Fixed with the standard post-hydration `useEffect` + `setState` pattern (with a scoped `eslint-disable` for `react-hooks/set-state-in-effect`, since an effect is unavoidable for this class of client-only-after-mount problem).
- Applied migration `0005_contest_settlements.sql` to the live Neon DB via a one-off `ensureSchema()` run (idempotent, schema-only, no data change).

### Risks

- Season table data will look sparse (at most one contest's worth of rows) until more contests are created and settled off-chain — this is real/correct behavior per the existing single-active-contest architecture, not a bug; confirmed with the user before shipping.
- `contest_settlements` has no rows yet for the current active contest, so every live receipt currently shows "Settlement pending" — this will resolve automatically once a real settlement is published and the script (not yet updated) writes to that table. Wiring the settlement script's insert was left out of this session's scope to avoid any new devnet transaction.

### Follow-ups

- Fantasy Pulse / StablePrice odds spike still needs to run: check `https://txline.txodds.com/documentation` and `/api-reference` for a real odds endpoint, attempt one authenticated probe via `TxlineClient.getJson`, and only build the capability + UI if a real payload is captured.
- The settlement-publication script (wherever a future real settlement run happens) should insert into `contest_settlements` so receipts show a real Solana tx reference instead of "Settlement pending" once a contest actually settles.

## Session: Fantasy Pulse (Market Pulse odds display) build

### Changed

- New `packages/txline-client/src/odds-normalizer.ts`: versioned (`txline-odds-v1`), fail-closed decoder for TxLINE `StablePrice` odds payloads (`decodeOddsMarket`, `decodeOddsSnapshot`, `extractMatchOdds`), following the same pattern as `soccer-stat-registry.ts`.
- New migration `packages/db/migrations/0006_fixture_odds_snapshots.sql`: `fixture_odds_snapshots(fixture_id, snapshot_ts, raw_json)`, additive only, never referenced by scoring/ledger/settlement.
- `apps/worker/src/main.ts`: added `captureOddsSnapshot` + `oddsPollingLoop` (60s interval, real TxLINE endpoint, errors caught/logged, fully isolated from `pipeline.ts` and the score-scoring path).
- `frontend/app/api/contest/live/route.ts`: additive odds join -- reads all snapshots for the active fixture, brackets each ledger event's `provider_timestamp` against the nearest snapshot before/after in application code, flags `odds_stale` if the nearest "after" snapshot is >5 minutes past the event. Ledger query itself untouched.
- New `frontend/app/components/OddsMoveBadge.tsx`: clones `ReceiptBadge`'s pill+expandable-panel pattern; renders nothing when no odds data exists for an event (no fabrication); shows before/after for all three 1X2 outcomes plus a fixed "display only" disclaimer; wired into `LiveMatchCentre.tsx` next to the existing `ReceiptBadge`.
- New CSS in `frontend/app/globals.css`: `.odds-move-*` classes, semantic tokens only (`--positive`/`--negative`/`--warning`/`--muted`), both themes covered automatically.
- New ADR `docs/decisions/0011-market-pulse-odds-display.md`: records the decision not to add a `CapabilityKey` for odds (the VERIFIED/SHADOW/DISABLED gate controls ledger-write permission, which odds never has), the worker-poll-not-per-request architecture, and why replay mode is explicitly not wired.
- New test `tests/txline/odds-normalizer.spec.ts`: inline fail-closed assertions (unknown market type, `"NA"` probability, missing fields) plus real-fixture assertions against the already-captured `odds-snapshot-18222446.json` (exact decimal odds `1.751/3.621/6.544`) and the empty-array case from `odds-snapshot-18175981.json`.
- Explicitly not touched: `packages/config/src/capabilities.ts`, `packages/scoring/*`, `ReplayBuilder.tsx`, `apps/api/src/historical-replay.ts`, migrations `0001`-`0005`.

### Verified

- `npm test` (root): 18/18 specs pass (17 prior + new `odds-normalizer.spec.ts`).
- `tsc --noEmit` clean for both `apps/worker` and `frontend`.
- `cd frontend && pnpm lint && pnpm build`: zero errors.
- Live smoke test: ran the exact insert/query path the worker's `oddsPollingLoop` uses against the real TxLINE devnet endpoint and the live Neon DB for fixture `18222446` -- HTTP call succeeded, row written to `fixture_odds_snapshots`, read back correctly. Returned 0 markets because that fixture is no longer live at the time of this run (odds are live-fixture-scoped, consistent with the original spike's finding) -- this confirms the empty-payload path degrades gracefully exactly as designed, not a bug.
- Browser check: homepage loads clean, zero console errors introduced by this change (one pre-existing unrelated form-field a11y warning). No currently-configured live contest with active odds was available in this session to visually confirm a populated badge in the browser.

### Risks

- No currently-live TxLINE fixture existed during this session, so the `OddsMoveBadge` populated (non-null before/after) rendering path is verified by type-safety, unit tests, and a real DB/API round-trip, but not by an actual browser screenshot showing populated odds. Should be re-checked visually the next time a real fixture is live.
- `fixture_odds_snapshots` has no pruning; acceptable at hackathon scale (documented in ADR `0011`), would need a retention policy for long-term production use.

### Follow-ups

- None blocking. If a future session wires Fantasy Pulse into replay mode, it needs either a real replay fixture captured with concurrent odds data, or an explicit "no odds captured for this historical fixture" UI state -- never a synthesized value (see ADR `0011` migration note).

## Session: ship real Daze logo, branded favicon/apple-icon/OG image

### Changed

- `frontend/app/components/DazeWordmark.tsx`: replaced the placeholder hand-drawn inline `<svg>` (an abstract curved-line squiggle, not real Daze artwork -- exactly the "hand-drawn SVG substitute" `assets/brand/README.md` warns against) with the real approved raster wordmark, using `next/image` with `fill` and a CSS-only `[data-theme="dark"]` swap between `daze-wordmark-ink.png` (light theme) and `daze-wordmark-dark.png` (dark theme). No JS theme branching -- the theme is only known post-hydration (`ThemeToggle.tsx` sets `data-theme` in a `useEffect`, no cookie), so both images render identically on server and client and CSS alone decides visibility, avoiding any hydration mismatch.
- `frontend/app/globals.css`: `.wordmark` now sizes a positioned wrapper (`aspect-ratio:1200/435` to match the real PNG's 2.76:1 ratio, was 3.35:1 for the old SVG) instead of an inline SVG directly.
- `frontend/app/icon.png` / `frontend/app/apple-icon.png` (new, copied from the already-approved `frontend/public/brand/daze-favicon-32.png` / `daze-apple-touch-icon.png`): Next's static file-convention auto-detects these, no metadata code needed. Removed the generic unbranded Next.js scaffold files that were shipping instead: `favicon.ico` (the only one of three actually being served), `favicon-16x16.png` and `favicon-32x32.png` (both already dead -- wrong filenames for Next's convention, never served), and a stray `apple-touch-icon.png` (same generic scaffold timestamp, also wrong filename for Next's convention).
- `frontend/app/layout.tsx`: added `openGraph.images` pointing at the real `daze-og-default.png` export (previously no OG image was configured at all), plus `metadataBase` sourced from `NEXT_PUBLIC_APP_URL` so the OG image resolves to an absolute URL once a real production URL is configured (currently unset -- see the still-open deployment item above).

### Verified

- `cd frontend && pnpm lint && pnpm build`: zero errors. (Initial pass had 2 `no-img-element` warnings from raw `<img>` tags; fixed by switching to `next/image` with `fill`, which fit naturally since the component already needed absolute-positioned overlay images.) Build output confirms `/icon.png` and `/apple-icon.png` are generated static routes.
- Browser check (Chrome DevTools MCP): real lowercase "daze" wordmark renders in both nav and footer, replacing the old squiggle. Toggled dark theme live -- the `dark` variant swaps in correctly with good contrast on the match-night background, no layout shift, no new console errors (same one pre-existing unrelated form-field a11y warning as before this change). `curl`'d `/icon.png` and `/apple-icon.png` from the running dev server and byte-diffed them against the source exports in `frontend/public/brand/` -- exact match, confirming the served favicon/apple-touch-icon are the real approved artwork, not a generic default.

### Risks

- `metadataBase`/OG image resolves to `http://localhost:3000` until `NEXT_PUBLIC_APP_URL` is set in the deployed environment (expected -- no production URL exists yet, tracked under the existing "Public production deployment" item).
- `DazeMark` standalone-mark component remains unused -- no caller yet (nothing renders a standalone mark outside the icon files); wire it when a real caller needs it.

### Fix (user-reported)

- User caught that the dark-theme wordmark "looked off." Root cause: `daze-wordmark-dark.png` is byte-identical (same SHA-1) to `daze-wordmark-ink.png` -- both are the same dark espresso-brown wordmark, not a light-colored variant for dark backgrounds despite the filename. The correct dark-surface asset is `daze-wordmark-cream.png` (confirmed via direct pixel read: pale cream strokes, fully transparent background), which is exactly what AGENTS.md's own brand contract calls "the primary gradient/dark logo." Swapped the dark-theme `<Image>` source from `-dark.png` to `-cream.png` in `DazeWordmark.tsx`. Re-verified: lint/build clean, browser check in both themes shows correct contrast, no console errors.

### Follow-ups

- None blocking. The vector-SVG master question (todo item above) is unchanged and still open, but no longer urgent -- the product no longer ships a fake placeholder logo.
