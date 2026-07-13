create table if not exists contests (
  id              text primary key,
  fixture_id      text not null references fixtures(id),
  stake_tier      bigint not null,
  stake_amount    bigint not null,
  lock_ts         bigint not null,
  mint            text not null,
  status          text not null default 'PENDING_CREATION',
  created_at      timestamptz not null default now(),
  settled_at      timestamptz,
  settlement_root text,
  settlement_tx   text,
  unique (fixture_id, stake_tier)
);
