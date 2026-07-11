# 0001 — Capability-gated provider scoring

## Context

TxLINE payload semantics and player joins must be proven against captured data before affecting contest outcomes.

## Decision

All provider capabilities start `SHADOW` or `DISABLED`. Only captured payloads, runtime schemas, normalizer/player-join/duplicate/amendment/replay tests, and evidence paths can promote a capability to `VERIFIED`.

## Alternatives

Guess mappings from known football data; rejected because it can mis-score real entries.

## Consequences

The initial UI must show unready state, not fabricated fixtures/rosters. Operations must capture data before a contest opens.

## Migration

Version mapping configuration and re-evaluate affected contests after each promotion.

