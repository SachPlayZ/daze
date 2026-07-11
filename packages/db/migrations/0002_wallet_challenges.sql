create table if not exists wallet_challenges (
  nonce text primary key,
  wallet text not null,
  domain text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists wallet_challenges_expires_at_idx on wallet_challenges (expires_at);
