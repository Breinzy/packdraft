-- Phase 18: Pro flag and sponsored-tournament labels.
-- Pro must not change tournament cash, prices, ranks, or settlement.
-- No real-money processor is wired here.

alter table profiles
  add column if not exists pro_until timestamptz;

alter table tournaments
  add column if not exists sponsor_name text not null default '';

alter table tournaments
  add column if not exists sponsor_url text not null default '';
