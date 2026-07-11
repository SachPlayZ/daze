# AGENTS.md — Daze TxLINE World Cup Fantasy

This file is normative for coding agents working in this repository. Read `PLAN.md` before changing architecture, domain rules, provider ingestion, scoring, wallet flows, settlement, or Telegram behavior.

Use agent skills like /txline-builder and /solana-dev-skill while also using /next-best-practices and /shadcn while building the frontend. Also for the landing page use /premium-landing-page skill.

---

## 1. Mission

Build **Daze**, a complete mobile-first Solana web application for the official fantasy contest attached to each TxLINE-covered World Cup fixture.

The web app owns the full experience:

- Solana wallet authentication.
- Today's covered fixtures.
- Real TxLINE player list and position groups.
- Formation selection.
- Manual Build and valid seeded Quick Pick.
- Eleven-player squad creation.
- Captain and vice-captain.
- Team lock and contest entry.
- TxLINE-configured live event scoring with explicit feed health.
- Personal point-impact timeline.
- Official leaderboard.
- Final reconciliation, settlement, and prize claim.

The Telegram bot is an optional DM companion for reminders, information, and personal point-change messages. It is not an alternative client and never handles wallet connection, signing, staking, team editing, or claiming.

---

## 2. Non-negotiable product facts

1. Never hardcode TxLINE delay. Mainnet SL1 is documented as 60-second delayed; the current devnet SL1 row reports `samplingIntervalSec = 0`. Read/verify the active service row and display actual configured/observed status.
2. The browser must never receive the TxLINE API token or guest JWT.
3. Player selection must use actual TxLINE lineup data. Never ship a hardcoded or scraped roster as a hidden fallback.
4. A selectable player needs a fixture player ID, preferred name, participant ID, and verified `GK`/`DEF`/`MID`/`FWD` mapping.
5. `positionId` and `unitId` mappings are versioned configuration derived from verified TxLINE data/support documentation. Never guess a mapping.
6. Unknown position IDs fail closed: hide the player from selection, mark fixture unready, and alert operations.
7. Touches, passes, tackles, assists, saves, shots, interceptions, key passes, ratings, and possession do not score in v1.
8. Scoring v1 uses only VERIFIED capabilities. Own goals and penalty misses may exist in code but cannot affect users until exact payload/enums pass provider contract tests.
9. Every score is reproducible from immutable raw provider payloads plus a versioned scoring ruleset.
10. Duplicate provider events must be no-ops.
11. Corrected provider events must reverse and replace prior fantasy ledger entries.
12. A full sequence replay must equal the incrementally maintained result.
13. One official contest entry per wallet per fixture/stake tier.
14. Fixed entry stake. Do not weight fantasy rank or payout share by stake size.
15. The Solana program vault, not an operator wallet, controls entry funds.
16. Team composition is immutable after user lock or contest lock.
17. Captain multiplies every positive and negative delta, including reversals and conceded-goal deductions.
18. Vice-captain activates only if final replay proves captain recorded zero active seconds.
19. Devnet uses valueless test tokens only.
20. Historical TxLINE replay is allowed and encouraged; fabricated event data is not.

---


## Brand implementation contract

The visual system in `PLAN.md` Section 1.1 is normative. Treat it with the same discipline as scoring and provider rules.

### Product identity

```text
Name: Daze
Tagline: Every moment changes your game.
Default visual mode: warm light
Optional mode: match-night dark
UI font: Instrument Sans
Marketing accent: Instrument Serif, sparingly
Logo: approved custom Daze artwork only
```

The product must feel like premium football culture with live competitive energy. It must not look like a degen terminal, casino, cyberpunk dashboard, generic Web3 landing page, or esports template.

### Required token implementation

- Define all colours, spacing, radii, shadows, and motion values centrally.
- Use CSS variables from `apps/web/styles/tokens.css` and `themes.css`.
- Expose semantic aliases through Tailwind or the chosen styling layer.
- Feature components may not contain arbitrary raw hex values except in documented third-party integration constraints.
- Do not use `bg-black`, `text-white`, or hardcoded gray scales when a Daze semantic token exists.
- Every core component must support light and dark themes.

Required semantic names:

```text
background
background-soft
surface
surface-raised
foreground
muted
border
brand-coral
brand-orange
live
positive
positive-surface
negative
negative-surface
warning
warning-surface
info
focus
```

### Logo rules

- Use `DazeWordmark` and `DazeMark` components; do not inline ad hoc image paths across pages.
- Never substitute a font for the logo.
- Never stretch, outline, shadow, glow, recolour by team, or place the wordmark inside a pill.
- Do not crop the full wordmark into a favicon. Use the purpose-built mark.
- Raster references are not production masters; final UI uses optimized SVG where available.

### Typography rules

- Instrument Sans is the product UI font.
- Use tabular numerals for clocks, scores, points, ranks, odds, countdowns, and currency.
- Use sentence case; reserve uppercase for compact status labels.
- Body text is at least `14px`; critical mobile body copy should be `15–16px`.
- Do not introduce another display font without an ADR.
- Do not use monospace for normal consumer copy.

### Surface and gradient rules

Brand gradient is allowed only on:

- Landing/auth hero.
- Replay cover.
- Empty-state artwork.
- Share/result card.
- Open Graph/demo thumbnail.
- Short transitional brand moments.

Brand gradient is prohibited behind:

- Team builder.
- Player list.
- Match timeline text.
- Leaderboard table.
- Rules and payout disclosures.
- Wallet confirmation.
- Claims and errors.

Data-heavy surfaces use solid `surface` or `surface-raised` tokens.

### Live-state rules

- Lime indicates live/active/captain emphasis, but never becomes the full page background.
- Positive and negative states require icon + explicit signed number + text, not colour alone.
- Corrections must look different from new scoring events.
- Provisional and final states must be visually and textually distinct.
- Do not celebrate negative outcomes with confetti or exaggerated motion.

### Motion rules

- Keep micro-interactions between `120–180ms` and normal transitions between `180–260ms`.
- Point deltas and rank movement may animate up to `520ms`.
- Major goal response is non-blocking and under `900ms`.
- Respect `prefers-reduced-motion`.
- Never delay state commitment, navigation, transaction feedback, or correction display for animation.
- Avoid constant particles, pulsing glows, autoplay video, and decorative motion loops.

### Component requirements

Every new UI component must define:

```text
Light theme
Dark theme
Mobile behavior
Keyboard/focus behavior
Loading state
Empty state where applicable
Error/stale state where applicable
Reduced-motion behavior where animated
```

Use shared primitives. Do not hand-roll page-specific buttons, chips, modals, or status badges when an existing Daze primitive fits.

### Copy rules

Use football-first consumer language:

```text
Build your XI
Lock team
Confirm entry
You gained +10
Your clean sheet was broken
Rank #18 → #4
Final points confirmed
Claim prize
```

Avoid protocol-first language in the primary flow:

```text
PDA
oracle payload
initialize account
execute stake
yield
guaranteed winnings
```

Technical details may appear behind `View transaction details`, `TxLINE verification`, or protected operations screens.

### Accessibility rules

- WCAG AA contrast is mandatory.
- Minimum touch target is `44x44px`.
- Visible focus state is mandatory.
- Status cannot rely only on colour.
- Core flow must work at `320px` width and at `200%` text scaling.
- Live score updates must use non-disruptive screen-reader announcements.
- All icons with meaning require accessible labels or adjacent text.

### Asset and rights rules

- Do not ship unlicensed player photos, federation crests, broadcast captures, sponsor marks, or competition artwork.
- Use abstract Daze gradients, text, verified flags where appropriate, and licensed/approved assets.
- Preserve TxLINE and Solana attribution requirements without allowing partner marks to overpower Daze.

### Visual review gate

Before marking a frontend task done:

1. Render at `320`, `390`, and desktop widths.
2. Verify warm light and match-night dark.
3. Run keyboard navigation.
4. Run contrast and accessibility checks.
5. Verify loading, stale, error, provisional, final, and correction states.
6. Compare against screenshot baselines.
7. Confirm no raw hex or unauthorized visual asset was introduced.


## 3. Working protocol

### 3.1 Plan mode

Create or update a task plan before work that:

- Touches three or more modules.
- Changes an invariant.
- Changes provider schema interpretation.
- Changes scoring, locking, ranking, staking, settlement, or claiming.
- Adds a migration.
- Alters wallet or Telegram identity linking.
- Changes event identity, correction handling, or replay behavior.

State:

```text
Goal
Affected packages
Data/invariants at risk
Implementation steps
Verification steps
Unresolved assumptions
```

When a provider assumption fails, stop and re-plan. Preserve the failure as a captured payload and regression test.

### 3.2 Scope discipline

- One coherent concern per change.
- No opportunistic redesign while fixing a bug.
- Prefer pure domain functions.
- Do not duplicate authoritative validation in UI and worker implementations.
- Do not add a second data provider without an explicit architecture decision.
- P0 end-to-end completion beats extra features.

### 3.3 ADRs

Add `docs/decisions/NNNN-short-title.md` for changes to:

- Position mapping interpretation.
- Player/action ID joins.
- Scoring or captain semantics.
- Lock time.
- Tie-breaking.
- Contest economics.
- Settlement trust model.
- Telegram notification policy.
- Solana program account layout.

Include context, decision, alternatives, consequences, and migration plan.

---

## 4. Expected repository layout

```text
apps/web
apps/web/public/brand
apps/web/styles
apps/web/components/brand
apps/api
apps/worker
apps/bot
programs/fantasy-pool
packages/config
packages/db
packages/domain
packages/txline-client
packages/scoring
packages/solana-client
packages/telegram
packages/observability
tests/provider-fixtures
tests/integration
tests/e2e
docs/decisions
docs/operations
docs/scoring
```

Boundary rules:

- `apps/web`: UI, browser wallet adapter, client queries. Never authoritative for lock, eligibility, scoring, or stake state.
- `apps/api`: wallet sessions, drafts, team commands, contest reads, transaction construction, Telegram link commands.
- `apps/worker`: fixture import, readiness, SSE ingestion, recovery, normalization, scoring projection, notifications, finalization, settlement orchestration.
- `apps/bot`: Telegram commands and DMs only.
- `packages/txline-client`: provider authentication, schemas, endpoint clients, SSE, cursors, raw DTOs.
- `packages/domain`: provider-independent contest, fixture, team, player, lifecycle, and ranking rules.
- `packages/scoring`: pure deterministic scoring and replay. No network, DB, clock, Telegram, or Solana calls.
- `packages/solana-client`: instruction builders, account decoding, transaction confirmation, explorer links.
- `programs/fantasy-pool`: contest escrow, entry, lock, settlement root, claim, refund.

Circular dependencies are prohibited.

---

## 5. Source-of-truth order

Use this precedence:

1. Solana program state for entry funds, contest chain lock, settlement publication, claim, and refund.
2. Locked-team canonical JSON and team hash for submitted composition.
3. Immutable raw TxLINE payloads for match truth and replay.
4. Normalized match events.
5. Fantasy ledger.
6. Materialized entry totals and leaderboard.
7. Client cache.

Never let a lower layer silently override a higher layer.

---

## 6. TxLINE integration rules

### 6.1 Environment

```text
SOLANA_RPC_URL=https://api.devnet.solana.com
TXLINE_API_ORIGIN=https://txline-dev.txodds.com
TXLINE_SERVICE_LEVEL_ID=1
TXLINE_PROGRAM_ID=6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
TXLINE_TXL_MINT=4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG
```

Non-secret constants may have validated defaults. Tokens, bot secrets, operator keys, and payer keys must come from secret management.

### 6.2 Runtime validation

- Validate every response and stream event with a runtime schema.
- Preserve raw unknown fields.
- Never coerce an unknown enum to the closest known value.
- Treat large provider IDs as strings at domain boundaries.
- Store timestamps in UTC.
- Record provider timestamp and receive timestamp separately.

### 6.3 Ingestion transaction

For each message:

1. Validate envelope.
2. Compute content hash.
3. Persist raw payload.
4. Resolve source event key and revision.
5. Normalize supported fields.
6. Persist normalized event and cursor atomically where possible.
7. Enqueue scoring projection.
8. Advance durable cursor only after persistence.

Never score a message that was not durably stored.

### 6.4 Event identity

Prefer provider fields in this order:

```text
fixtureId + connectionId + seq + id
fixtureId + stable provider action ID
fixtureId + provider timestamp + canonical action hash
```

Receive time alone is never an event ID.

### 6.5 Corrections

An amended event must:

- Reference the superseded revision.
- Reverse old fantasy ledger rows.
- Apply replacement rows.
- Recompute affected entry totals and ranks in one logical operation.
- Produce at most one correction DM per affected linked user.

Do not mutate or delete original raw payloads.

### 6.6 Recovery

- Persist last accepted sequence per fixture/connection.
- Reconnect SSE with exponential backoff and jitter.
- Detect gaps.
- Recover using snapshot/current/full sequence endpoints.
- Mark fixture `RECONCILING` while ordering is uncertain.
- Pause personal Telegram score DMs during uncertainty.
- Rebuild from raw sequence and compare checksums.

---

## 7. Provider capability registry

Maintain `VERIFIED | SHADOW | DISABLED` states for roster, positions, starter status, substitutions, goals, penalty goals, penalty misses, own goals, cards, clock, and final score.

Promotion to `VERIFIED` requires:

- Real captured TxLINE payload.
- Runtime schema.
- Normalizer test.
- Player/team join test.
- Duplicate and amendment test.
- Full replay test.
- Capability-registry evidence paths.

`SHADOW` data must never affect points, ranks, settlement, or user notifications.

## 8. Player-list and position rules

### 8.1 Readiness gate

A fixture is joinable only when both participant lineups are present and every selectable player resolves to a supported position group.

Required lineup fields:

```text
fixturePlayerId
participant/team identity
preferredName
positionId or unitId
starter/status when present
```

Required checks:

- Two distinct fixture participants.
- Unique fixture player IDs.
- Non-empty player names.
- Verified position mapping version.
- Enough players to satisfy every enabled formation.
- At least two available goalkeepers across the match.
- Action `PlayerId` join behavior proven in provider contract tests.

### 8.2 Mapping registry

Keep mappings in one versioned module and database record.

Do not write logic such as:

```ts
if (unitId === 1) return "GK";
```

outside the registry.

Every mapping change requires:

- Captured raw payload references.
- Unit test.
- Provider contract test.
- Mapping version bump.
- Readiness re-evaluation for affected open contests.

### 8.3 Unknown IDs

When an unknown `positionId` or `unitId` appears:

- Mark player ineligible.
- Mark fixture unready if formation capacity is affected.
- Emit metric and alert.
- Show identifier in protected ops UI.
- Never guess from roster number, known public position, or player reputation.

### 8.4 Player/action join

Do not assume `dataSoccer.PlayerId` equals `player.normativeId` or `fixturePlayerId` until a real payload proves it.

Create explicit resolver tests from captured TxLINE events. Unresolved goal/card actions must be quarantined and block finalization if they could change standings.

---

## 9. Fantasy team invariants

A valid locked team has:

- Exactly 11 unique fixture players.
- Exactly one goalkeeper.
- Exact counts for one supported formation.
- No more than seven players from one fixture participant.
- Exactly one captain among the 11.
- Exactly one different vice-captain among the 11.
- Only eligible players from that contest fixture.
- Immutable scoring and position-mapping versions.

Supported formations:

```text
4-4-2
4-3-3
4-5-1
3-5-2
3-4-3
5-3-2
```

Validation must exist once in `packages/domain` and be called by API, tests, and transaction-building flow.

Quick Pick may propose a valid XI but may never auto-lock. It must prefer verified starters when available, use only eligible players, respect all constraints, and use deterministic seeded selection.

Never silently replace, auto-correct, remove, or re-position a player's locked/draft choice.

---

## 10. Lock and entry rules

### 10.1 Lock

- User may lock early.
- Contest lock default: kickoff minus five minutes.
- Check server time inside the same DB transaction as team lock.
- Solana program independently rejects entry at/after `lock_ts`.
- Client countdown is informational only.
- A user-locked team cannot be unlocked by support or admin.

### 10.2 Team hash

Canonical JSON must have deterministic ordering and normalized strings.

Test hash stability across:

- Key ordering.
- Player selection ordering.
- Runtime/platform.
- Serialization library version.

Entry transaction includes the exact canonical team hash.

### 10.3 Entry

- One entry per wallet per contest.
- Fixed stake only.
- Do not create off-chain `CONFIRMED` entry until chain confirmation reaches configured commitment.
- Reconcile orphaned or dropped transactions.
- No operator custody.

---

## 11. Scoring engine rules

### 11.1 Purity

`packages/scoring` accepts normalized provider-independent inputs, locked teams, capability flags, and a scoring version. It returns intervals, ledger deltas, and reconciliation results.

It must not query DB, read wall-clock time, call TxLINE, send Telegram, call Solana, or depend on UI state.

### 11.2 Exact v1 values

```text
STARTING_APPEARANCE          +1 all positions
SUBSTITUTE_APPEARANCE        +1 all positions
APPEARANCE_60_REACHED       +1 all positions
GOAL / PENALTY_GOAL         GK +6, DEF +6, MID +5, FWD +4
PENALTY_MISS                -2 all positions; VERIFIED only
OWN_GOAL                    -2 all positions; VERIFIED only
YELLOW_CARD                 -1 all positions
DIRECT_RED_CARD             -3 all positions
SECOND_YELLOW total card deduction = -3 for match
CLEAN_SHEET                 GK +4, DEF +4, MID +1, FWD 0
GOALS_CONCEDED              -1 per second goal for active GK/DEF
CAPTAIN                     2x every positive and negative delta
VICE_CAPTAIN                2x final base ledger only when captain active seconds == 0
```

Penalty shootout events score zero.

### 11.3 Capability gates

Every rule maps to a `VERIFIED`, `SHADOW`, or `DISABLED` capability.

- `VERIFIED`: can write fantasy ledger.
- `SHADOW`: parse, persist, and compare only.
- `DISABLED`: ignore except raw persistence.

A provider parser must never self-promote a capability. Promotion requires captured payloads, tests, registry update, and review.

### 11.4 Match-time normalization

Implement one `MatchTimeNormalizer`.

- Preserve raw period, minute, and clock fields.
- Produce canonical elapsed match seconds.
- Handle halftime, stoppage, extra time, and shootout periods explicitly.
- Do not use provider receive timestamps to calculate football minutes.
- A player reaches 60 at `activeSeconds >= 3600`.

### 11.5 Participation intervals

- Starter begins at elapsed second 0 only after match start is confirmed.
- Substitute begins at resolved `PlayerInId` event time.
- Interval ends at `PlayerOutId`, red-card time, or match end.
- Award exactly one entry rule: `STARTING_APPEARANCE` for a confirmed starter or `SUBSTITUTE_APPEARANCE` for a confirmed substitute.
- Award 60-minute point once when cumulative active seconds reach 3600.
- Intervals and milestones remain provisional until replay.

### 11.6 Goal transaction

One confirmed goal may atomically produce:

1. Scorer goal points.
2. Captain multiplier.
3. Conceded-count changes for active opposition GK/DEF.
4. Clean-sheet reversals.
5. Leaderboard projection changes.
6. Notification outbox rows after commit.

Do not process possible/unconfirmed/overturned goals as final ledger effects.

### 11.7 Penalties

- Regulation/extra-time `Scored`: position-based goal points.
- `Missed`: -2 only when exact outcome and taker are VERIFIED.
- `Retake`: zero final effect for the replaced attempt; reverse provisional rows.
- Period `PE`: zero fantasy points.

### 11.8 Own goals

- Enable only from verified `GoalType` mapping.
- Apply -2 to scorer.
- Treat as conceded by scorer's participant for clean-sheet/conceded rules.
- Never infer from commentary or participant mismatch.

### 11.9 Cards

- Yellow: -1.
- Direct red: -3.
- Second yellow: cumulative card deduction equals -3. If -1 already exists, append -2 adjustment; never add another -3 for the same incident.
- Amendments append reversal and replacement rows.

### 11.10 Clean sheets

State machine:

```text
INELIGIBLE -> PROVISIONAL -> PROTECTED/FINAL
                         -> BROKEN
```

- Award provisional at 60 active minutes when conceded count is zero.
- Reverse if player concedes while still active.
- Protect when player leaves after 60 with zero conceded.
- Later team goals do not affect protected player.
- Full replay is final authority.

### 11.11 Goals conceded

For each active GK/DEF, append -1 when conceded count crosses 2, 4, 6, etc.

Overturned goals reverse threshold rows and may restore clean sheet.

### 11.12 Captain and vice-captain

- Apply captain 2x at ledger generation, including negative deltas and reversals.
- Keep vice at 1x live.
- At final replay, if captain active seconds == 0, append `VICE_CAPTAIN_FALLBACK` rows equal to the vice's finalized base ledger.
- One second of captain participation disables fallback.

### 11.13 Ledger

Append-only invariant:

```text
entry_total = sum(non-reversed applied_points for entry)
```

Every row stores `provisional` and structured `explanation_payload`. Web and Telegram consume committed explanation data; they do not reimplement calculations.

### 11.14 Replay equivalence and settlement gate

For every fixture:

```text
incrementalProjection(rawSequence) === fullReplay(rawSequence)
```

Compare semantic ledger checksum, player intervals, entry totals, ranks, and captain/vice result.

Unresolved scoring-relevant actions that could alter a prize position block settlement.

## 12. Leaderboard rules

Rank by:

1. Final points descending.
2. Non-captain points descending.
3. Selected-player goals descending.
4. Lock timestamp ascending.
5. Stable entry hash ascending.

During live play, label rank provisional.

Never rank by:

- Stake amount.
- Wallet balance.
- Entry transaction fee.
- Telegram linkage.
- Manual admin priority.

---

## 13. Telegram rules

### 13.1 Allowed

- `/start`, `/link`, `/today`, `/team`, `/points`, `/settings`, `/unlink`, `/stop`.
- Pre-match reminders.
- Personal point gain/loss DMs.
- Rank movement.
- Reconciliation corrections.
- Final result and claim deep link.

### 13.2 Prohibited

- Wallet connection in Telegram.
- Solana signing in Telegram.
- Staking or claiming in Telegram.
- Editing or locking a team in Telegram.
- Exposing full wallet addresses in messages.
- Sending personal points to a group chat.

### 13.3 Message construction

Build DMs from committed fantasy ledger rows, not directly from raw TxLINE events.

Every score DM includes:

```text
match minute when known
action and player
base points
captain multiplier when applicable
old total -> new total
old rank -> new rank when changed
web-app deep link
```

### 13.4 Idempotency

Notification key:

```text
telegram_user_id + source_event_key + source_revision + notification_type
```

No duplicate message after retry, process restart, or SSE reconnect.

### 13.5 Corrections

Do not delete old Telegram messages. Send a correction:

```text
Score correction: the earlier event was amended by the official feed.
Previous impact: +5
Corrected impact: 0
New total: 32
```

---

## 14. Solana program rules

### 14.1 PDAs

```text
ContestPda    ["contest", fixture_id, stake_tier]
VaultPda      ["vault", contest]
EntryPda      ["entry", contest, wallet]
SettlementPda ["settlement", contest]
```

### 14.2 Mandatory invariants

- Exact stake amount.
- Correct mint.
- Entry before lock.
- One entry per wallet.
- Immutable team hash.
- Program-owned vault authority.
- No arbitrary operator withdrawal.
- Settlement payout sum <= vault distributable balance.
- One claim per entry.
- Refund and prize claim mutually exclusive.
- Checked arithmetic.
- Explicit account ownership and signer checks.

### 14.3 Testing

Program tests must cover:

- Entry before/at/after lock.
- Duplicate entry.
- Wrong mint and amount.
- Unauthorized settlement.
- Oversized payout root/totals.
- Valid top-three claims.
- Double claim.
- Cancel and refund.
- Refund after claim rejection.
- Account substitution attacks.

---

## 15. Database transaction rules

Use transactions for:

- Team validation + lock.
- Raw event + normalized event + cursor.
- Event revision + ledger reversal/replacement + totals.
- Final replay result + settlement preparation.
- Telegram outbox insertion after score commit.

Never send Telegram or submit Solana transactions inside a DB transaction. Use outbox/orchestration after commit.

---

## 16. API and frontend rules

### API

- Authenticate all user-specific routes.
- Authorize by wallet-backed user ID.
- Validate request schemas.
- Repeat all team invariants server-side.
- Use idempotency keys on lock, entry-transaction, and claim-transaction commands.
- Never return provider secrets.

### Frontend

- Mobile-first.
- Show actual player readiness states.
- Never display raw provider enum IDs.
- Distinguish draft, locked, provisional, reconciling, and finalized.
- Show the active configured TxLINE sampling interval and observed feed state; never hardcode `~60s delayed` on devnet.
- Do not fabricate a moving match clock while feed is stale.
- Explain errors in fan language and include retry path.
- Wallet disconnect does not delete the server draft.

---

## 17. Historical replay rules

Replay is a first-class hackathon feature.

- Use the complete historical TxLINE sequence.
- Persist replay sessions separately from live contest state.
- Mark all replay UI and bot previews as historical replay.
- Reuse the same normalizer and scoring engine as live mode.
- Do not maintain a second fake/demo scoring path.
- Allow accelerated timing without changing original provider timestamps in stored data.
- Judge Mode may seed entries and teams but must use real TxLINE player/event sequences.
- Replay controls must support deterministic reset and at least `1x`, `4x`, and `10x`.

A replay bug is a live-scoring bug and must be fixed in shared code.

---

## 18. Odds and AI features

### Market Pulse

- Odds never affect fantasy points or payout.
- Convert price/probability using documented semantics only.
- Compare temporally correct snapshots around an event.
- Label delayed or unavailable odds.

### AI Pundit

- Optional after P0/P1.
- Structured event JSON is the only factual source.
- Template fallback required.
- Reject output containing player, score, minute, or odds values not present in inputs.
- No wagering recommendations.

---

## 19. Required tests before merge

### Provider changes

- Runtime schema tests.
- Real captured payload fixture.
- Unknown enum test.
- Duplicate test.
- Correction test.
- Player/action join test.
- Position mapping test.

### Scoring changes

- Golden ledger fixtures for entry, 60 minutes, goals by position, penalty score/miss/retake, own goal, cards, clean sheets, conceded thresholds, and reversals.
- Match-time and player-interval tests.
- Captain and vice-captain tests, including one-second captain appearance.
- Penalty-shootout zero-point test.
- Full replay equality.
- Tie-ranking tests.
- Negative-point and correction tests.

### Contest/chain changes

- Program tests.
- API integration test.
- Transaction simulation.
- Vault accounting invariant.

### Telegram changes

- Opt-in authorization.
- Message idempotency.
- Rate-limit retry.
- Correction message.
- No group leakage.

### UI changes

- Mobile viewport tests at `320`, `375`, `390`, and `430`.
- Warm light and match-night dark theme coverage.
- Screenshot regression for core Daze screens and components.
- Empty/loading/error/stale/reconnecting/correction states.
- Keyboard accessibility, visible focus, contrast, and `200%` text scaling.
- Reduced-motion behavior for live points and rank movement.
- No raw hex values or unapproved assets in feature components.
- End-to-end happy path.

---

## 20. Prohibited shortcuts

Do not:

- Hardcode player rosters.
- Guess positions.
- Score undocumented or non-VERIFIED capabilities.
- Use client time for locks.
- Trust client-calculated team validity or fantasy totals.
- Increment totals without an append-only ledger.
- Ignore provider corrections.
- Send Telegram messages from uncommitted state.
- Use variable stake as rank weight.
- Let admins choose winners.
- Put a user private key or seed phrase anywhere in the stack.
- Claim a feature is live when it is a historical replay, or hide the actual TxLINE service configuration.
- Use mocked data in the judged end-to-end path.
- Replace the approved Daze wordmark with a font approximation.
- Introduce a degen neon/cyberpunk visual theme, casino motifs, or full-screen glassmorphism.
- Put dense gameplay content directly on the brand gradient.
- Use colour as the only indicator of positive, negative, live, provisional, or final state.
- Add arbitrary raw colours instead of semantic Daze tokens.
- Ship unlicensed player imagery, crests, broadcast screenshots, or sponsor marks.

---

## 21. Implementation priority

Use this exact order:

```text
1. Devnet subscription, service-row verification, and real payload capture
2. Real TxLINE player list, positions, and player/action ID joins
3. Match-time normalizer and capability registry
4. Formation builder, Quick Pick, captain, vice, and immutable lock
5. Wallet auth, devnet stake entry, and vault invariants
6. Complete deterministic scoring and golden scenarios
7. Personal event-impact feed, Live XI, and leaderboard
8. Full replay reconciliation and settlement gate
9. Top-three devnet claim
10. Telegram DMs from committed ledger
11. Historical Replay Theatre and Judge Mode
12. TxLINE receipts, Market Pulse, share card, and season table
13. AI/TTS only if all prior gates are green
```

Do not build private leagues, mainnet wagering, social chat, or second-provider metrics before the judged path is flawless.

## 22. Definition of done for agents

A task is done only when:

- Code is implemented in the correct boundary.
- Runtime validation exists.
- Domain invariants remain explicit.
- Migrations are safe and reversible where practical.
- Tests cover happy path, duplicates, corrections, and failure modes relevant to the change.
- Logs and metrics make failure diagnosable.
- Documentation/ADR is updated.
- No secret is committed.
- The full end-to-end path remains functional.

The repository is hackathon-ready only when a real TxLINE fixture or historical TxLINE sequence can drive player selection, starter/substitute appearance, 60-minute milestones, verified goals/penalties/cards/own goals, clean-sheet and conceded-goal changes, captain/vice logic, Telegram impacts, final ranking, Solana settlement, and a devnet prize claim without manual database edits.

Release gates:

```text
fresh deployment passes judged-path E2E
incremental replay checksum == full replay checksum
zero unresolved scoring-relevant actions before settlement
zero duplicate ledger rows and Telegram DMs in retry tests
core flow passes at 320px mobile width
Judge Mode reaches final claim in under 3 minutes at accelerated replay speed
```
