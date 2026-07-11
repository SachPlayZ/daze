# Daze brand handoff

## Use in product

- `source/daze-wordmark-reference.png`: approved wordmark artwork reference.
- `source/daze-mark-reference.png`: approved mark artwork reference.
- `daze-brand-kit-overview-v1.png`: complete identity direction.
- `panels/01-logo-cover.png`: campaign/hero art direction.
- `panels/02-logo-construction.png`: logo construction reference; not a replacement mark.
- `panels/03-live-product-preview.png`: live-match UI direction.
- `panels/04-brand-essence.png`: campaign copy direction.
- `panels/05-color-system.png`: palette reference.
- `panels/06-typography.png`: type direction: Instrument Sans + Instrument Serif.
- `panels/07-matchday-ticket.png`: matchday/entry-card direction.
- `panels/08-image-direction.png`: abstract net/stadium texture direction.
- `panels/09-product-system.png`: status-component direction.

## Production tokens

| Token | Value |
| --- | --- |
| background | `#F4F0E8` |
| foreground | `#351A12` |
| surface | `#FFF9F0` |
| brand-coral | `#FF6841` |
| brand-orange | `#FF9565` |
| live | `#CFFF45` |
| muted-green | `#70B89A` |
| gold | `#F6C35B` |

## Build-ready exports

All exports are mirrored to `frontend/public/brand/` for direct application use.

- `exports/daze-wordmark-ink.png`, `exports/daze-wordmark-cream.png`, and `exports/daze-wordmark-dark.png`
- `exports/daze-mark-ink.png`, `exports/daze-mark-cream.png`, and `exports/daze-mark-dark.png`
- `exports/daze-app-icon-512.png`, `exports/daze-app-icon-192.png`, and `exports/daze-apple-touch-icon.png`
- `exports/daze-favicon-32.png` and `exports/daze-favicon-16.png`
- `exports/daze-og-default.png` (`1200 × 630`)

Implementation files: `frontend/app/styles/tokens.css`, `frontend/app/styles/themes.css`, and `frontend/BRAND-HANDOFF.md`.

## Non-negotiables

- Gradient: landing, auth, replay, share, and empty states only.
- Gameplay: solid surfaces, Instrument Sans, lime only for live/captain emphasis.
- Keep the raster logo files as references only. Before shipping, create an approved vector master for wordmark, mark, favicon, and app icon; do not use the current hand-drawn SVG substitute.
