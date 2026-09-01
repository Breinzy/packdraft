-- SQL editor safe. Types/tables only — no function bodies.

do $create_types$
begin
  create type tournament_status as enum (
    'upcoming', 'active', 'locked', 'settling', 'completed', 'archived'
  );
exception
  when duplicate_object then null;
end;
$create_types$;

do $create_trade_side$
begin
  create type trade_side as enum ('buy', 'sell');
exception
  when duplicate_object then null;
end;
$create_trade_side$;

create table if not exists tournaments (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text not null default '',
  tcg_id              uuid not null references tcgs(id) on delete restrict,
  starting_budget     numeric(14,2) not null check (starting_budget > 0),
  starts_at           timestamptz not null,
  trading_closes_at   timestamptz not null,
  ends_at             timestamptz not null,
  status              tournament_status not null default 'upcoming',
  rules               jsonb not null default '{}'::jsonb,
  prize_info          jsonb not null default '{}'::jsonb,
  eligible_asset_types text[] not null default array['sealed', 'graded', 'single']::text[],
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  settled_at          timestamptz,
  check (trading_closes_at > starts_at),
  check (ends_at >= trading_closes_at)
);

create index if not exists idx_tournaments_status on tournaments (status);
create index if not exists idx_tournaments_tcg on tournaments (tcg_id);

create table if not exists tournament_portfolios (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  starting_cash   numeric(14,2) not null check (starting_cash >= 0),
  cash            numeric(14,2) not null check (cash >= 0),
  created_at      timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index if not exists idx_tportfolios_user on tournament_portfolios (user_id);
create index if not exists idx_tportfolios_tournament on tournament_portfolios (tournament_id);

create table if not exists tournament_participants (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  portfolio_id    uuid not null references tournament_portfolios(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  unique (tournament_id, user_id),
  unique (portfolio_id)
);

create index if not exists idx_tparticipants_tournament on tournament_participants (tournament_id);

create table if not exists tournament_positions (
  id              uuid primary key default gen_random_uuid(),
  portfolio_id    uuid not null references tournament_portfolios(id) on delete cascade,
  asset_id        uuid not null references assets(id) on delete restrict,
  quantity        integer not null check (quantity > 0),
  average_cost    numeric(14,2) not null check (average_cost >= 0),
  unique (portfolio_id, asset_id)
);

create index if not exists idx_tpositions_portfolio on tournament_positions (portfolio_id);
create index if not exists idx_tpositions_asset on tournament_positions (asset_id);

create table if not exists tournament_transactions (
  id                    uuid primary key default gen_random_uuid(),
  portfolio_id          uuid not null references tournament_portfolios(id) on delete cascade,
  asset_id              uuid not null references assets(id) on delete restrict,
  side                  trade_side not null,
  quantity              integer not null check (quantity > 0),
  execution_price       numeric(14,2) not null check (execution_price >= 0),
  total_value           numeric(14,2) not null check (total_value >= 0),
  executed_at           timestamptz not null default now(),
  price_snapshot_id     uuid references price_snapshots(id) on delete set null
);

create index if not exists idx_ttransactions_portfolio on tournament_transactions (portfolio_id, executed_at desc);
create index if not exists idx_ttransactions_asset on tournament_transactions (asset_id);

create table if not exists tournament_settlement_prices (
  tournament_id       uuid not null references tournaments(id) on delete cascade,
  asset_id            uuid not null references assets(id) on delete restrict,
  price               numeric(14,2) not null check (price >= 0),
  price_snapshot_id   uuid references price_snapshots(id) on delete set null,
  recorded_at         timestamptz not null,
  primary key (tournament_id, asset_id)
);

create table if not exists tournament_results (
  tournament_id     uuid not null references tournaments(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  portfolio_id      uuid not null references tournament_portfolios(id) on delete cascade,
  cash              numeric(14,2) not null,
  holdings_value    numeric(14,2) not null,
  final_value       numeric(14,2) not null,
  return_pct        numeric(10,4) not null,
  rank              integer not null check (rank >= 1),
  locked_at         timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create index if not exists idx_tresults_rank on tournament_results (tournament_id, rank);

create or replace view asset_latest_prices as
select distinct on (s.asset_id)
  s.id as snapshot_id,
  s.asset_id,
  s.price,
  s.change_7d,
  s.volume,
  s.recorded_at,
  s.source,
  s.condition,
  s.price_type
from price_snapshots s
where s.asset_id is not null
order by s.asset_id, s.recorded_at desc;

grant select on asset_latest_prices to anon, authenticated;

alter table tournaments enable row level security;
alter table tournament_portfolios enable row level security;
alter table tournament_participants enable row level security;
alter table tournament_positions enable row level security;
alter table tournament_transactions enable row level security;
alter table tournament_settlement_prices enable row level security;
alter table tournament_results enable row level security;

drop policy if exists "Tournaments are public" on tournaments;
create policy "Tournaments are public" on tournaments for select using (true);

drop policy if exists "Participants are public" on tournament_participants;
create policy "Participants are public" on tournament_participants for select using (true);

drop policy if exists "Settlement prices are public" on tournament_settlement_prices;
create policy "Settlement prices are public" on tournament_settlement_prices for select using (true);

drop policy if exists "Results are public" on tournament_results;
create policy "Results are public" on tournament_results for select using (true);

drop policy if exists "Own tournament portfolio" on tournament_portfolios;
create policy "Own tournament portfolio" on tournament_portfolios
  for select using (auth.uid() = user_id);

drop policy if exists "Own tournament positions" on tournament_positions;
create policy "Own tournament positions" on tournament_positions
  for select using (
    exists (
      select 1 from tournament_portfolios p
      where p.id = tournament_positions.portfolio_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Own tournament transactions" on tournament_transactions;
create policy "Own tournament transactions" on tournament_transactions
  for select using (
    exists (
      select 1 from tournament_portfolios p
      where p.id = tournament_transactions.portfolio_id
        and p.user_id = auth.uid()
    )
  );

alter view asset_latest_prices set (security_invoker = true);
