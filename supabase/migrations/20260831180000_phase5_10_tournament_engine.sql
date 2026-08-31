-- =============================================================
-- PHASES 5–10 — Tournament books, trades, settlement
--
-- Does not alter legacy weekly-league tables (contests, leagues,
-- public.portfolios, portfolio_items). Tournament money lives only
-- in tournament_* tables.
-- =============================================================

create type tournament_status as enum (
  'upcoming',
  'active',
  'locked',
  'settling',
  'completed',
  'archived'
);

create type trade_side as enum ('buy', 'sell');

-- -------------------------------------------
-- TOURNAMENTS
-- -------------------------------------------

create table tournaments (
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

create index idx_tournaments_status on tournaments (status);
create index idx_tournaments_tcg on tournaments (tcg_id);

-- -------------------------------------------
-- PORTFOLIOS (one isolated book per user per tournament)
-- -------------------------------------------

create table tournament_portfolios (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  starting_cash   numeric(14,2) not null check (starting_cash >= 0),
  cash            numeric(14,2) not null check (cash >= 0),
  created_at      timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index idx_tportfolios_user on tournament_portfolios (user_id);
create index idx_tportfolios_tournament on tournament_portfolios (tournament_id);

create table tournament_participants (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  portfolio_id    uuid not null references tournament_portfolios(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  unique (tournament_id, user_id),
  unique (portfolio_id)
);

create index idx_tparticipants_tournament on tournament_participants (tournament_id);

create table tournament_positions (
  id              uuid primary key default gen_random_uuid(),
  portfolio_id    uuid not null references tournament_portfolios(id) on delete cascade,
  asset_id        uuid not null references assets(id) on delete restrict,
  quantity        integer not null check (quantity > 0),
  average_cost    numeric(14,2) not null check (average_cost >= 0),
  unique (portfolio_id, asset_id)
);

create index idx_tpositions_portfolio on tournament_positions (portfolio_id);
create index idx_tpositions_asset on tournament_positions (asset_id);

create table tournament_transactions (
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

create index idx_ttransactions_portfolio on tournament_transactions (portfolio_id, executed_at desc);
create index idx_ttransactions_asset on tournament_transactions (asset_id);

-- -------------------------------------------
-- SETTLEMENT (frozen after complete)
-- -------------------------------------------

create table tournament_settlement_prices (
  tournament_id       uuid not null references tournaments(id) on delete cascade,
  asset_id            uuid not null references assets(id) on delete restrict,
  price               numeric(14,2) not null check (price >= 0),
  price_snapshot_id   uuid references price_snapshots(id) on delete set null,
  recorded_at         timestamptz not null,
  primary key (tournament_id, asset_id)
);

create table tournament_results (
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

create index idx_tresults_rank on tournament_results (tournament_id, rank);

-- -------------------------------------------
-- LATEST PRICE VIEW (asset browser)
-- -------------------------------------------

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

-- -------------------------------------------
-- RLS — clients read; writes go through service-role RPCs
-- -------------------------------------------

alter table tournaments enable row level security;
alter table tournament_portfolios enable row level security;
alter table tournament_participants enable row level security;
alter table tournament_positions enable row level security;
alter table tournament_transactions enable row level security;
alter table tournament_settlement_prices enable row level security;
alter table tournament_results enable row level security;

create policy "Tournaments are public" on tournaments for select using (true);
create policy "Participants are public" on tournament_participants for select using (true);
create policy "Settlement prices are public" on tournament_settlement_prices for select using (true);
create policy "Results are public" on tournament_results for select using (true);

create policy "Own tournament portfolio" on tournament_portfolios
  for select using (auth.uid() = user_id);

create policy "Own tournament positions" on tournament_positions
  for select using (
    exists (
      select 1 from tournament_portfolios p
      where p.id = tournament_positions.portfolio_id
        and p.user_id = auth.uid()
    )
  );

create policy "Own tournament transactions" on tournament_transactions
  for select using (
    exists (
      select 1 from tournament_portfolios p
      where p.id = tournament_transactions.portfolio_id
        and p.user_id = auth.uid()
    )
  );

-- -------------------------------------------
-- LIFECYCLE
-- -------------------------------------------

create or replace function tick_tournament_row(t tournaments)
returns tournaments
language plpgsql
as $$
declare
  now_ts timestamptz := now();
begin
  if t.status = 'archived' or t.status = 'completed' then
    return t;
  end if;

  if t.status = 'upcoming' and now_ts >= t.starts_at then
    update tournaments set status = 'active' where id = t.id returning * into t;
  end if;

  if t.status = 'active' and now_ts >= t.trading_closes_at then
    update tournaments set status = 'locked' where id = t.id returning * into t;
  end if;

  return t;
end;
$$;

create or replace function join_tournament(p_user_id uuid, p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t tournaments;
  v_portfolio uuid;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'Profile required';
  end if;

  select * into t from tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  t := tick_tournament_row(t);

  if t.status not in ('upcoming', 'active') then
    raise exception 'Tournament is not open to join';
  end if;

  select id into v_portfolio
  from tournament_portfolios
  where tournament_id = p_tournament_id and user_id = p_user_id;

  if v_portfolio is not null then
    return v_portfolio;
  end if;

  insert into tournament_portfolios (tournament_id, user_id, starting_cash, cash)
  values (p_tournament_id, p_user_id, t.starting_budget, t.starting_budget)
  returning id into v_portfolio;

  insert into tournament_participants (tournament_id, user_id, portfolio_id)
  values (p_tournament_id, p_user_id, v_portfolio);

  return v_portfolio;
end;
$$;

create or replace function execute_tournament_trade(
  p_user_id uuid,
  p_tournament_id uuid,
  p_asset_id uuid,
  p_side trade_side,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t tournaments;
  v_portfolio tournament_portfolios;
  v_asset assets;
  v_snap record;
  v_pos tournament_positions;
  v_total numeric(14,2);
  v_new_qty integer;
  v_new_avg numeric(14,2);
  v_tx uuid;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be a positive integer';
  end if;

  select * into t from tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;
  t := tick_tournament_row(t);
  if t.status <> 'active' then
    raise exception 'Trading is closed';
  end if;

  select * into v_portfolio
  from tournament_portfolios
  where tournament_id = p_tournament_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Join this tournament before trading';
  end if;

  select * into v_asset from assets where id = p_asset_id;
  if not found or v_asset.active is not true then
    raise exception 'Asset is not tradable';
  end if;
  if v_asset.tcg_id <> t.tcg_id then
    raise exception 'Asset is not in this tournament';
  end if;
  if not (v_asset.asset_type = any (t.eligible_asset_types)) then
    raise exception 'Asset type is not eligible';
  end if;

  select s.id, s.price, s.recorded_at
  into v_snap
  from price_snapshots s
  where s.asset_id = p_asset_id
  order by s.recorded_at desc
  limit 1;
  if v_snap.price is null or v_snap.price <= 0 then
    raise exception 'No market price available';
  end if;

  v_total := round((p_quantity::numeric * v_snap.price), 2);

  select * into v_pos
  from tournament_positions
  where portfolio_id = v_portfolio.id and asset_id = p_asset_id
  for update;

  if p_side = 'buy' then
    if v_total > v_portfolio.cash then
      raise exception 'Insufficient cash';
    end if;

    if v_pos.id is null then
      insert into tournament_positions (portfolio_id, asset_id, quantity, average_cost)
      values (v_portfolio.id, p_asset_id, p_quantity, v_snap.price);
    else
      v_new_qty := v_pos.quantity + p_quantity;
      v_new_avg := round(
        ((v_pos.quantity::numeric * v_pos.average_cost) + v_total) / v_new_qty::numeric,
        2
      );
      update tournament_positions
      set quantity = v_new_qty, average_cost = v_new_avg
      where id = v_pos.id;
    end if;

    update tournament_portfolios
    set cash = cash - v_total
    where id = v_portfolio.id;
  else
    if v_pos.id is null or v_pos.quantity < p_quantity then
      raise exception 'Insufficient holdings';
    end if;

    v_new_qty := v_pos.quantity - p_quantity;
    if v_new_qty = 0 then
      delete from tournament_positions where id = v_pos.id;
    else
      update tournament_positions set quantity = v_new_qty where id = v_pos.id;
    end if;

    update tournament_portfolios
    set cash = cash + v_total
    where id = v_portfolio.id;
  end if;

  insert into tournament_transactions (
    portfolio_id, asset_id, side, quantity, execution_price, total_value, price_snapshot_id
  ) values (
    v_portfolio.id, p_asset_id, p_side, p_quantity, v_snap.price, v_total, v_snap.id
  ) returning id into v_tx;

  select cash into v_portfolio.cash from tournament_portfolios where id = v_portfolio.id;

  return jsonb_build_object(
    'transaction_id', v_tx,
    'execution_price', v_snap.price,
    'total_value', v_total,
    'cash', v_portfolio.cash
  );
end;
$$;

create or replace function settle_tournament(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t tournaments;
  v_close timestamptz;
  v_count int := 0;
begin
  select * into t from tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  t := tick_tournament_row(t);

  if t.status in ('completed', 'archived') then
    return jsonb_build_object('ok', true, 'already_settled', true, 'status', t.status);
  end if;

  if t.status not in ('locked', 'settling') then
    if now() < t.trading_closes_at then
      raise exception 'Tournament has not closed';
    end if;
    update tournaments set status = 'locked' where id = t.id returning * into t;
  end if;

  update tournaments set status = 'settling' where id = t.id returning * into t;
  v_close := t.trading_closes_at;

  -- Freeze one price per held asset as of trading close (latest snapshot at or before close)
  insert into tournament_settlement_prices (tournament_id, asset_id, price, price_snapshot_id, recorded_at)
  select
    p_tournament_id,
    pos.asset_id,
    snap.price,
    snap.snapshot_id,
    snap.recorded_at
  from (
    select distinct tp.asset_id
    from tournament_positions tp
    join tournament_portfolios pf on pf.id = tp.portfolio_id
    where pf.tournament_id = p_tournament_id
  ) pos
  join lateral (
    select s.id as snapshot_id, s.price, s.recorded_at
    from price_snapshots s
    where s.asset_id = pos.asset_id
      and s.recorded_at <= v_close
    order by s.recorded_at desc
    limit 1
  ) snap on true
  on conflict (tournament_id, asset_id) do nothing;

  if exists (
    select 1
    from tournament_positions tp
    join tournament_portfolios pf on pf.id = tp.portfolio_id
    left join tournament_settlement_prices sp
      on sp.tournament_id = p_tournament_id and sp.asset_id = tp.asset_id
    where pf.tournament_id = p_tournament_id
      and sp.asset_id is null
  ) then
    raise exception 'Missing settlement price for one or more holdings';
  end if;

  delete from tournament_results where tournament_id = p_tournament_id;

  insert into tournament_results (
    tournament_id, user_id, portfolio_id, cash, holdings_value, final_value, return_pct, rank
  )
  select
    ranked.tournament_id,
    ranked.user_id,
    ranked.portfolio_id,
    ranked.cash,
    ranked.holdings_value,
    ranked.final_value,
    ranked.return_pct,
    ranked.rank
  from (
    select
      pf.tournament_id,
      pf.user_id,
      pf.id as portfolio_id,
      pf.cash,
      coalesce(h.holdings_value, 0)::numeric(14,2) as holdings_value,
      (pf.cash + coalesce(h.holdings_value, 0))::numeric(14,2) as final_value,
      case
        when pf.starting_cash = 0 then 0
        else round((((pf.cash + coalesce(h.holdings_value, 0)) - pf.starting_cash) / pf.starting_cash) * 100, 4)
      end as return_pct,
      row_number() over (
        order by (pf.cash + coalesce(h.holdings_value, 0)) desc, part.joined_at asc, pf.user_id asc
      )::int as rank
    from tournament_portfolios pf
    join tournament_participants part on part.portfolio_id = pf.id
    left join (
      select
        tp.portfolio_id,
        sum(tp.quantity::numeric * sp.price) as holdings_value
      from tournament_positions tp
      join tournament_portfolios pf2 on pf2.id = tp.portfolio_id
      join tournament_settlement_prices sp
        on sp.tournament_id = pf2.tournament_id and sp.asset_id = tp.asset_id
      where pf2.tournament_id = p_tournament_id
      group by tp.portfolio_id
    ) h on h.portfolio_id = pf.id
    where pf.tournament_id = p_tournament_id
  ) ranked;

  get diagnostics v_count = row_count;

  update tournaments
  set status = 'completed', settled_at = now()
  where id = p_tournament_id;

  return jsonb_build_object('ok', true, 'already_settled', false, 'results', v_count);
end;
$$;

create or replace function tick_tournaments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t tournaments;
  v_id uuid;
  v_ticked int := 0;
  v_settled int := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  for t in select * from tournaments where status in ('upcoming', 'active', 'locked', 'settling')
  loop
    perform tick_tournament_row(t);
    v_ticked := v_ticked + 1;
  end loop;

  for v_id in select id from tournaments where status in ('locked', 'settling')
  loop
    begin
      perform settle_tournament(v_id);
      v_settled := v_settled + 1;
    exception when others then
      v_errors := v_errors || jsonb_build_object('tournament_id', v_id, 'error', SQLERRM);
    end;
  end loop;

  return jsonb_build_object('ticked', v_ticked, 'settled', v_settled, 'errors', v_errors);
end;
$$;

-- Live (or frozen) standings. After close, values use prices as of trading_closes_at
-- (or stored settlement prices). Completed tournaments return locked results only.
create or replace function get_tournament_standings(p_tournament_id uuid)
returns table (
  user_id uuid,
  display_name text,
  cash numeric,
  holdings_value numeric,
  portfolio_value numeric,
  return_pct numeric,
  rank integer,
  frozen boolean,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t tournaments;
  v_as_of timestamptz;
begin
  select * into t from tournaments where id = p_tournament_id;
  if not found then
    raise exception 'Tournament not found';
  end if;

  t := tick_tournament_row(t);

  if t.status in ('completed', 'archived') then
    return query
    select
      r.user_id,
      coalesce(nullif(pr.display_name, ''), split_part(pr.email, '@', 1), 'Player')::text,
      r.cash,
      r.holdings_value,
      r.final_value,
      r.return_pct,
      r.rank,
      true,
      part.joined_at
    from tournament_results r
    join profiles pr on pr.id = r.user_id
    join tournament_participants part on part.portfolio_id = r.portfolio_id
    where r.tournament_id = p_tournament_id
    order by r.rank;
    return;
  end if;

  if t.status in ('locked', 'settling') then
    v_as_of := t.trading_closes_at;
  else
    v_as_of := now();
  end if;

  return query
  select
    ranked.user_id,
    ranked.display_name,
    ranked.cash,
    ranked.holdings_value,
    ranked.portfolio_value,
    ranked.return_pct,
    ranked.rank,
    false,
    ranked.joined_at
  from (
    select
      pf.user_id,
      coalesce(nullif(pr.display_name, ''), split_part(pr.email, '@', 1), 'Player')::text as display_name,
      pf.cash,
      coalesce(h.holdings_value, 0)::numeric(14,2) as holdings_value,
      (pf.cash + coalesce(h.holdings_value, 0))::numeric(14,2) as portfolio_value,
      case
        when pf.starting_cash = 0 then 0
        else round((((pf.cash + coalesce(h.holdings_value, 0)) - pf.starting_cash) / pf.starting_cash) * 100, 4)
      end as return_pct,
      row_number() over (
        order by (pf.cash + coalesce(h.holdings_value, 0)) desc, part.joined_at asc, pf.user_id asc
      )::int as rank,
      part.joined_at
    from tournament_portfolios pf
    join tournament_participants part on part.portfolio_id = pf.id
    join profiles pr on pr.id = pf.user_id
    left join (
      select
        tp.portfolio_id,
        sum(tp.quantity::numeric * coalesce(sp.price, snap.price, 0)) as holdings_value
      from tournament_positions tp
      join tournament_portfolios pf2 on pf2.id = tp.portfolio_id
      left join tournament_settlement_prices sp
        on sp.tournament_id = pf2.tournament_id and sp.asset_id = tp.asset_id
      left join lateral (
        select s.price
        from price_snapshots s
        where s.asset_id = tp.asset_id
          and s.recorded_at <= v_as_of
        order by s.recorded_at desc
        limit 1
      ) snap on true
      where pf2.tournament_id = p_tournament_id
      group by tp.portfolio_id
    ) h on h.portfolio_id = pf.id
    where pf.tournament_id = p_tournament_id
  ) ranked;
end;
$$;

revoke all on function join_tournament(uuid, uuid) from public;
revoke all on function execute_tournament_trade(uuid, uuid, uuid, trade_side, integer) from public;
revoke all on function settle_tournament(uuid) from public;
revoke all on function tick_tournaments() from public;
revoke all on function tick_tournament_row(tournaments) from public;
revoke all on function get_tournament_standings(uuid) from public;

grant execute on function join_tournament(uuid, uuid) to service_role;
grant execute on function execute_tournament_trade(uuid, uuid, uuid, trade_side, integer) to service_role;
grant execute on function settle_tournament(uuid) to service_role;
grant execute on function tick_tournaments() to service_role;
grant execute on function get_tournament_standings(uuid) to anon, authenticated, service_role;

grant select on tournaments to anon, authenticated, service_role;
grant select on tournament_participants to anon, authenticated, service_role;
grant select on tournament_settlement_prices to anon, authenticated, service_role;
grant select on tournament_results to anon, authenticated, service_role;
grant select on tournament_portfolios to authenticated, service_role;
grant select on tournament_positions to authenticated, service_role;
grant select on tournament_transactions to authenticated, service_role;

grant insert, update, delete on tournaments to service_role;
grant insert, update, delete on tournament_portfolios to service_role;
grant insert, update, delete on tournament_participants to service_role;
grant insert, update, delete on tournament_positions to service_role;
grant insert, update, delete on tournament_transactions to service_role;
grant insert, update, delete on tournament_settlement_prices to service_role;
grant insert, update, delete on tournament_results to service_role;

alter view asset_latest_prices set (security_invoker = true);
