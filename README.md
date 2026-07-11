<p align="center">
  <img src="daze-logo.png" alt="Daze logo" width="120" />
</p>

<h1 align="center">Daze</h1>

<p align="center">
  Mobile-first Solana fantasy football for TxLINE-covered World Cup fixtures.
</p>

Daze is a fantasy contest app built around [TxLINE](https://txodds.com)-covered World Cup fixtures. The web app owns the entire experience — wallet auth, XI selection, team lock, live scoring, leaderboard, reconciliation, settlement, and prize claim — settled on Solana. A Telegram bot is an optional companion for reminders and personal point-change DMs; it never touches wallets, stakes, or team edits.

> [!IMPORTANT]
> This is a pre-release build. See [Release status](#release-status) before treating any contest as live.

## Features

- **Wallet-native entry** — Solana wallet auth, no separate account system.
- **Real lineups only** — player selection is sourced from live TxLINE lineup data; there is no hardcoded or scraped roster fallback.
- **Manual build or Quick Pick** — build an XI by hand or use a deterministic, seeded auto-pick.
- **Captain/vice-captain multipliers** — captain doubles every positive and negative delta, including reversals.
- **Append-only scoring ledger** — every point is reproducible from immutable raw provider payloads plus a versioned scoring ruleset; corrected provider events reverse and replace prior ledger entries rather than mutating history.
- **On-chain settlement** — an Anchor program holds entry stakes in a vault and pays out via Merkle-proof claims, not an operator wallet.
- **Telegram companion** — `/start`, `/link`, `/today`, `/team`, `/points`, `/settings`, `/unlink`, `/stop` for reminders and personal point DMs only.

## Workspace layout

This is a monorepo split by ownership boundary:

| Path | Owns |
| --- | --- |
| `frontend/` | Next.js Daze UI — wallet connect, builder, live scoring, leaderboard, claim |
| `apps/api` | Wallet sessions, draft commands, locks, entry construction, Telegram linking |
| `apps/worker` | TxLINE ingestion, normalization, scoring projection, recovery, replay, settlement orchestration |
| `apps/bot` | Telegram DM delivery from committed ledger rows only |
| `packages/domain` | Canonical teams, validation, deterministic Quick Pick, commitment hashing |
| `packages/scoring` | Pure, append-only ledger projection |
| `packages/txline-client` | Server-only authenticated TxLINE client (fixtures, lineups, actions) |
| `packages/solana-client` | Transaction construction boundary (entry, settlement, claim) |
| `packages/db` | PostgreSQL schema and migrations |
| `packages/config` | Versioned capability and position-mapping configuration |
| `packages/telegram` | Shared Telegram bot primitives |
| `programs/fantasy-pool` | Anchor program: contest vault, entry, Merkle settlement, claim, cancel/refund |
| `docs/` | Provider contract notes, architecture decisions, release-gate checklist |
| `scripts/` | Devnet capture and deployment scripts |
| `tests/` | Per-boundary test suites plus captured TxLINE provider fixtures |

## Prerequisites

- Node.js and [pnpm](https://pnpm.io)
- [Rust](https://www.rust-lang.org) and [Anchor](https://www.anchor-lang.com) `0.30.1` for the on-chain program
- Solana CLI targeting devnet (`solana_version = 1.18.26`, see `Anchor.toml`)
- A PostgreSQL instance for durable storage (`packages/db`)
- TxLINE devnet API credentials

## Getting started

Copy the environment template and fill in secrets:

```bash
cp .env.example .env
```

> [!WARNING]
> Never put TxLINE tokens, guest JWTs, or wallet keypairs in `frontend/` or any `NEXT_PUBLIC_*` variable. Those values are server-only.

Run the frontend:

```bash
cd frontend
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm build
```

Build and deploy the Anchor program to devnet:

```bash
anchor build
scripts/deploy-fantasy-pool-devnet.sh
```

## Architecture notes

- **Scoring v1 is verification-gated.** Only capabilities confirmed against captured TxLINE payloads are live — currently open-play goals (`GoalType = Shot`) and substitutions. Own goals, penalties, and cards exist in code but stay fail-closed until their exact payload contracts are captured and tested. Position mappings are versioned (e.g. `txline-soccer-world-cup-v1`) and unknown IDs fail closed rather than guessing.
- **Ingestion order is strict.** The worker validates, content-hashes, persists the raw payload, then atomically writes the normalized event/cursor before the scoring queue. No raw payload, no score.
- **Settlement is on-chain and vault-controlled.** `programs/fantasy-pool` holds entry stakes; `publish_settlement` posts a Merkle root, and `claim_prize` pays out against a proof — no operator wallet ever custodies funds.
- **One entry per wallet per fixture/stake tier**, fixed stake, immutable team after lock. See `AGENTS.md` for the full non-negotiable product-rules list.

## Release status

Historical Replay and Judge Mode are backed by a captured TxLINE World Cup sequence, verified position mapping, deterministic projection, and an executable devnet fantasy-pool program. It intentionally has no fixture/player fallback.

Daze cannot be described as live until the full judged path is proven end-to-end: verified lineups → valid XI → devnet entry → verified action → ledger → reconciliation → settlement → claim. Track the exact remaining gates in [`docs/operations/release-gate.md`](docs/operations/release-gate.md).

## Documentation

- [`AGENTS.md`](AGENTS.md) — normative rules for coding agents working in this repo
- [`PLAN.md`](PLAN.md) — full product and architecture plan
- [`docs/decisions/`](docs/decisions) — architecture decision records
- [`docs/txline/provider-notes.md`](docs/txline/provider-notes.md) — confirmed TxLINE payload contracts and open questions
- [`docs/operations/release-gate.md`](docs/operations/release-gate.md) — what's left before going live
