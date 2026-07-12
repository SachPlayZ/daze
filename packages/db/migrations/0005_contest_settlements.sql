-- Settlement publication record, read by the TxLINE verified-receipt UI. Schema-only; populated by the settlement script.
create table if not exists contest_settlements (
  contest_id text primary key,
  merkle_root text not null,
  tx_signature text not null,
  published_at timestamptz not null
);
