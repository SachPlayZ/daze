-- Historical replay state is intentionally separate from live contests and never carries a stake or settlement state.
create table if not exists historical_replay_sessions (
  id text primary key,
  fixture_id text not null,
  wallet text not null,
  team_json jsonb not null,
  cursor integer not null default 0 check (cursor >= 0),
  telegram_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists historical_replay_sessions_wallet_idx
  on historical_replay_sessions (wallet, created_at desc);
