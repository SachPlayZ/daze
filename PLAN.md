# Daze — TxLINE World Cup Fantasy PLAN.md

**Status:** Implementation plan for hackathon delivery  
**Product:** Daze — a mobile-first Solana fantasy-football web app with an optional Telegram DM companion  
**Data source:** TxLINE World Cup Service Level 1 on Solana devnet  
**Winning thesis:** Every verified TxLINE action becomes an immediate, explainable consequence for the fan: player points, team total, live rank, market context, and optional Telegram DM.  
**Target submission:** Functional deployed product, public repository, technical documentation, and a five-minute demo

---

## 1. Product definition

Build **Daze**, a polished, mobile-first, single-match fantasy-football game around every TxLINE-covered World Cup fixture.

The **web app is the complete product**. It owns Solana sign-in, official contest entry, player discovery, formation selection, team creation, captaincy, locking, live scoring, leaderboard updates, reconciliation, settlement, and prize claims.

The Telegram bot is an optional retention companion. It sends direct-message reminders and exact explanations of how verified match actions changed the linked user's points and rank. It never acts as a second gameplay client and never connects wallets, signs transactions, edits teams, accepts stakes, or processes claims.

### Product promise

**Tagline:** `Every moment changes your game.`

> Do not merely show the match. Show every fan exactly what the match just did to their fantasy team.

Every scored action should answer four questions within one card or DM:

```text
What happened on the pitch?
Which selected player was affected?
Why did points change by this amount?
How did the user's total and rank change?
```

When odds are available, a fifth, non-scoring line may show how the market moved after the event.

### Core user journey

```text
Open web app
  -> connect Solana wallet
  -> see today's TxLINE-covered fixtures
  -> open the official fantasy contest for one fixture
  -> review entry stake, prize split, lock time, scoring, and feed status
  -> choose Manual Build or Quick Pick
  -> select a supported formation
  -> select 11 eligible players from the two real teams
  -> choose captain and vice-captain
  -> inspect validation checklist and player-status warnings
  -> lock team and sign the contest-entry transaction
  -> follow live player milestones, points, rank, and TxLINE event impacts
  -> receive Telegram DMs if linked and opted in
  -> see final reconciliation and claim a prize if eligible
```

### Official contest model

- One official fantasy contest per covered fixture and stake tier.
- One entry per wallet per contest.
- Fixed entry stake for all entrants in that contest.
- Exactly 11 players, one captain, and one vice-captain.
- Maximum seven players from either real team.
- Team becomes immutable when the user locks it or the contest deadline passes.
- Top three valid entries split the distributable pot using a published fixed policy.
- Devnet uses a valueless test token only.
- Fantasy rank is determined only by fantasy points and deterministic tie-breakers, never by stake size.

Recommended hackathon payout preset:

```text
1st: 50%
2nd: 30%
3rd: 20%
Protocol fee: 0% on devnet
Minimum entrants: 3
```

### P0 winning loop

The submission is not considered functional until this exact chain works without manual database edits:

```text
Real TxLINE fixture
  -> real player list and verified positions
  -> valid formation and XI
  -> captain/vice-captain
  -> immutable lock and devnet entry
  -> verified TxLINE action
  -> deterministic point ledger
  -> personal impact animation
  -> leaderboard movement
  -> optional Telegram DM
  -> full-sequence reconciliation
  -> final top-three settlement and claim
```


## 1.1 Daze brand identity and visual system

Daze must look like a premium football-culture product, not a crypto casino, developer dashboard, or generic esports skin.

### Brand idea

```text
Name: Daze
Category: Live fantasy football
Tagline: Every moment changes your game.
Brand personality: expressive, warm, competitive, immediate, polished
Product feeling: editorial football culture outside the match; sharp live utility during the match
Blockchain posture: present in infrastructure, quiet in the consumer experience
```

Core positioning:

> Build your eleven, then feel every goal, card, clean sheet, and rank change as it happens.

The brand should make a mainstream football fan comfortable before it makes a Solana user impressed. Avoid visual and verbal cues that make the product feel like a high-risk betting terminal.

### Brand principles

1. **Fan-first, not chain-first.** Football language leads; protocol language is secondary.
2. **Soft brand, sharp product.** Marketing surfaces may be dreamy and expressive; gameplay surfaces must be crisp and highly legible.
3. **Live moments deserve contrast.** Use bright accents only for real-time state, points, rank, captaincy, and urgent actions.
4. **Explain every consequence.** The UI always shows why points changed and whether the result is provisional or final.
5. **Premium restraint.** No cyberpunk grids, purple-on-black defaults, excessive glassmorphism, random neon glows, token tickers, or casino motifs.
6. **Motion communicates state.** Animation reinforces score changes and rank movement; it never delays interaction or hides corrections.

### Logo system

The Daze wordmark is a custom lowercase expressive mark inspired by fluid editorial lettering. Treat it as artwork, not as a font substitution.

Required production assets:

```text
apps/web/public/brand/daze-wordmark-ink.svg
apps/web/public/brand/daze-wordmark-cream.svg
apps/web/public/brand/daze-wordmark-dark.svg
apps/web/public/brand/daze-mark.svg
apps/web/public/brand/daze-favicon.svg
apps/web/public/brand/daze-app-icon-512.png
apps/web/public/brand/daze-og-default.png
```

Until a vector master exists, the current generated raster is a direction reference only. Do not trace or ship a low-resolution screenshot as the final navbar logo.

Usage rules:

- Primary light-surface logo: espresso wordmark on warm off-white.
- Primary gradient/dark logo: warm cream wordmark.
- Preserve clear space equal to the approximate x-height of the `a` around all sides.
- Minimum digital wordmark width: `88px`; preferred navbar width: `104–124px`.
- Never stretch, outline, add a drop shadow, recolor by team, place inside a pill, or place over a busy match image.
- Do not recreate the wordmark using a close font.
- The app icon must use a purpose-built Daze monogram/mark, not a cropped four-letter wordmark.

### Core colour palette

#### Warm light theme — default

```css
:root {
  --daze-bg: #F4F0E8;
  --daze-bg-soft: #ECE6DC;
  --daze-surface: #FFF9F0;
  --daze-surface-raised: #FFFFFF;
  --daze-ink: #351A12;
  --daze-ink-muted: #766B63;
  --daze-border: #D8CFC3;

  --daze-coral: #FF6841;
  --daze-orange: #FF9565;
  --daze-live: #CFFF45;
  --daze-green: #70B89A;
  --daze-gold: #F6C35B;

  --daze-positive: #28764C;
  --daze-positive-surface: #DDF4E8;
  --daze-negative: #B93832;
  --daze-negative-surface: #FBE3E0;
  --daze-warning: #8A5A00;
  --daze-warning-surface: #FFF0C7;
  --daze-info: #315FA8;
  --daze-info-surface: #E6EEFB;

  --daze-focus: #2F6BFF;
  --daze-overlay: rgba(53, 26, 18, 0.42);
}
```

Recommended semantic usage:

- Page background: `--daze-bg`.
- Primary text and primary buttons: `--daze-ink`.
- Cards: `--daze-surface`; elevated modal/popover: `--daze-surface-raised`.
- Live badge, captain emphasis, current score pulse: `--daze-live` with dark ink.
- Coral/orange: brand warmth, progress, selected states, and restrained highlights—not body text on light backgrounds.
- Positive/negative/warning text must use the darker semantic tokens, not the decorative bright accents.

#### Match-night dark theme — optional user preference

```css
[data-theme="dark"] {
  --daze-bg: #171210;
  --daze-bg-soft: #1E1714;
  --daze-surface: #241C18;
  --daze-surface-raised: #30241E;
  --daze-ink: #F7F0E6;
  --daze-ink-muted: #AFA49A;
  --daze-border: #493A32;

  --daze-coral: #FF7048;
  --daze-orange: #FF9A6B;
  --daze-live: #D2FF4D;
  --daze-green: #69C8A1;
  --daze-gold: #F1C55F;

  --daze-positive: #86E0B0;
  --daze-positive-surface: #173629;
  --daze-negative: #FF817A;
  --daze-negative-surface: #40201E;
  --daze-warning: #F4CD72;
  --daze-warning-surface: #3A2D14;
  --daze-info: #9FC1FF;
  --daze-info-surface: #172642;

  --daze-focus: #8CB4FF;
  --daze-overlay: rgba(0, 0, 0, 0.58);
}
```

Theme behavior:

- Warm light is the default Daze identity.
- Offer `Light`, `Dark`, and `System` in profile settings.
- Never auto-switch themes at kickoff; unexpected theme changes are disruptive.
- Persist the preference locally and on the profile when authenticated.
- Every component must render correctly in both themes before release.

### Brand gradient

Use the dreamy gradient for high-emotion brand surfaces only: landing hero, authentication splash, replay cover, share card, empty-state illustration, Open Graph image, and occasional full-bleed transition.

```css
--daze-gradient-brand:
  radial-gradient(circle at 50% 32%, rgba(255, 104, 65, 0.92) 0%, rgba(255, 149, 101, 0.58) 32%, transparent 58%),
  radial-gradient(circle at 12% 88%, rgba(112, 184, 154, 0.88) 0%, transparent 42%),
  radial-gradient(circle at 92% 76%, rgba(246, 195, 91, 0.84) 0%, transparent 38%),
  linear-gradient(135deg, #F4F0E8 0%, #FFD1BB 48%, #E9D9A9 100%);
```

Do not place dense tables, team builders, player lists, odds, or long text directly on the gradient. Gameplay cards use solid surfaces for readability.

### Typography

```text
Wordmark: custom Daze artwork only
Product UI: Instrument Sans
Marketing display accent: Instrument Serif, optional and sparing
Fallback: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Instrument Sans weights:

```text
400  body and supporting copy
500  labels, chips, secondary controls
600  buttons, player names, navigation, card headings
700  scores, points, rank, key numeric emphasis
```

Rules:

- Use tabular numerals for score, clock, points, rank, odds, and countdowns.
- Use sentence case. Reserve uppercase for compact labels such as `LIVE`, `CAPTAIN`, and `FINAL`.
- Avoid condensed “sports” fonts, monospace body copy, and oversized all-caps headings.
- Marketing display text may use Instrument Serif, but the team builder and live match centre remain Instrument Sans.
- Minimum body size: `14px`; preferred mobile body: `15–16px`.

Suggested type scale:

```text
Display: 48/50 desktop, 36/39 mobile
H1: 36/40 desktop, 30/34 mobile
H2: 28/32 desktop, 24/28 mobile
H3: 22/27
Body: 16/24
Small: 14/20
Micro label: 12/16, 600 weight, slight tracking
Score/points hero: 48–64px with tabular numerals
```

### Spacing, shape, and elevation

Use a `4px` base spacing grid.

```text
Page gutter: 16px mobile, 24px tablet, 32px desktop
Card gap: 12–16px
Section gap: 24–40px
Card radius: 18px
Small control radius: 12px
Pill radius: 999px
Primary button height: 48–52px
Minimum tap target: 44x44px
```

Daze should feel soft but not bubbly. Use rounded cards and controls, then counterbalance them with strong alignment, tight data grouping, and clear rules.

Elevation:

- Prefer borders and tonal surfaces over heavy shadows.
- Default card shadow: none.
- Floating modal/popover may use one restrained shadow.
- Do not use glow as elevation.

### Core component visual contract

**Match card**

- Team names, kickoff, fixture phase, contest state, and entry status are visible at a glance.
- Live matches use a small lime `LIVE` badge, not a full neon border.
- Do not require team crests. Use licensed crests only; otherwise use team names, flags when legally safe, and consistent initials.

**Player card**

- Player name and position are primary.
- Team, starter/bench state, current points, captain marker, and availability are secondary.
- Selection state uses a border, check icon, and subtle surface change; never colour alone.
- Unknown/unverified players are not selectable.

**Formation pitch**

- Tactical structure is clear without photorealistic grass.
- Use a restrained field tint and high-contrast player tokens.
- Player tokens remain readable at `320px` viewport width.

**Personal impact card**

- The hierarchy is: pitch event → affected player → base points → multiplier/reversal → new total → rank movement.
- Positive and negative cards use iconography and explicit `+`/`−` values in addition to colour.
- Corrections are visually distinct from new events.

**Leaderboard**

- Emphasize the current user row without obscuring neighboring ranks.
- Use tabular numerals.
- Animate movement, not the entire table.
- Keep rank changes understandable with arrows and before/after values.

**TxLINE provenance**

- Use a restrained `Powered by TxLINE` or `Verified by TxLINE` label.
- Technical proof details open progressively; they do not dominate the consumer screen.

### Motion system

```text
Micro interaction: 120–180ms
Card/state transition: 180–260ms
Point delta count: 260–420ms
Rank movement: 320–520ms
Major goal moment: maximum 900ms, non-blocking
```

Rules:

- Positive points count upward; negative points count downward.
- Rank movement animates only affected rows.
- Goal moments may use one brief gradient pulse or scale response.
- Corrections use a calm replace/reconcile motion, never celebratory animation.
- Respect `prefers-reduced-motion`; all information remains understandable with motion disabled.
- No autoplaying background video, constant particle fields, or repeated confetti.

### Iconography and illustration

- Use one consistent rounded-outline icon family, preferably Lucide.
- Standard sizes: `16`, `20`, and `24px`; stroke width remains consistent.
- Abstract gradient illustration is preferred to unlicensed football photography.
- Do not use player likenesses, federation crests, broadcast images, or sponsor marks without permission.
- Team flags and competition branding must follow applicable usage rights.

### Voice and product copy

Daze speaks like a confident match companion: direct, short, energetic, and transparent.

Preferred:

```text
Build your XI
Lock team
Captain earns 2×
Lineups are ready
You gained +10
Your clean sheet was broken
Rank #18 → #4
Final points confirmed
Claim prize
```

Avoid:

```text
Initialize portfolio
Execute stake transaction
Submit PDA
Oracle payload processed
Yield opportunity
Wager now
Guaranteed winnings
```

Wallet copy should translate infrastructure into fan actions:

```text
Connect wallet
Confirm entry
Entry confirmed on Solana
Claim your prize
View transaction details
```

Never imply guaranteed returns or hide that devnet tokens have no value.

### Accessibility and responsive requirements

- Minimum contrast: WCAG AA `4.5:1` for body text and `3:1` for large text and controls.
- Coral and lime are accents; do not use them as small text on light surfaces unless contrast passes.
- Status is never communicated by colour alone.
- Every interactive element has a visible focus state using `--daze-focus`.
- Live point updates use an appropriate `aria-live` region without repeatedly interrupting screen-reader users.
- Touch targets are at least `44x44px`.
- Core flow must work at `320px` width without horizontal scrolling.
- Support text scaling to `200%` for critical flows.

### Brand implementation structure

```text
apps/web/styles/tokens.css
apps/web/styles/themes.css
apps/web/styles/motion.css
apps/web/components/brand/DazeWordmark.tsx
apps/web/components/brand/DazeMark.tsx
apps/web/components/ui/*
apps/web/components/fantasy/*
apps/web/public/brand/*
```

Use semantic Tailwind aliases backed by CSS variables:

```text
bg-background
bg-surface
bg-surface-raised
text-foreground
text-muted
border-border
bg-live
text-positive
text-negative
text-warning
ring-focus
```

Do not scatter raw hexadecimal values through components. Storybook or an equivalent component-lab route should show every core component in light/dark, mobile/desktop, normal/loading/error/stale/correction states.

### Demo and submission branding

The five-minute demo should visually communicate Daze within the first ten seconds:

1. Daze wordmark on the brand gradient.
2. Tagline: `Every moment changes your game.`
3. Immediate transition into the clean match-selection interface.
4. Use the brand gradient again for the final result/share card.
5. Keep TxLINE and Solana attribution visible but subordinate to the fan experience.

The product, repository README, Telegram bot avatar, Open Graph image, favicon, demo thumbnail, and share cards must all use the same Daze identity.


## 2. Feasibility conclusion

The core game is buildable with TxLINE Service Level 1, provided every fantasy rule is tied to a verified provider field and unsupported data is never inferred.

The documented score schema exposes the pieces needed for the MVP:

- Covered fixture discovery and kickoff metadata.
- Team identifiers and names.
- Per-fixture lineup structures.
- Player name, fixture player ID, roster number, starter flag, status ID, `positionId`, and `unitId`.
- Soccer action fields including player IDs, substitution player-in/player-out IDs, match minute/clock, goal flags and goal type, penalty flag/outcome, card flags, participant/team, and revisions.
- Soccer totals for goals, yellow cards, red cards, and corners.
- Snapshots, current sequences, full fixture sequences, historical intervals, SSE streams, and validation proofs.

Do **not** score touches, passes, tackles, assists, saves, shots, key passes, interceptions, possession, ratings, or any other metric merely because it is common in fantasy football. Those fields are outside scoring v1 unless a real World Cup payload and current TxLINE documentation prove a stable player-level representation.

### Service-level truth

Do not hardcode `~60 seconds delayed` for devnet.

- Mainnet Service Level 1 is documented as the 60-second World Cup tier.
- The current devnet Service Level 1 pricing row reports `samplingIntervalSec = 0`.
- Devnet configuration can change, so the backend must read or verify the active on-chain pricing matrix at startup and store the observed interval.
- The UI must render one of:

```text
Live via TxLINE devnet
TxLINE feed · configured delay: Ns
TxLINE feed reconnecting
TxLINE feed reconciling
TxLINE feed stale
```

Also measure observed event latency as `received_at - provider_timestamp`; never promise a latency lower than what the application actually observes.

### Capability-gated scoring

Every scoring rule has one of three runtime states:

```text
VERIFIED   exact payload shape captured; contract tests pass; rule enabled
SHADOW     parsed and logged but awards no user points
DISABLED   unsupported, ambiguous, or not yet verified
```

Goals, cards, lineup participation, substitutions, and final team score are P0 verification targets. Own goals and penalty misses are mandatory hackathon targets but remain `SHADOW` until their exact TxLINE enum/outcome behavior is captured and tested. Never guess a goal type or penalty result.

### Critical player-data rule

A fixture cannot become joinable until the backend has:

1. Received player data for both participants.
2. Stored each player's TxLINE fixture player ID and preferred name.
3. Received `positionId` and/or `unitId` for every selectable player.
4. Mapped those identifiers to `GK`, `DEF`, `MID`, or `FWD` through a verified versioned registry.
5. Proven that action `PlayerId`, `PlayerInId`, and `PlayerOutId` resolve to the expected fixture players.
6. Validated that the combined player pool can satisfy every enabled formation.

Never infer position from a player's name, shirt number, public reputation, or UI placement. Unknown identifiers fail closed.

## 3. TxLINE integration

### 3.1 Devnet configuration

```text
SOLANA_RPC_URL=https://api.devnet.solana.com
TXLINE_API_ORIGIN=https://txline-dev.txodds.com
TXLINE_SERVICE_LEVEL_ID=1
TXLINE_PROGRAM_ID=6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
TXLINE_TXL_MINT=4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG
TXLINE_EXPECTED_NETWORK=devnet
```

The platform operator subscribes once and activates one server-side API token. End users do not subscribe to TxLINE individually.

At startup:

1. Verify RPC, program ID, API origin, guest JWT host, and subscription transaction all use devnet.
2. Read or verify the active service-level pricing row.
3. Persist `samplingIntervalSec`, subscription expiry, and verification timestamp.
4. Refuse to start ingestion when network configuration is mixed.

Never expose the guest JWT or activated API token to the browser.

### 3.2 Required TxLINE endpoints

Use the current hosted API reference as source of truth. Wrap every endpoint behind `packages/txline-client`.

| Purpose | Endpoint family | Usage |
|---|---|---|
| Guest authentication | `POST /auth/guest/start` | Obtain guest JWT during platform activation/renewal |
| Subscription activation | `POST /api/token/activate` | Exchange the devnet subscription proof for the API token |
| Fixture discovery | `GET /api/fixtures/snapshot` | Import today's and upcoming covered fixtures |
| Latest match/player state | `GET /api/scores/snapshot/{fixtureId}` | Bootstrap lineups, game state, score, and current actions |
| Current update sequence | Current score-sequence endpoint | Recover recent events and detect missed updates |
| Complete match sequence | Full score-sequence endpoint | Rebuild a match, reconcile scoring, and power demo replay |
| Live score stream | Score SSE endpoint | Receive delayed live match actions |
| Odds snapshots/stream | Odds endpoint family | Power optional Market Pulse; never affect fantasy scoring |
| Validation proof | Fixture/score proof endpoint family | Add TxLINE verification receipts and auditability |

### 3.3 Raw-data persistence

Persist every accepted provider payload before normalization.

Required raw fields:

```text
provider
endpoint_or_stream
fixture_id
provider_event_id
connection_id
sequence
provider_timestamp
received_at
content_hash
raw_json
revision
supersedes_revision
```

Rules:

- Duplicate events are no-ops.
- Corrections supersede previous revisions; they do not append a second fantasy action.
- Unknown fields are retained in raw JSON but ignored by scoring.
- A full replay must produce the same final ledger and leaderboard as incremental processing.
- If sequence continuity is lost, pause notifications, fetch the missing/full sequence, rebuild, then resume.

### 3.4 Normalized fixture player

```ts
type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

type FixturePlayer = {
  fixtureId: string;
  fixturePlayerId: string;
  providerPlayerId: string | null;
  participantId: string;
  preferredName: string;
  rosterNumber: string | null;
  starter: boolean;
  statusId: string | null;
  providerPositionId: string | null;
  providerUnitId: string | null;
  positionGroup: PositionGroup;
  mappingVersion: string;
  eligible: boolean;
};
```

Use `fixturePlayerId` as the action-to-player join key unless captured payloads prove another field is used by `dataSoccer.PlayerId`. The integration test must compare actual action IDs with actual lineup IDs before live scoring is enabled.

#### Normalized soccer event contract

Provider DTOs must be converted into a small provider-independent union before scoring:

```ts
type NormalizedSoccerEvent =
  | { kind: "MATCH_STARTED"; eventKey: string; elapsedSec: 0; revision: number }
  | { kind: "SUBSTITUTION"; eventKey: string; elapsedSec: number; playerInId: string; playerOutId: string; participantId: string; revision: number }
  | { kind: "GOAL"; eventKey: string; elapsedSec: number; scorerId: string; participantId: string; goalKind: "OPEN_PLAY" | "PENALTY" | "OWN_GOAL" | "UNKNOWN"; period: string; revision: number }
  | { kind: "PENALTY_ATTEMPT"; eventKey: string; elapsedSec: number; playerId: string; participantId: string; outcome: "SCORED" | "MISSED" | "RETAKE" | "UNKNOWN"; period: string; revision: number }
  | { kind: "CARD"; eventKey: string; elapsedSec: number; playerId: string; participantId: string; card: "YELLOW" | "DIRECT_RED" | "SECOND_YELLOW" | "UNKNOWN"; revision: number }
  | { kind: "MATCH_PHASE"; eventKey: string; elapsedSec: number; phase: string; revision: number }
  | { kind: "MATCH_FINALIZED"; eventKey: string; elapsedSec: number; participant1Goals: number; participant2Goals: number; revision: number }
  | { kind: "ACTION_REPLACED"; eventKey: string; replacesEventKey: string; revision: number };
```

Rules:

- Unknown goal, card, or penalty kinds are preserved but cannot score.
- Every normalized event retains a pointer to its raw payload and capability state.
- Provider-specific field names must not leak into `packages/scoring`.
- Normalization is deterministic: the same raw event and parser version produce the same normalized JSON and hash.

### 3.5 Position mapping registry

Create a versioned registry rather than scattering numeric mappings through the codebase.

```ts
type TxLinePositionMapping = {
  version: string;
  positionIds: Record<string, PositionGroup>;
  unitIds: Record<string, PositionGroup>;
  precedence: "POSITION_THEN_UNIT" | "UNIT_THEN_POSITION";
  capturedFromFixtureIds: string[];
  verifiedAt: string;
};
```

Readiness checks:

- No conflicting mapping between `positionId` and `unitId`.
- Every enabled position group has enough selectable players.
- Both participants are represented.
- No duplicate `fixturePlayerId`.
- Every selectable player has a non-empty display name.
- At least two goalkeepers are available across the fixture.

Expose an internal `/ops/fixtures/:id/readiness` page showing raw lineup data, mapping output, unknown IDs, and all failed gates.

### 3.6 Provider capability registry

Keep an explicit registry checked into the repository and mirrored in the database:

```ts
type CapabilityState = "VERIFIED" | "SHADOW" | "DISABLED";

type TxLineCapability = {
  key:
    | "PLAYER_ROSTER"
    | "PLAYER_POSITION"
    | "STARTER_STATUS"
    | "SUBSTITUTION"
    | "GOAL"
    | "PENALTY_GOAL"
    | "PENALTY_MISS"
    | "OWN_GOAL"
    | "YELLOW_CARD"
    | "RED_CARD"
    | "MATCH_CLOCK"
    | "FINAL_SCORE";
  state: CapabilityState;
  parserVersion: string;
  capturedFixtureIds: string[];
  samplePayloadPaths: string[];
  verifiedAt: string | null;
  notes: string;
};
```

Rules:

- The scoring engine receives enabled capability flags; it does not inspect environment variables directly.
- A capability moves to `VERIFIED` only after a real raw payload, runtime schema, normalizer test, replay test, and correction test exist.
- `SHADOW` events appear only in protected diagnostics and telemetry. They cannot change user points, rank, settlement, or Telegram messages.
- The protected ops page must show capability states and the evidence fixture for each state.

### 3.7 Mandatory TxLINE support questions

Ask developer support early and preserve answers in `docs/txline/provider-notes.md`:

1. Exact `positionId` and `unitId` mappings for World Cup soccer.
2. Whether `dataSoccer.PlayerId` joins `fixturePlayerId` or another player identifier.
3. Exact `GoalType` value for an own goal.
4. Exact payload for a regulation/extra-time penalty miss, score, retake, and amendment.
5. How second-yellow dismissals are represented relative to yellow and red flags.
6. Whether `starter` and substitutions are amended after review.
7. Recommended field for canonical elapsed match time and stoppage time.
8. Whether lineup data is reliably available before the intended contest lock.

Provider answers do not replace captured integration tests; they define what to test.

## 4. Contest and fixture lifecycle

```text
DISCOVERED
  -> WAITING_FOR_PLAYER_DATA
  -> TEAM_BUILDING_OPEN
  -> LOCKED
  -> LIVE
  -> RECONCILING
  -> FINALIZED
  -> CLAIMABLE

Exceptional:
CANCELLED -> REFUNDABLE -> REFUNDED
VOIDED    -> REFUNDABLE -> REFUNDED
```

### State rules

**DISCOVERED**
- Created from fixture snapshot.
- Not yet visible as joinable.

**WAITING_FOR_PLAYER_DATA**
- Visible with a `Player list pending` status.
- Entry and team selection disabled.
- Worker polls snapshots and evaluates readiness.

**TEAM_BUILDING_OPEN**
- Complete eligible player list exists.
- Wallet can create/edit a draft, lock a team, and enter.

**LOCKED**
- New entries and team edits rejected by API and Solana program.
- All submitted team hashes frozen.

**LIVE**
- Match state indicates active play.
- SSE actions update point ledgers and leaderboards.

**RECONCILING**
- Match is finished, but the complete TxLINE sequence is replayed.
- Lineups, substitutions, final score, duplicate actions, and corrections are checked.

**FINALIZED**
- Ordered standings and payout amounts are immutable.
- Settlement root/hash is published to the Solana contest account.

**CLAIMABLE**
- Winners can claim; all users can inspect their final event ledger.

### Lock policy

Use two locks:

1. **User lock:** A user may press `Lock Team` after completing the XI. This immediately makes that submitted team immutable.
2. **Contest lock:** The platform closes all entries at `fixture_start_utc - 5 minutes` by default.

Do not default to a one-hour lock unless production captures prove complete player and position data consistently arrives earlier than one hour before kickoff. A formation game with a fake or incomplete roster is worse than a later lock.

Recommended user reminders:

```text
Player pool ready
Official starter flags updated, when received
30 minutes before lock
10 minutes before lock
2 minutes before lock
Team successfully locked
```

If official starter flags arrive after a draft was created, update badges and warn the user, but never silently replace a selected player. The user may edit until lock.

Server time and on-chain clock are authoritative. The client clock is display-only.

### Cancellation

Cancel and refund when any of the following occurs:

- TxLINE fixture becomes cancelled, abandoned, or coverage-cancelled before reliable settlement.
- Complete player data never arrives before the entry deadline.
- Fewer than the minimum entrants are confirmed.
- The score sequence cannot be reconciled within the configured settlement window.
- A material position/player-ID mapping error affected eligibility.

---

## 5. Formation and squad builder

### Enabled formations

```text
4-4-2  = 1 GK, 4 DEF, 4 MID, 2 FWD
4-3-3  = 1 GK, 4 DEF, 3 MID, 3 FWD
4-5-1  = 1 GK, 4 DEF, 5 MID, 1 FWD
3-5-2  = 1 GK, 3 DEF, 5 MID, 2 FWD
3-4-3  = 1 GK, 3 DEF, 4 MID, 3 FWD
5-3-2  = 1 GK, 5 DEF, 3 MID, 2 FWD
```

### Team invariants

A valid submission has:

- Exactly 11 unique fixture players.
- Counts exactly matching the chosen formation.
- Players only from the current fixture's two participants.
- No more than seven players from one participant.
- Exactly one captain selected from the 11.
- Exactly one vice-captain selected from the 11 and different from captain.
- No player marked ineligible by the readiness layer.
- The current scoring-rule and position-mapping versions.

### Two build modes

**Manual Build**

- User chooses formation and fills each slot.
- Position filters show only eligible players.
- Search works by player name, team, and roster number.

**Quick Pick**

- Produces a valid XI in one tap.
- Prefers confirmed starters when starter flags are available.
- Otherwise selects only eligible mapped players and labels starter status unknown.
- Respects formation, uniqueness, and maximum-seven-per-team constraints.
- Uses a wallet-and-contest seeded shuffle so every user does not receive the identical XI.
- Never auto-locks. The user must review captain, vice-captain, and confirm.

### Player-card information

Show only grounded fields or application-derived values:

```text
Preferred name
Real team
Position group
Roster number, when present
Confirmed starter / bench / status unknown
Selection percentage in this contest
Captain percentage in this contest
Current fantasy points during live play
Minutes played or current active interval
Clean-sheet state for GK/DEF/MID
Next milestone, such as “8 minutes to 60”
```

Selection and captain percentages come from your own contest database, not TxLINE.

Do not label a player `Starting` because they merely appear in a lineup array. Use the verified `starter` interpretation only.

### Team creator engagement

Before lock, show:

- Formation completeness.
- Team split, such as `Spain 6 · Belgium 5`.
- Confirmed starters count.
- Captain and vice-captain expected multiplier behavior.
- Exact point rules relevant to each selected position.
- Warnings for selected players marked bench or status unknown.
- A readable `What can change your score?` summary.

During the match, transform the same pitch into `Your Live XI`:

- Active players glow or receive an `On pitch` badge.
- Substituted/off players show their finalized active interval.
- Each player card shows point breakdown, not only a total.
- Captain and vice-captain status is always visible.
- Clean-sheet points are labelled provisional until protected/final.

### Validation UX

- Disable invalid additions with an exact explanation.
- Persist an autosaved server draft.
- Show a validation checklist before lock.
- Require explicit confirmation because locking is irreversible.
- After lock, show the canonical team hash and Solana transaction link.
- Never silently replace, remove, or re-position a player.

### Team commitment

Canonicalize and hash:

```json
{
  "contestId": "...",
  "wallet": "...",
  "formation": "4-3-3",
  "playerIds": ["sorted fixture player IDs"],
  "captainId": "...",
  "viceCaptainId": "...",
  "scoringVersion": "v1.0.0",
  "positionMappingVersion": "..."
}
```

Store canonical JSON in the database and the hash in the Solana entry account. A later database edit cannot silently alter an entered team.

## 6. Fantasy scoring v1

Scoring is deterministic, versioned, explainable, replayable, and limited to verified TxLINE fields.

### 6.1 Published scoring table

| Fantasy action | GK | DEF | MID | FWD | TxLINE requirement |
|---|---:|---:|---:|---:|---|
| Starts the match | +1 | +1 | +1 | +1 | Confirmed starter when match begins |
| Substitute enters | +1 | +1 | +1 | +1 | Confirmed `PlayerInId` substitution |
| Completes 60 active minutes | +1 | +1 | +1 | +1 | Canonical match time plus participation intervals |
| Goal | +6 | +6 | +5 | +4 | Confirmed goal with resolved scorer; not penalty shootout |
| Penalty goal | +6 | +6 | +5 | +4 | Confirmed regulation/extra-time penalty with `Scored`; no extra bonus |
| Penalty miss | -2 | -2 | -2 | -2 | Confirmed `Missed`, resolved taker, not shootout; capability verified |
| Own goal | -2 | -2 | -2 | -2 | Verified own-goal `GoalType`; capability verified |
| Yellow card | -1 | -1 | -1 | -1 | Confirmed yellow-card action |
| Direct red card | -3 | -3 | -3 | -3 | Confirmed direct red-card action |
| Clean sheet after 60+ active minutes | +4 | +4 | +1 | 0 | No goal conceded during player's active interval |
| Every second goal conceded while active | -1 | -1 | 0 | 0 | Confirmed opponent/own goal affecting player's team while active |

A penalty goal is represented by the `PENALTY_GOAL_*` rule code for explainability but receives the normal position-based goal value. Penalty-shootout kicks never award or deduct fantasy points.

### 6.2 Scoring rule codes

```text
STARTING_APPEARANCE
SUBSTITUTE_APPEARANCE
APPEARANCE_60_REACHED
GOAL_GK
GOAL_DEF
GOAL_MID
GOAL_FWD
PENALTY_GOAL_GK
PENALTY_GOAL_DEF
PENALTY_GOAL_MID
PENALTY_GOAL_FWD
PENALTY_MISS
OWN_GOAL
YELLOW_CARD
DIRECT_RED_CARD
SECOND_YELLOW_ADJUSTMENT
CLEAN_SHEET_GK
CLEAN_SHEET_DEF
CLEAN_SHEET_MID
CLEAN_SHEET_REVERSAL
GOALS_CONCEDED_GK_DEF
CAPTAIN_MULTIPLIER
VICE_CAPTAIN_FALLBACK
FINAL_RECONCILIATION_ADJUSTMENT
```

### Scoring engine contract

```ts
type ProjectEventInput = {
  fixtureState: FixtureScoringState;
  event: NormalizedSoccerEvent;
  lockedTeams: LockedFantasyTeam[];
  rules: ScoringRulesV1;
  capabilities: CapabilityRegistrySnapshot;
};

type ProjectEventResult = {
  nextFixtureState: FixtureScoringState;
  ledgerRows: FantasyLedgerRow[];
  affectedEntryIds: string[];
  rankChanges: RankChange[];
  notificationIntents: NotificationIntent[];
};
```

Processing order for one accepted provider event:

```text
persist raw event
  -> normalize and persist normalized event
  -> update player/match state
  -> create/reverse ledger rows
  -> update entry totals
  -> recompute affected ranks
  -> insert notification intents
  -> commit
  -> dispatch web push/SSE and Telegram outbox
```

The database transaction must make ledger, totals, ranks, and notification intents agree. External network calls happen only after commit.

### 6.3 Participation intervals

Build a canonical interval per player from verified provider events:

- Confirmed starter: interval begins at match elapsed second `0`.
- Confirmed substitute: interval begins at the substitution event's canonical elapsed time.
- Substituted-out player: interval ends at the substitution event time.
- Red-carded player: interval ends at the red-card event time for clean-sheet and goals-conceded calculations.
- Active player at final whistle: interval ends at canonical match end.

Rules:

- Award `STARTING_APPEARANCE +1` when a confirmed starter enters at kickoff.
- Award `SUBSTITUTE_APPEARANCE +1` when a confirmed substitute enters later.
- A player can receive only one of these appearance-entry rules.
- Award `APPEARANCE_60_REACHED +1` once when cumulative active time reaches 3,600 seconds.
- A player with 59:59 active time does not receive the 60-minute point.
- Stoppage and extra time use the provider's canonical elapsed time. Preserve period and raw minute values for audit.
- Extra-time participation and match events count in the contest.
- Penalty shootout actions do not count as participation scoring events.
- Live minutes are provisional until full-sequence reconciliation.

Implement a `MatchTimeNormalizer` with contract tests. Do not subtract timestamps naïvely across halftime or extra-time transitions.

### 6.4 Goal handling

Score a goal only when all are true:

1. Event is confirmed or provider state says final for the action.
2. Scorer resolves to one fixture player.
3. Scorer's participant/team relationship is valid.
4. Period is regulation or extra time, not `PE` penalty shootout.
5. Event has not been overturned, replaced, or superseded.

A goal immediately creates:

- Scorer goal points.
- Captain multiplier when applicable.
- A goal-conceded update for eligible opposition GK/DEF players active at that moment.
- Potential clean-sheet reversals for opposition players whose clean sheet is not already protected.
- Personal impact cards and notification-outbox rows after commit.

### 6.5 Penalty goals, misses, and retakes

- `Scored`: award normal position goal points with a penalty-specific explanation.
- `Missed`: deduct 2 only when the exact outcome and taker ID are verified.
- `Retake`: the original attempt has no final fantasy effect. Reverse an earlier provisional miss/goal when TxLINE amends or links it to a retake.
- Penalty shootout attempts are displayed as neutral match events only.
- If the exact World Cup payload is ambiguous, keep penalty misses in `SHADOW`; do not settle contests using inferred misses.

### 6.6 Own goals

- Deduct 2 from the verified own-goal scorer.
- Count the goal as conceded by the scorer's real team for clean-sheet and conceded-goal rules.
- Never infer an own goal from participant mismatch, commentary text, or score direction.
- Enable only after the exact `GoalType` mapping is captured and tested.

### 6.7 Cards and second-yellow behavior

- Ordinary yellow card: `-1`.
- Direct red card: `-3`.
- Second-yellow dismissal: cumulative card deduction for the match becomes `-3`, not `-4`.
  - If the first yellow already produced `-1`, apply an additional `-2` using `SECOND_YELLOW_ADJUSTMENT`.
  - Do not also apply a separate direct-red `-3` for the same dismissal.
- An amended or overturned card creates reversal ledger rows.

### 6.8 Clean-sheet state machine

Clean-sheet points are player-interval based, not simply final-team-score based.

```text
INELIGIBLE       player has not reached 60 active minutes
PROVISIONAL      60+ minutes reached and zero goals conceded while active
PROTECTED        player left after 60+ with zero conceded; later goals do not remove it
BROKEN           at least one goal conceded during active interval
FINAL            full replay confirmed the state
```

Behavior:

1. At 60 active minutes, award provisional clean-sheet points if conceded count is zero.
2. If an opponent scores while the player is still active, reverse provisional clean-sheet points immediately.
3. If the player leaves after 60 with zero conceded, mark the clean sheet `PROTECTED`.
4. If the team concedes after a protected player left, do not reverse that player's clean sheet.
5. At finalization, replay all intervals and goals, then confirm or correct the result.

This creates engaging but honest live point gains and losses. Every provisional award must be visibly labelled.

### 6.9 Goals-conceded deductions

For each GK/DEF player, count confirmed goals conceded by their team during their active interval.

```text
0-1 conceded:  0
2-3 conceded: -1
4-5 conceded: -2
6-7 conceded: -3
```

Apply a new `-1` ledger row whenever the count crosses an even threshold. If a goal is overturned, reverse the corresponding threshold row and restore clean-sheet state when valid.

### 6.10 Captain and vice-captain

- Captain receives `2x` all positive and negative ledger deltas.
- The multiplier applies to appearance, goals, penalty misses, cards, own goals, clean sheets, clean-sheet reversals, and goals-conceded deductions.
- Vice-captain stays at `1x` during live play.
- Vice-captain activates only when final replay proves the captain recorded zero active seconds.
- Activation adds an extra copy of the vice-captain's finalized base ledger, making their final multiplier `2x`.
- If captain plays even one second, vice-captain does not activate.
- UI must show `Vice-captain on standby` until final determination.

### 6.11 Provisional versus final points

**Immediate/provisional**

- Appearance entry.
- 60-minute milestone.
- Confirmed goals and penalty goals.
- Verified penalty misses.
- Cards.
- Own goals.
- Clean-sheet awards/reversals.
- Goals-conceded threshold deductions.

**Final-only authority**

- Exact participation intervals.
- Vice-captain activation.
- Protected/final clean sheets.
- Corrected goals/cards/penalties.
- Final leaderboard and payout.

### 6.12 Event ledger

Every points change creates immutable rows:

```text
entry_id
fixture_id
player_id
source_event_key
source_revision
rule_code
base_points
multiplier
applied_points
provisional
explanation_payload
running_entry_total
created_at
reversed_by_ledger_id
```

`explanation_payload` contains structured facts used by web and Telegram:

```json
{
  "minute": 67,
  "period": "H2",
  "playerName": "...",
  "teamName": "...",
  "actionLabel": "Second-yellow dismissal",
  "calculation": "-1 already applied; -2 adjustment; captain ×2",
  "oldTotal": 45,
  "newTotal": 41,
  "oldRank": 5,
  "newRank": 12
}
```

Corrections append compensating and replacement rows. Never mutate historical points in place.

### 6.13 Ranking and ties

Order entries by:

1. Highest finalized fantasy points.
2. Highest non-captain base points.
3. Most selected-player goals.
4. Earliest confirmed team-lock timestamp.
5. Stable entry hash ascending.

Publish the policy before entry. Live rank is always labelled provisional.

### 6.14 Final participation and clean-sheet reconciliation

After `game_finalised`/reliable final state:

1. Fetch the full TxLINE sequence.
2. Rebuild lineups, starter states, substitutions, player intervals, goals, goal types, penalties, cards, and final score from zero.
3. Recompute every entry using the locked scoring version.
4. Compare semantic ledger checksum, player totals, entry totals, and ranks with the live projection.
5. Append correction rows for every mismatch.
6. Re-evaluate captain minutes and vice-captain activation.
7. Finalize clean sheets and goals-conceded thresholds.
8. Freeze standings only when unresolved scoring-relevant actions equal zero.
9. Publish settlement and payout roots.

Any unresolved player ID, own-goal type, penalty outcome, correction, or interval that could change the top three blocks settlement and triggers an operations alert.

## 7. Live experience

### 7.1 Live match centre

The match page updates without refresh and shows:

- Match phase, score, and canonical delayed/live clock.
- Actual TxLINE service configuration and observed feed health.
- User's provisional points and rank.
- Official global leaderboard.
- `Your Live XI` on a pitch.
- Player point breakdowns and active-minute milestones.
- Personal event-impact timeline.
- Neutral match timeline for events that did not affect the user's XI.
- Odds-powered Market Pulse when available.
- Feed state: connected, reconnecting, reconciling, stale, or final.

### 7.2 Personal event-impact cards

This is the visual centerpiece. Every card uses committed ledger data.

```text
60' MILESTONE — Rodri
Reached 60 active minutes
+1 base · Captain ×2 = +2
Team total: 33 -> 35
Rank: #14 -> #10
Clean-sheet tracker: +1 provisional for MID
```

```text
67' GOAL — Lamine Yamal
Goal points: +5
Captain multiplier: ×2
Your change: +10
Team total: 42 -> 52
Rank: #18 -> #4
Market Pulse: Spain win probability 48% -> 71%
```

```text
74' GOAL CONCEDED
Your active defender's provisional clean sheet was broken
Clean sheet reversal: -4
Second conceded goal threshold: -1
Team total: 51 -> 46
Rank: #5 -> #13
```

Cards must clearly distinguish:

- Base rule points.
- Multiplier.
- Reversal/correction.
- Old and new total.
- Old and new rank.
- Provisional or final status.

### 7.3 Fantasy Pulse

Combine TxLINE score events, application scoring, and StablePrice odds in one explainable experience:

```text
Pitch event
Fantasy impact on your XI
Leaderboard movement
Market movement
TxLINE verification receipt
```

Odds are information only. They never affect fantasy points, rank, or payout.

### 7.4 Live XI engagement

For each selected player, show:

- On pitch / bench / substituted / sent off / finished.
- Active minutes.
- Current points and rule breakdown.
- Next 60-minute milestone countdown when reliable.
- Goals-conceded counter for GK/DEF.
- Clean-sheet state.
- Captain or vice-captain state.

Add a compact team summary:

```text
8 players active
3 appearances secured
5 players past 60 minutes
2 provisional clean sheets
Captain active
```

### 7.5 Shareable result card

After finalization, generate an image/card containing:

```text
Fixture
Final fantasy points
Final rank and entrant count
Captain
Best-performing selected player
Prize, when won
Powered by TxLINE · settled on Solana devnet
```

Do not expose full wallet addresses. The share card is a growth loop and a demo artifact.

### 7.6 Stale-feed behavior

- Determine thresholds from configured sampling interval plus tolerance; do not use one hardcoded value for every service level.
- Show `Feed delayed` when observed age exceeds the threshold.
- Never fabricate clock movement or match actions.
- Recover through snapshot/current/full sequence endpoints.
- Suppress score DMs while event order is uncertain.
- After recovery, send one concise reconciliation summary instead of a burst of stale messages.

## 8. Telegram companion bot

Telegram is optional, DM-only, and built from the same committed ledger as the web app.

### 8.1 Account linking

```text
User starts bot
  -> bot creates one-time link token
  -> user opens external web app
  -> user authenticates with Solana wallet
  -> backend binds Telegram user ID to wallet-backed account
  -> bot confirms connection
```

Security:

- Token expires in 10 minutes.
- Single use and bound to Telegram user ID.
- Linking requires an authenticated wallet session.
- Relinking or unlinking requires a fresh wallet signature.
- No Telegram token in browser local storage.

### 8.2 Commands

```text
/start     Explain product and linking
/link      Create secure linking URL
/today     Show today's TxLINE-covered contests
/team      Show locked XI and captain for the next/live fixture
/points    Show current points, rank, and latest impact
/settings  Configure reminders and point-impact categories
/unlink    Remove Telegram association
/stop      Disable proactive messages
```

Every team, wallet, stake, lock, or claim action deep-links to the external web app.

### 8.3 Pre-match DMs

- Player pool available.
- Confirmed starter flags updated.
- Selected captain is not marked starter, when reliably known.
- Draft incomplete before lock.
- 30-, 10-, and 2-minute lock reminders.
- Team locked and entry confirmed on devnet.

### 8.4 Live point-impact DMs

Send only after the fantasy ledger transaction commits. Supported messages include:

```text
✅ KICKOFF — <Player> started
+1 appearance point
Total: 7 -> 8
```

```text
⏱ 60' — <Player> reached 60 active minutes
+1 milestone point
+4 provisional clean-sheet points
Captain ×2 applied
Total: 29 -> 39
Rank: #20 -> #8
```

```text
⚽ 67' — <Player> scored a penalty
+5 goal points · Captain ×2 = +10
Total: 42 -> 52
Rank: #18 -> #4
```

```text
🧤 CLEAN SHEET LOST
Opponent scored while <Defender> was active
-4 clean-sheet reversal
Total: 51 -> 47
Rank: #5 -> #11
```

```text
🟥 78' — <Player> dismissed for a second yellow
-2 adjustment after the earlier -1 yellow
Captain ×2: -4
Total: 40 -> 36
```

### 8.5 Final and correction DMs

- Match finished; reconciliation started.
- Final participation and clean-sheet checks completed.
- Vice-captain activated, with calculation.
- Official feed correction changed a prior impact.
- Final total, rank, best player, and share card.
- Prize amount and claim link, or non-winning recap.

### 8.6 Notification controls

- Explicit opt-in after linking.
- Separate toggles for reminders, point impacts, rank changes, reconciliation, and final results.
- Deduplicate by `(telegram_user_id, source_event_key, notification_type, revision)`.
- Aggregate multiple ledger rows caused by one provider event into one DM.
- Throttle noisy rank changes; always send point-changing actions, but rank-only messages only for meaningful thresholds such as entering/leaving top 10 or prize positions.
- Respect Telegram rate limits with retry and dead-letter handling.
- Never send secrets, complete wallet addresses, or private contest data to group chats.

## 9. Solana architecture

### 9.1 Wallet authentication

Use Sign-In With Solana-style challenge authentication:

1. Backend issues nonce, domain, wallet, issued-at, and expiry.
2. Wallet signs the exact message.
3. Backend verifies signature and nonce.
4. Backend creates an HTTP-only secure session.

Authentication signatures do not move funds.

### 9.2 Fantasy pool program

Use an Anchor program with these PDAs:

```text
ContestPda    = ["contest", fixture_id, stake_tier]
VaultPda      = ["vault", contest_pda]
EntryPda      = ["entry", contest_pda, wallet]
SettlementPda = ["settlement", contest_pda]
```

Suggested instructions:

```text
create_contest
open_contest
enter_contest(team_hash)
lock_contest
cancel_contest
publish_settlement(standings_root, payout_root, totals)
claim_prize(proof)
claim_refund
close_contest
```

### 9.3 Program invariants

- Entry amount exactly equals contest stake.
- One `EntryPda` per wallet per contest.
- Entry rejected at or after `lock_ts`.
- Entry contains immutable team hash.
- Vault authority is program-derived, never an operator wallet.
- Published payout total cannot exceed distributable vault balance.
- Claims are idempotent.
- Refund and prize claim are mutually exclusive.
- Settlement can only be published once unless the contest is in an explicit pre-claim correction window.
- No administrator can withdraw participant funds.

### 9.4 Settlement trust model for hackathon

For the hackathon, use an operator settlement key to publish a Merkle root of finalized entry totals and payouts after deterministic off-chain replay.

Make it auditable:

- Public scoring version.
- Public raw-event hashes.
- Public final ledger export.
- Public standings root.
- On-chain team hash per entry.
- TxLINE proof references where available.

Post-hackathon, evaluate on-chain verification of selected score-stat proofs and multi-signer settlement.

---

## 10. Data model

Minimum tables:

```text
users
wallet_challenges
sessions
telegram_links
notification_preferences
fixtures
fixture_participants
fixture_players
position_mapping_versions
contests
contest_entries
team_drafts
locked_teams
locked_team_players
raw_txline_messages
normalized_match_events
match_event_revisions
player_intervals
fantasy_ledger
entry_totals
leaderboard_snapshots
settlements
payouts
claims
notification_outbox
provider_cursors
reconciliation_runs
```

Important uniqueness constraints:

```text
users.wallet_address UNIQUE
telegram_links.telegram_user_id UNIQUE
telegram_links.user_id UNIQUE
fixtures.txline_fixture_id UNIQUE
fixture_players(fixture_id, fixture_player_id) UNIQUE
contest_entries(contest_id, user_id) UNIQUE
locked_team_players(locked_team_id, fixture_player_id) UNIQUE
normalized_match_events(fixture_id, source_event_key, revision) UNIQUE
fantasy_ledger(entry_id, source_event_key, rule_code, source_revision) UNIQUE
notification_outbox(user_id, source_event_key, type, revision) UNIQUE
claims(contest_entry_id) UNIQUE
```

---

## 11. API surface

Representative routes:

```text
POST   /api/auth/solana/challenge
POST   /api/auth/solana/verify
POST   /api/auth/logout

GET    /api/fixtures/today
GET    /api/fixtures/:fixtureId
GET    /api/fixtures/:fixtureId/players
GET    /api/fixtures/:fixtureId/readiness

GET    /api/contests/:contestId
POST   /api/contests/:contestId/draft
POST   /api/contests/:contestId/validate-team
POST   /api/contests/:contestId/lock-team
POST   /api/contests/:contestId/entry-transaction
GET    /api/contests/:contestId/my-entry
GET    /api/contests/:contestId/leaderboard
GET    /api/contests/:contestId/events
GET    /api/contests/:contestId/settlement
POST   /api/contests/:contestId/claim-transaction

POST   /api/telegram/link-token
DELETE /api/telegram/link
PATCH  /api/telegram/preferences

GET    /api/replay/fixtures/:fixtureId
POST   /api/replay/fixtures/:fixtureId/start
```

All write routes repeat domain validation server-side. UI validation is convenience only.

---

## 12. Hackathon differentiators

Complete P0 before adding these. The goal is not maximum scope; it is a memorable, fully working TxLINE experience.

### Judging criteria implementation matrix

| TxLINE criterion | Product evidence | Demo evidence | Failure condition |
|---|---|---|---|
| Fan accessibility and UX | Quick Pick, familiar formations, clear player cards, one-screen point explanations, mobile-first flow | A new user creates and locks a valid XI in under 90 seconds | Judge needs protocol knowledge or cannot finish on mobile |
| Real-time responsiveness | SSE ingestion, Live XI, milestones, point animations, rank changes, Telegram DMs | One real replay action changes player points, total, rank, odds context, and DM without refresh | Static dashboard or delayed manual refresh |
| Originality and value | Personal consequence engine and Fantasy Pulse | Same pitch event shown as match action + fantasy impact + rank + market movement | Looks like a generic Dream11 clone |
| Commercial path | Official sponsored contests, optional entry pools, season table, white-label tournament engine | Explain one credible sponsor/league deployment in 15 seconds | Monetization depends only on illegal/unreviewed wagering |
| Completeness and execution | Start-to-claim P0 loop, replay, corrections, reconciliation, devnet settlement | Judge completes onboarding, team, scoring, finalization, and claim | Mock data, manual DB edits, broken finalization, or incomplete claim |

### Hackathon quality bar

The release candidate must meet all of these:

```text
Team creation median time <= 90 seconds in usability tests
Point projection <= 2 seconds after an event is accepted by the backend
No duplicate ledger rows across reconnect/replay tests
No duplicate Telegram DMs across retries
Incremental and full-replay checksums identical
Zero unresolved scoring-relevant actions before settlement
Core path works at 320px mobile width
Fresh deployment can run Judge Mode without manual database edits
Demo replay reaches final claim in under 3 minutes at accelerated speed
```

### Commercial path

Lead with fan engagement, not gambling:

1. Sponsor-funded free contests with branded prize pools.
2. Tournament season passes and premium analytics/notification preferences.
3. White-label fantasy modules for football communities, media companies, and fan apps.
4. Jurisdiction-reviewed entry-fee contests only after legal and smart-contract review.
5. Post-hackathon expansion to additional TxLINE competitions without changing the normalized fantasy engine.

### P1: Historical TxLINE Replay Theatre — mandatory for judging

Use the complete historical TxLINE sequence, never fabricated actions.

- Select a completed covered fixture.
- Load real players, positions, lineups, actions, score, and odds history when available.
- Let a judge build or use a seeded valid XI.
- Replay at `1x`, `4x`, and `10x`.
- Run the same normalizer, scoring engine, impact cards, leaderboard, Telegram sandbox preview, and reconciliation used in live mode.
- Display `Historical TxLINE replay` permanently.
- Provide deterministic `Reset replay` behavior.

This is essential because judging may happen when no match is live.

### P1: Judge Mode

Provide a protected or clearly labelled demo route that:

1. Uses a real historical TxLINE fixture.
2. Seeds at least three deterministic contest entries so ranks visibly move.
3. Gives the judge a valid editable XI or one-click Quick Pick.
4. Replays goal, card, substitution, 60-minute, clean-sheet, and conceded-goal consequences.
5. Shows a Telegram message preview even if the judge does not link Telegram.
6. Ends in final settlement and a devnet claim.

Judge Mode may seed users and teams, but match data and scoring actions must remain real TxLINE data.

### P1: TxLINE Verified Event Receipt

For events/proofs supported by TxLINE:

- Show `Verified by TxLINE`.
- Display fixture ID, provider sequence, provider timestamp, content hash, proof status, and Solana root/transaction reference.
- Keep proof verification asynchronous so it cannot block live scoring UX.
- Link every receipt back to the exact fantasy ledger rows it caused.

### P1: Fantasy Pulse with StablePrice odds

After a goal, card, or other major event, show temporal odds movement beside fantasy impact:

```text
Before event: Team A implied chance 42%
After event:  Team A implied chance 68%
Market move: +26 percentage points
Your fantasy move: +10 points, rank #18 -> #4
```

Use the nearest valid snapshot before and after the event. Label unavailable or delayed odds. Never let odds affect scoring.

### P1: Quick Pick and fan onboarding

- `Build manually` and `Quick Pick` are equally prominent.
- Explain formation and captaincy in one short onboarding screen.
- Add a 30-second interactive tutorial for first-time users.
- Use fan language, not oracle/PDA/Merkle jargon.

### P1: Shareable final card

Generate a mobile share image for X, Telegram, and WhatsApp with final score, rank, captain, best player, and TxLINE branding/provenance.

### P1: World Cup Season Table

Maintain a free cumulative leaderboard across all entered fixtures:

- Total finalized fantasy points.
- Best single-match score.
- Captain hit rate.
- Match participation streak.
- Top-three finishes.
- Shareable profile card.

This improves retention across the tournament without changing per-match payout rules.

### P2: Grounded AI Pundit

Generate one sentence from structured facts:

```text
“Your captain's penalty moved you into the prize positions while Spain's market probability jumped 23 points.”
```

- Template-first.
- LLM enhancement only after P0/P1.
- Reject any output containing a player, score, minute, odds value, or fantasy value absent from structured inputs.
- Optional TTS only after text grounding tests pass.
- No betting advice.

### Explicitly post-hackathon

- Private leagues.
- Mainnet real-money staking.
- Multiple paid stake tiers.
- User-generated contests.
- Rich metrics from a second provider.
- Social chat and following systems.

## 13. Frontend pages

```text
/                         Landing + today's fixtures
/matches/:fixtureId       Match and contest overview
/matches/:fixtureId/team  Formation and squad builder
/matches/:fixtureId/live  Live match centre and personal impact feed
/matches/:fixtureId/result Final team, ledger, rank, and claim
/leaderboard              World Cup cumulative table
/profile                  Wallet, Telegram link, entries, notifications
/replay                    Historical TxLINE replay theatre
/rules                     Scoring, tie, cancellation, and payout rules
/ops                       Protected provider/readiness diagnostics
```

Mainstream fan UX requirements:

- Apply the Daze brand system from Section 1.1; do not invent page-specific palettes.
- Explain wallet steps in football language, not protocol jargon.
- Mobile-first tap targets and one-handed interaction.
- Team builder must be usable without horizontal scrolling.
- Keep data-heavy gameplay on solid high-contrast surfaces; reserve the brand gradient for emotional/marketing moments.
- Show empty/loading/error/stale/reconnecting/correction states for every provider-dependent screen.
- Never show raw enum IDs to normal users.
- Always distinguish provisional live points from finalized points.
- Support Light, Dark, and System themes without changing information hierarchy.
- Every positive/negative/rank state uses iconography and explicit values in addition to colour.

---

## 14. Workers and scheduled jobs

```text
fixture-importer
player-readiness-poller
score-sse-consumer
score-gap-recovery
match-event-normalizer
fantasy-projector
leaderboard-projector
telegram-notifier
match-finalizer
settlement-publisher
claim-reconciler
replay-session-runner
provider-health-monitor
```

Job guarantees:

- At-least-once delivery safe.
- Idempotency key on every job.
- Dead-letter queue with inspect/retry tools.
- Per-fixture ordering for score projection.
- No Telegram message sent before the scoring transaction commits.

---

## 15. Testing strategy

### 15.1 Golden scoring scenarios

Create human-readable golden fixtures that specify raw normalized events, expected player intervals, ledger rows, totals, and notifications.

Required scenarios:

1. Starter plays 90 minutes: +1 entry, +1 at 60.
2. Substitute enters at 30 and reaches 60 active minutes in extra time.
3. Substitute enters but plays under 60.
4. Position-aware goal for GK, DEF, MID, and FWD.
5. Regulation penalty scored.
6. Penalty missed.
7. Penalty miss followed by retake and score.
8. Own goal with conceded-goal impact.
9. Yellow card.
10. Direct red card.
11. First yellow followed by second-yellow dismissal; cumulative card deduction equals -3.
12. GK/DEF provisional clean sheet at 60, then reversal after goal conceded.
13. Defender leaves after 60 at 0-0, then team concedes; clean sheet remains protected.
14. Player concedes second and fourth goals while active; two deductions.
15. Goal overturned by VAR/action amendment.
16. Captain receives doubled positive and negative deltas.
17. Captain zero minutes; vice-captain activates at final.
18. Captain plays one second; vice-captain does not activate.
19. Penalty shootout goal/miss creates zero fantasy points.
20. Full live projection equals full replay.

### 15.2 Unit tests

- Every formation and invalid position count.
- Maximum-seven-per-team rule.
- Manual and Quick Pick validity.
- Captain and vice-captain invariants.
- Match-time normalization across H1, HT, H2, ET1, HTET, ET2, and final.
- Participation interval merging and thresholds.
- Every scoring rule and reversal.
- Clean-sheet state machine.
- Goals-conceded thresholds.
- Second-yellow semantics.
- Tie-breaking.
- Team canonicalization and hash stability.
- Position mapping conflicts and unknown IDs.

### 15.3 Provider contract tests

Capture real TxLINE JSON for:

- Pre-match snapshot with both teams and positions.
- Confirmed starters and substitutes.
- Match start and clock updates.
- Substitution.
- Goal and penalty goal.
- Penalty miss/retake if available.
- Own goal if available.
- Yellow card, direct red, and second-yellow flow.
- Halftime, extra time, shootout, and game finalization when available.
- Action amendment/VAR overturn.
- Cancelled or coverage-cancelled fixture.

Contract tests prove:

- Action IDs resolve to intended fixture players.
- Position mapping is correct.
- Penalty and goal-type enums are exact.
- Sequence and revision identity remain stable.
- Unknown values fail closed.

### 15.4 Integration tests

- Fixture import to readiness.
- Service-level matrix read and delay label.
- Wallet login to draft, Quick Pick/manual build, lock, and entry.
- Duplicate SSE event creates no duplicate points or DM.
- Sequence gap triggers recovery and converges.
- Correction reverses points and rank.
- Live/replay semantic checksums match.
- Settlement equals vault balance.
- Claim and refund cannot both succeed.
- Notification outbox is inserted only after score commit.

### 15.5 End-to-end judged path

Automate:

1. Connect wallet.
2. Open a ready real/historical fixture.
3. Quick Pick or manually create a valid XI.
4. Choose captain and vice-captain.
5. Lock and enter.
6. Run real TxLINE replay.
7. Observe appearance, 60-minute, goal/card, clean-sheet, and conceded-goal impacts.
8. Observe leaderboard movement.
9. Observe Telegram test-bot or sandbox preview.
10. Reconcile final totals.
11. Publish settlement.
12. Claim a devnet prize.
13. Generate share card and inspect verification receipt.

Run this test from a fresh database snapshot before every demo recording and deployment.

### 15.6 Load and failure tests

- One goal affecting thousands of entries.
- SSE reconnect storm and duplicate delivery.
- Provider gap during a scoring action.
- TxLINE stale feed.
- Telegram rate limits.
- Database failure between raw persistence and projection.
- Solana RPC timeout during entry, settlement, and claim.
- Reconciliation mismatch that blocks settlement.

### 15.7 Visual, brand, and UX QA

Test mobile widths `320`, `375`, `390`, and `430` pixels in both warm light and match-night dark themes.

- Daze wordmark uses the approved asset and is never reconstructed from a font.
- No raw hex colours appear in feature components; semantic tokens are used.
- Brand gradient is absent from dense tables, forms, squad lists, and live data surfaces.
- Formation is usable with one hand.
- No horizontal scrolling in the core path.
- Point changes animate without layout jumps.
- Reduced-motion mode preserves the same information.
- Provisional/final labels are readable.
- Loading, empty, stale, reconnecting, and correction states exist.
- Colour is not the only status indicator.
- Core actions are keyboard accessible and have a visible focus ring.
- Text and controls meet WCAG AA contrast.
- 200% text scaling does not block team lock, contest entry, or prize claim.
- Wallet errors are explained in fan language.
- Screenshot regression covers landing, fixture card, team builder, live impact card, leaderboard, result/share card, and Telegram preview.

## 16. Observability

Required metrics:

```text
txline_stream_connected
txline_last_event_age_seconds
txline_sequence_gap_total
txline_unknown_position_id_total
txline_unresolved_player_action_total
fixture_readiness_state
normalized_event_total
scoring_projection_latency_ms
scoring_correction_total
leaderboard_projection_latency_ms
telegram_delivery_success_total
telegram_delivery_failure_total
settlement_replay_mismatch_total
solana_entry_confirmation_seconds
solana_claim_confirmation_seconds
```

Required alerts:

- Unknown player position IDs for a contest approaching lock.
- Goal/card action cannot resolve to a lineup player.
- Stream stale beyond threshold.
- Live and replay totals differ.
- Settlement payout sum mismatch.
- Vault balance mismatch.
- Elevated Telegram failures.

---

## 17. Security and legal boundaries

- Never request or store seed phrases/private keys.
- TXLine credentials remain server-side.
- Telegram bot token remains server-side.
- Secure, HTTP-only, same-site session cookies.
- CSRF protection on state-changing HTTP routes.
- Rate-limit wallet challenges and Telegram linking.
- Validate all provider JSON at runtime.
- Use devnet and valueless test tokens for the hackathon.
- Present staking as a technical demonstration, not a real-money product.
- Add age/jurisdiction/legal notices before any mainnet launch.
- Mainnet requires independent smart-contract audit, legal review, abuse controls, and operational runbooks.

---

## 18. Delivery sequence

### Phase 0 — Provider proof spike; no UI assumptions

Deliverables:

- Devnet SL1 subscription and activation script.
- On-chain service-row inspection and persisted sampling interval.
- Fixture snapshot capture.
- Score snapshot and full-sequence capture.
- Real player list for both teams.
- Verified player-action ID joins.
- Verified `positionId`/`unitId` mapping.
- Goal, card, substitution, and match-clock payloads.
- Exact support questions sent for own goals, penalties, second yellow, and timing.
- Capability registry initialized.

**Exit gate:** A CLI/replay test builds player intervals and scores at least appearance, goal, card, and substitution from real TxLINE data.

### Phase 1 — Read-only fan experience

- Fixture importer and readiness worker.
- Today page and match page.
- Real player cards with position and starter status.
- Protected readiness/capability diagnostics.
- TxLINE health and latency badges.

**Exit gate:** A covered fixture shows a real, complete, position-filtered player pool.

### Phase 2 — Team creation

- Solana authentication.
- Formation selector.
- Manual Build and Quick Pick.
- Autosaved draft.
- Captain/vice-captain.
- Validation summary and player warnings.
- Team lock and canonical hash.

**Exit gate:** A valid XI locks; every invalid XI is rejected with a precise reason.

### Phase 3 — Devnet contest entry

- Fantasy-pool Anchor program.
- Fixed-stake official contest.
- Entry transaction and vault reconciliation.
- Cancellation/refund path.

**Exit gate:** At least three wallets enter; on-chain hashes and vault totals reconcile.

### Phase 4 — Scoring engine before live UI polish

- Match-time normalizer.
- Player participation intervals.
- Complete scoring table.
- Append-only ledger and reversals.
- Clean-sheet state machine.
- Captain and final vice-captain logic.
- Golden scoring scenarios.

**Exit gate:** All golden scenarios pass and full replay equals incremental projection.

### Phase 5 — Live consequence engine

- SSE consumer and gap recovery.
- Personal event-impact cards.
- Live XI and milestones.
- Leaderboard projections.
- Fantasy Pulse odds context.
- Correction UX.

**Exit gate:** One real TxLINE replay visibly changes points, rank, clean-sheet state, and conceded-goal deductions without refresh.

### Phase 6 — Telegram retention companion

- Link flow and preferences.
- Lock reminders.
- Appearance, milestone, goal, card, clean-sheet, correction, and final DMs.
- Idempotency, throttling, and dead letters.

**Exit gate:** One provider event yields exactly one aggregated, correct DM per affected linked user.

### Phase 7 — Reconciliation and payout

- Full-sequence finalizer.
- Unresolved-action settlement gate.
- Settlement and payout roots.
- Top-three claims.

**Exit gate:** Final totals equal replay totals; winners claim; double claims fail.

### Phase 8 — Winning polish

- Historical Replay Theatre.
- Judge Mode.
- TxLINE verification receipts.
- Shareable result card.
- Cumulative World Cup table.
- Mobile UX and animation polish.
- Public technical documentation and endpoint list.

**Scope rule:** AI/TTS is attempted only after every Phase 0–8 exit gate needed for the demo is green.

## 19. Execution war plan — July 10 to July 19, 2026

The submission deadline is July 19, 2026 at 23:59 UTC. Freeze scope aggressively.

### July 10–11: prove TxLINE

- Subscription, activation, endpoint client, fixture capture, full sequence.
- Player/position mapping and action joins.
- Provider support questions.
- Capability registry.
- First golden replay test.

**Kill criterion:** If real player lists/positions cannot be made reliable by July 11, escalate to TxLINE support immediately and do not build fake roster UI.

### July 12–13: ship team creation and entry

- Today/match pages.
- Manual and Quick Pick builder.
- Captain/vice-captain, lock, hash.
- Devnet contest entry and vault.

### July 14–15: scoring and live experience

- Participation intervals.
- All verified scoring rules.
- Clean-sheet/conceded logic.
- Impact feed, leaderboard, correction handling.
- Real replay end to end.

### July 16: Telegram and finalization

- Link flow, reminders, impact DMs.
- Full reconciliation.
- Settlement and claim.

### July 17: Judge Mode and UX polish

- Deterministic replay route.
- Mobile QA.
- Verification receipt and share card.
- StablePrice Market Pulse if reliable.

### July 18: hard freeze and recording rehearsal

- No new features.
- Fresh-deploy test.
- Failure-mode rehearsal.
- Record at least two complete demo takes.
- Prepare fallback hosted video and judge instructions.

### July 19: submission day

- Run full E2E from fresh state.
- Verify deployed app, repo, program, bot, replay, claim, and docs.
- Upload final video early.
- Submit before 20:00 UTC target; use remaining buffer only for submission issues.

### Daily release gate

No day is complete until:

```text
main branch green
production/devnet deployment healthy
real replay smoke test passes
no unresolved P0 provider events
no secret in repository
```

## 20. Demo video script

Keep the final video below five minutes and optimize for consumer experience, not architecture narration.

```text
0:00-0:20  Hook: “Every event on the pitch changes your team, rank, and phone.”
0:20-0:40  Show official contest, prize pool, and TxLINE-powered fixture
0:40-1:20  Connect Solana, Quick Pick/manual formation, real player positions, captain, lock
1:20-1:35  Enter devnet contest; briefly show on-chain team hash
1:35-3:15  Run real historical TxLINE replay:
             - starter appearance
             - substitution or 60-minute milestone
             - goal/penalty or card
             - clean-sheet award/reversal
             - goals-conceded deduction
             - points and rank animation
2:45-3:15  Show Fantasy Pulse odds movement and TxLINE receipt during an impact
3:15-3:40  Show Telegram DM with exact calculation and rank movement
3:40-4:15  Final replay reconciliation and vice-captain/clean-sheet confirmation
4:15-4:35  Publish top three and claim devnet prize
4:35-4:50  Shareable final card and cumulative World Cup table
4:50-5:00  Monetization path and one sentence of TxLINE integration feedback
```

### Demo rules

- Use a real TxLINE fixture and full historical sequence.
- Label replay honestly.
- Keep the browser zoom and mobile viewport readable in the recording.
- Pre-fund judge/demo wallets and validate every transaction before recording.
- Hide terminal logs unless proving TxLINE provenance; judges should mostly see the fan experience.
- Record a clean fallback video even if planning a live demonstration.
- Never show a manual database edit, fabricated event, or mocked payout in the judged path.

## 21. Submission checklist

- Deployed web app URL.
- Public repository.
- Working Solana devnet program and explorer links.
- Functional TxLINE-backed player list and scoring.
- Five-minute-or-shorter demo video.
- README with architecture and setup.
- Exact TxLINE endpoints used.
- Service level/network details.
- Captured example payloads with secrets removed.
- Scoring rules and feed-delay disclosure.
- TxLINE integration feedback: what worked and where enum/player mapping created friction.
- Test instructions for judges.
- Historical replay path that works outside match hours.

---

## 22. Definition of done

The hackathon product is complete only when a judge can:

1. Open the deployed web app.
2. Authenticate with a Solana wallet.
3. Open a TxLINE-covered or historical-replay fixture.
4. See real player names and verified position groups from TxLINE lineup data.
5. Select a formation and valid team of 11.
6. Select captain and vice-captain.
7. Lock the team and enter a devnet contest.
8. Observe verified TxLINE events drive appearance, 60-minute, goal/penalty, card, clean-sheet, and goals-conceded consequences when those capabilities are verified for the replay.
9. Inspect the exact rule, base points, multiplier, reversal status, total change, and rank change for every impact.
10. Receive the same committed impact through Telegram after optional linking.
11. Reach a full-sequence reconciled final leaderboard with vice-captain and clean-sheet decisions finalized.
12. Claim a devnet top-three prize or observe the non-winner result.
13. Generate a share card and inspect the team hash, scoring ledger, StablePrice context, and TxLINE provenance.

No mock player list, mock scoring event, manually edited leaderboard, or simulated payout satisfies this definition. Historical TxLINE replay is valid; fabricated data is not.

---

## 23. Primary references

- TxLINE World Cup free tier: `https://txline.txodds.com/documentation/worldcup`
- TxLINE quickstart: `https://txline.txodds.com/documentation/quickstart`
- TxLINE score schedule: `https://txline.txodds.com/documentation/scores/schedule`
- TxLINE soccer feed and documented penalty outcomes: `https://txline.txodds.com/documentation/scores/soccer-feed`
- TxLINE API reference: `https://txline.txodds.com/api-reference`
- TxLINE public repository: `https://github.com/txodds/tx-on-chain`
