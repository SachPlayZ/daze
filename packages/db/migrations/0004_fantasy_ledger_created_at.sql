-- fantasy_ledger.created_at is part of the PLAN.md 6.12 ledger contract; it was missing from 0001.
alter table fantasy_ledger add column if not exists created_at timestamptz not null default now();
