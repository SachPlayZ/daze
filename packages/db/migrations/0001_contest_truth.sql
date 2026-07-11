-- Append-only source-of-truth tables. Apply inside an application-controlled migration transaction.
create table if not exists fixtures (
  id text primary key, lifecycle text not null, kickoff_at timestamptz not null,
  mapping_version text, scoring_version text, feed_state text not null default 'WAITING_FOR_PLAYER_DATA'
);
create table if not exists raw_provider_events (
  id bigserial primary key, fixture_id text not null references fixtures(id), source_event_key text not null,
  revision text not null, content_hash text not null unique, provider_timestamp timestamptz, received_at timestamptz not null,
  endpoint_or_stream text not null, raw_json jsonb not null, supersedes_revision text,
  unique (fixture_id, source_event_key, revision)
);
create table if not exists normalized_events (
  id bigserial primary key, fixture_id text not null references fixtures(id), source_event_key text not null,
  revision text not null, parser_version text not null, normalized_json jsonb not null, raw_event_id bigint not null references raw_provider_events(id),
  unique (fixture_id, source_event_key, revision)
);
create table if not exists locked_teams (
  id text primary key, contest_id text not null, wallet text not null, canonical_json jsonb not null, canonical_team_hash text not null,
  scoring_version text not null, mapping_version text not null, locked_at timestamptz not null, unique (contest_id, wallet)
);
create table if not exists fantasy_ledger (
  id bigserial primary key, entry_id text not null, source_event_key text not null, source_revision text not null,
  rule_code text not null, player_id text not null, base_points integer not null, applied_points integer not null,
  provisional boolean not null, reversed_at timestamptz, explanation_payload jsonb not null,
  unique (entry_id, source_event_key, source_revision, rule_code, player_id)
);
create table if not exists notification_outbox (
  id bigserial primary key, idempotency_key text not null unique, payload jsonb not null, committed_at timestamptz not null, sent_at timestamptz
);

