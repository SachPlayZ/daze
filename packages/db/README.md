# Database contract

Use PostgreSQL with the migration in `migrations/`. Raw provider events and fantasy ledger rows are append-only. Revisions mark prior effects reversed; never mutate or delete raw JSON. Persist raw event, normalized event, cursor, scoring projection, totals/ranks, and notification outbox in one transaction where applicable.

