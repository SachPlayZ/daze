# Daze brand implementation handoff

## Start here

Copy from `public/brand/`. Import `app/styles/tokens.css`, then `app/styles/themes.css` before component styles. Remove the existing hand-drawn `DazeWordmark` SVG and render the approved PNG exports with `<img>`/`next/image`.

## Assets

| File | Use |
| --- | --- |
| `daze-wordmark-ink.png` | Header/footer on warm-light surfaces |
| `daze-wordmark-cream.png` | Header/footer on dark or gradient surfaces |
| `daze-mark-ink.png` | Small in-app mark on light surfaces |
| `daze-mark-cream.png` | Small in-app mark on dark surfaces |
| `daze-app-icon-512.png` | PWA/app-store icon source |
| `daze-app-icon-192.png` | Android icon |
| `daze-apple-touch-icon.png` | Apple touch icon |
| `daze-favicon-32.png`, `daze-favicon-16.png` | Browser icons |
| `daze-og-default.png` | Default Open Graph image |

## Rules

- Use Instrument Sans for UI; Instrument Serif only for sparse campaign display copy.
- Use solid `surface` or `surface-raised` backgrounds for builder, player list, timeline, leaderboard, wallet, and claim flows.
- Use `--daze-gradient-brand` only for landing/auth/replay/share/empty-state/OG surfaces.
- Live, captain, and current-match emphasis use `--live`; never use it as a full-page background.
- Status always includes icon + signed number/text. `Provisional`, `Final`, and correction must be distinct.
- Minimum touch target 44px; visible `--focus` outline; tabular numerals for scores, points, ranks, and clocks.

## Logo approval note

The files above are high-resolution raster exports extracted from the supplied approved artwork. They are ready for the hackathon build. A trademark-grade SVG master is still a separate manual vectorization/sign-off deliverable; do not use or extend the existing improvised path-based `DazeWordmark.tsx` logo.
