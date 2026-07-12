-- Periodic TxLINE odds snapshots for Market Pulse display (AGENTS.md §18). Never referenced by scoring, ledger, settlement, or payout logic.
create table if not exists fixture_odds_snapshots (
  fixture_id text not null,
  snapshot_ts timestamptz not null,
  raw_json jsonb not null,
  primary key (fixture_id, snapshot_ts)
);
