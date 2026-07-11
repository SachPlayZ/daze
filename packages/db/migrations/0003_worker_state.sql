-- Worker/bot runtime state. Idempotent; append-only where PLAN.md requires it.
alter table fixtures add column if not exists players_json jsonb;
alter table fixtures add column if not exists readiness_json jsonb;
alter table fixtures add column if not exists home_participant_id text;
alter table fixtures add column if not exists away_participant_id text;
alter table fixtures add column if not exists updated_at timestamptz not null default now();

create table if not exists provider_cursors (
  fixture_id text not null,
  connection_id text,
  last_sequence text,
  updated_at timestamptz not null default now(),
  primary key (fixture_id)
);

create table if not exists telegram_links (
  telegram_user_id text primary key,
  wallet text not null unique,
  linked_at timestamptz not null default now()
);

create table if not exists telegram_link_tokens (
  token text primary key,
  telegram_user_id text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists notification_preferences (
  wallet text primary key,
  reminders boolean not null default true,
  point_impacts boolean not null default true,
  rank_changes boolean not null default true,
  reconciliation boolean not null default true,
  final_results boolean not null default true,
  paused boolean not null default false
);

create table if not exists entry_totals (
  entry_id text primary key,
  contest_id text not null,
  wallet text not null,
  total integer not null default 0,
  rank integer,
  updated_at timestamptz not null default now()
);

alter table notification_outbox add column if not exists wallet text;
alter table notification_outbox add column if not exists telegram_user_id text;
