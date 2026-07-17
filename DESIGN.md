---
name: Daze
description: Every moment changes your game.
colors:
  background: "#f4f0e8"
  background-soft: "#ece6dc"
  surface: "#fff9f0"
  surface-raised: "#ffffff"
  foreground: "#351a12"
  muted: "#766b63"
  border: "#d8cfc3"
  terrace-coral: "#ff6841"
  match-orange: "#ff9565"
  floodlight-live: "#cfff45"
  positive: "#28764c"
  positive-surface: "#ddf4e8"
  negative: "#b93832"
  negative-surface: "#fbe3e0"
  warning: "#8a5a00"
  warning-surface: "#fff0c7"
  info: "#315fa8"
  info-surface: "#e6eefb"
  focus: "#2f6bff"
  night-background: "#171210"
  night-background-soft: "#1e1714"
  night-surface: "#241c18"
  night-surface-raised: "#30241e"
  night-foreground: "#f7f0e6"
  night-muted: "#afa49a"
  night-border: "#493a32"
  night-terrace-coral: "#ff7048"
  night-match-orange: "#ff9a6b"
  night-floodlight-live: "#d2ff4d"
  night-positive: "#86e0b0"
  night-positive-surface: "#173629"
  night-negative: "#ff817a"
  night-negative-surface: "#40201e"
  night-warning: "#f4cd72"
  night-warning-surface: "#3a2d14"
  night-info: "#9fc1ff"
  night-info-surface: "#172642"
  night-focus: "#8cb4ff"
typography:
  display:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "50px"
    letterSpacing: "-0.03em"
  display-accent:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: "50px"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "27px"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "normal"
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "normal"
  micro:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.03em"
rounded:
  compact: "10px"
  control: "12px"
  action: "14px"
  card: "18px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "0 20px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  status-positive:
    backgroundColor: "{colors.positive-surface}"
    textColor: "{colors.positive}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "24px"
  field-select:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "0 10px"
    height: "44px"
---

# Design System: Daze

## Overview

**Creative North Star: "Matchday Editorial"**

Daze pairs the warmth of premium football culture with the precision of a trusted match companion. Brand moments feel expressive and human; team building, live scoring, ranking, wallet confirmation, and claims become quiet, structured surfaces where the consequence of every event is immediately legible.

Warm light is the default scene, like a supporter checking their XI before kickoff in daylight. Match-night dark is an intentional preference for following play in lower ambient light, never a visual shortcut into crypto or esports language. Layout is mobile-first, dense only when football decisions require it, and responsive through structural reflow rather than decorative type scaling.

**Key Characteristics:**

- Warm editorial identity outside the match; crisp utility during it.
- Semantic color reserved for live state, point impact, rank, warnings, and corrections.
- Solid, bounded gameplay surfaces with clear alignment and compact data grouping.
- Football-first copy with blockchain detail progressively disclosed.
- Motion communicates committed state and never delays interaction.

## Colors

The palette combines Espresso Ink and warm terrace neutrals with Terrace Coral, Match Orange, and Floodlight Lime. Every semantic state has a dark text color and a quiet supporting surface in both warm-light and match-night themes.

### Primary

- **Espresso Ink** (#351a12): Primary text, primary actions, scores, and high-confidence hierarchy.
- **Terrace Coral** (#ff6841): Brand warmth, selected progress, and sparse editorial emphasis; never small body text on a light surface.

### Secondary

- **Match Orange** (#ff9565): Supporting warmth inside approved brand gradients and restrained highlights.
- **Pitch Green** (#28764c / #ddf4e8): Positive values and confirmed states use the semantic positive pair, not decorative green.

### Tertiary

- **Floodlight Lime** (#cfff45): Live state and captain emphasis only, always paired with explicit text or an icon and dark readable ink.
- **Card Red** (#b93832 / #fbe3e0): Negative deltas, broken clean sheets, errors, and corrections that reverse points.
- **Referee Gold** (#8a5a00 / #fff0c7): Warning and provisional states use the warning pair; the surface carries context without becoming a celebration.
- **Verification Blue** (#315fa8 / #e6eefb): Links and informational provenance remain distinct from scoring outcomes.
- **Focus Blue** (#2f6bff): Visible keyboard focus only; it is not a scoring state.

### Neutral

- **Terrace Canvas** (#f4f0e8 / #ece6dc): Default page backgrounds; they establish warmth without competing with data.
- **Programme Paper** (#fff9f0 / #ffffff): Solid card and raised surfaces for builders, lists, timelines, leaderboards, disclosures, and transactions.
- **Terrace Muted** (#766b63): Supporting copy and inactive navigation when contrast remains AA-compliant.
- **Chalk Border** (#d8cfc3): Quiet structural separation between rows, groups, and controls.
- **Match-night Espresso** (#171210 / #1e1714 / #241c18 / #30241e): Dark theme layers progress from background to raised surface without black utility classes.
- **Floodlit Cream** (#f7f0e6 / #afa49a): Match-night foreground and muted copy.
- **Night Chalk** (#493a32): Dark-theme structural border and divider.

### Named Rules

**The Earned Accent Rule.** Coral, orange, and lime appear only when brand emphasis or live state earns them; inactive gameplay remains neutral.

**The Solid Pitch Rule.** Team builders, player lists, timelines, leaderboards, wallet confirmations, claims, and errors always sit on solid semantic surfaces, never on the brand gradient.

**The Two-Theme Rule.** Every component ships in warm light and match-night dark; no raw black, white, or gray utility may bypass the semantic theme tokens.

## Typography

**Display Font:** Instrument Sans with optional Instrument Serif emphasis
**Body Font:** Instrument Sans with a system sans fallback
**Label/Mono Font:** Instrument Sans; no monospace in consumer UI

**Character:** Instrument Sans keeps gameplay direct, contemporary, and highly legible. Instrument Serif is a sparse editorial accent for marketing phrases only; it never enters builder labels, buttons, tables, live data, or transaction flows.

### Hierarchy

- **Display** (700, 48/50 desktop and 36/39 mobile): Landing, replay cover, share card, and final-result headlines only; cap tracking at −0.03em.
- **Headline** (700, 36/40 desktop and 30/34 mobile): Primary page titles and major match states.
- **Title** (600, 22/27): Card titles, team names, and high-value section headings.
- **Body** (400, 16/24): Primary explanation and fan copy, normally limited to 65–75 characters per line.
- **Label** (600, 14/20): Navigation, controls, player labels, and compact metadata.
- **Micro** (600, 12/16): True status labels such as LIVE, CAPTAIN, PROVISIONAL, and FINAL only.

### Named Rules

**The One Match Voice Rule.** Instrument Sans owns the product; Instrument Serif may emphasize one short marketing phrase but never competes with gameplay hierarchy.

**The Tabular Score Rule.** Scores, clocks, points, ranks, odds, countdowns, and currency always use tabular numerals.

**The Status Case Rule.** Sentence case is default. Uppercase is reserved for compact state labels, never repeated as decorative section scaffolding.

## Elevation

Daze is flat by default. Depth comes from tonal layers, one-pixel semantic borders, sticky positioning, and overlap before it comes from shadow. The single floating shadow is reserved for modal or popover surfaces that must clearly detach from the current task; ordinary cards and controls have no shadow.

### Shadow Vocabulary

- **Floating overlay** (`0 18px 50px rgb(53 26 18 / 14%)`): Modal, onboarding sheet, or popover only; never combine it with a decorative ghost-card border treatment.

### Named Rules

**The Flat-by-Default Rule.** Cards, builder panels, player rows, timelines, and leaderboards use tonal contrast or a border, never a routine drop shadow.

**The One Floating Layer Rule.** A screen exposes at most one shadow-bearing layer at a time, and that layer must interrupt the task for a clear reason.

## Components

Components feel tactile and confident: familiar controls, direct state changes, visible focus, and no invented affordances. Every interactive component supports default, hover, focus, active, disabled, and loading or error behavior where applicable.

### Buttons

- **Shape:** Gently squared action corners (14px) for primary actions; compact controls use 12px; icon buttons may be circular.
- **Primary:** Espresso Ink on the current background, 52px high with 20px horizontal padding; use one clear primary action per decision surface.
- **Hover / Focus:** A restrained 2px lift may signal hover; keyboard focus is a 3px semantic focus outline with 3px offset. Reduced motion removes travel without removing feedback.
- **Secondary / Ghost:** Transparent or solid semantic surface, one-pixel Chalk Border, 44px minimum height, and no shadow.

### Chips

- **Style:** Full-pill shape with a semantic state surface, matching dark semantic text, and compact 12px type.
- **State:** Include words or icons alongside color. LIVE, PROVISIONAL, FINAL, CORRECTION, and captaincy must remain distinguishable without hue.

### Cards / Containers

- **Corner Style:** Soft but controlled card corners (18px); dense nested rows use 10–14px.
- **Background:** Solid semantic surface or raised surface; gameplay content never uses the brand gradient.
- **Shadow Strategy:** Flat at rest; only true overlays use Floating overlay.
- **Border:** One-pixel semantic border when grouping needs an explicit edge.
- **Internal Padding:** 18px mobile and 24px desktop, following the 4px spacing grid.

### Inputs / Fields

- **Style:** Raised semantic surface, one-pixel border, 10–12px radius, 44px minimum height, and readable 14px labels.
- **Focus:** Three-pixel focus outline with offset; do not rely on border-color alone.
- **Error / Disabled:** Pair semantic surface and text with explicit explanation; disabled controls retain readable text and use restrained opacity.

### Navigation

The custom Daze artwork anchors a 76px desktop bar and a compact mobile bar. Links use muted semantic text until active or hovered; wallet connection remains a clear action. At narrow widths, preserve the logo, theme, onboarding, and wallet task before secondary route links.

### Formation Pitch

The pitch communicates tactical structure without photorealistic grass. Player tokens remain readable and operable at 320px, use verified flags only when known, show selection and captaincy with more than color, and keep the player picker independently scrollable on larger screens.

### Personal Impact and Leaderboard Rows

Rows prioritize match minute, affected player, explicit signed delta, total, and rank movement using tabular numerals. Corrections use calm replacement language and a distinct state treatment; negative outcomes never receive celebratory motion.

## Do's and Don'ts

### Do:

- **Do** use the approved `DazeWordmark` and `DazeMark` assets with required clear space and at least 88px wordmark width.
- **Do** build every surface from semantic tokens and verify warm-light and match-night-dark behavior.
- **Do** keep touch targets at least 44×44px, show a visible 3px focus outline, support 200% text scaling, and test the core flow at 320px.
- **Do** use explicit signed values, icons or text, and accessible announcements for positive, negative, live, provisional, final, and correction states.
- **Do** use solid surfaces for builders, player lists, timelines, leaderboards, wallet confirmation, claims, rules, and errors.
- **Do** respect reduced motion and keep ordinary state transitions between 120ms and 260ms.

### Don't:

- **Don't** make Daze resemble a crypto casino, betting terminal, degen or cyberpunk dashboard, generic Web3 landing page, esports skin, or developer console.
- **Don't** use purple-on-black defaults, token tickers, casino motifs, excessive glassmorphism, neon glows, dense gameplay content on gradients, unlicensed football imagery, or protocol-first consumer copy.
- **Don't** substitute a font for the Daze logo, crop the wordmark into a mark, stretch it, recolor it by team, or place it inside a pill.
- **Don't** use raw `bg-black`, `text-white`, hardcoded gray scales, or feature-level hex values when a semantic token exists.
- **Don't** use color alone for status, gradient text, decorative grid or stripe backgrounds, side-stripe card accents, nested cards, or border-plus-wide-shadow ghost cards.
- **Don't** introduce autoplay loops, constant particles, pulsing glows, bounce easing, or motion that delays state commitment, navigation, transaction feedback, or correction display.
