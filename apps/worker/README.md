# Worker boundary

Owns TxLINE snapshots/SSE ingestion, raw immutable payload persistence, normalization, scoring projection, recovery, final replay, settlement orchestration, and committed-notification outbox insertion.

Processing order: validate -> content hash -> raw payload -> normalized event/cursor atomically -> scoring queue. No raw payload, no score.

