-- =============================================================
-- PHASE 12 — Career Mode (persistent solo book)
--
-- Isolated from tournament_* tables. Starting cash is $1,000.
-- Do not store career cash on profiles. Do not mix books.
-- =============================================================

create table career_portfolios (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  starting_cash   numeric(14,2) not null default 1000.00 check (starting_cash = 1000.00),
  cash            numeric(14,2) not null check (cash >= 0),
  created_at      timestamptz not null default now(),
  unique (user_id)
);

create table career_positions (
  id              uuid primary key default gen_random_uuid(),
  portfolio_id    uuid not null references career_portfolios(id) on delete cascade,
  asset_id        uuid not null references assets(id) on delete restrict,
  quantity        integer not null check (quantity > 0),
  average_cost    numeric(14,2) not null check (average_cost >= 0),
  unique (portfolio_id, asset_id)
);

create index idx_career_positions_portfolio on career_positions (portfolio_id);
create index idx_career_positions_asset on career_positions (asset_id);

create table career_transactions (
  id                    uuid primary key default gen_random_uuid(),
  portfolio_id          uuid not null references career_portfolios(id) on delete cascade,
  asset_id              uuid not null references assets(id) on delete restrict,
  side                  trade_side not null,
  quantity              integer not null check (quantity > 0),
  execution_price       numeric(14,2) not null check (execution_price >= 0),
  total_value           numeric(14,2) not null check (total_value >= 0),
  executed_at           timestamptz not null default now(),
  price_snapshot_id     uuid references price_snapshots(id) on delete set null
);

create index idx_career_transactions_portfolio on career_transactions (portfolio_id, executed_at desc);

create table career_value_snapshots (
  id              uuid primary key default gen_random_uuid(),
  portfolio_id    uuid not null references career_portfolios(id) on delete cascade,
  cash            numeric(14,2) not null,
  holdings_value  numeric(14,2) not null,
  portfolio_value numeric(14,2) not null,
  recorded_at     timestamptz not null default now()
);

create index idx_career_value_portfolio on career_value_snapshots (portfolio_id, recorded_at);

alter table career_portfolios enable row level security;
alter table career_positions enable row level security;
alter table career_transactions enable row level security;
alter table career_value_snapshots enable row level security;

create policy "Own career portfolio" on career_portfolios
  for select using (auth.uid() = user_id);

create policy "Own career positions" on career_positions
  for select using (
    exists (
      select 1 from career_portfolios p
      where p.id = career_positions.portfolio_id
        and p.user_id = auth.uid()
    )
  );

create policy "Own career transactions" on career_transactions
  for select using (
    exists (
      select 1 from career_portfolios p
      where p.id = career_transactions.portfolio_id
        and p.user_id = auth.uid()
    )
  );

create policy "Own career value snapshots" on career_value_snapshots
  for select using (
    exists (
      select 1 from career_portfolios p
      where p.id = career_value_snapshots.portfolio_id
        and p.user_id = auth.uid()
    )
  );

create or replace function career_mark_holdings(p_portfolio_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(pos.quantity::numeric * coalesce(snap.price, 0)), 0)::numeric(14,2)
  from career_positions pos
  left join lateral (
    select s.price
    from price_snapshots s
    where s.asset_id = pos.asset_id
    order by s.recorded_at desc
    limit 1
  ) snap on true
  where pos.portfolio_id = p_portfolio_id;
$$;

create or replace function career_record_value(p_portfolio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash numeric(14,2);
  v_holdings numeric(14,2);
begin
  select cash into v_cash from career_portfolios where id = p_portfolio_id;
  if v_cash is null then
    return;
  end if;
  v_holdings := career_mark_holdings(p_portfolio_id);
  insert into career_value_snapshots (portfolio_id, cash, holdings_value, portfolio_value)
  values (p_portfolio_id, v_cash, v_holdings, (v_cash + v_holdings)::numeric(14,2));
end;
$$;

create or replace function ensure_career_portfolio(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'Profile required';
  end if;

  select id into v_id from career_portfolios where user_id = p_user_id;
  if v_id is not null then
    return v_id;
  end if;

  insert into career_portfolios (user_id, starting_cash, cash)
  values (p_user_id, 1000.00, 1000.00)
  returning id into v_id;

  perform career_record_value(v_id);
  return v_id;
exception
  when unique_violation then
    select id into v_id from career_portfolios where user_id = p_user_id;
    return v_id;
end;
$$;

create or replace function execute_career_trade(
  p_user_id uuid,
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
  v_portfolio career_portfolios;
  v_asset assets;
  v_snap record;
  v_pos career_positions;
  v_total numeric(14,2);
  v_new_qty integer;
  v_new_avg numeric(14,2);
  v_tx uuid;
  v_holdings numeric(14,2);
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be a positive integer';
  end if;

  perform ensure_career_portfolio(p_user_id);

  select * into v_portfolio
  from career_portfolios
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'Career book not found';
  end if;

  select * into v_asset from assets where id = p_asset_id;
  if not found or v_asset.active is not true then
    raise exception 'Asset is not tradable';
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
  from career_positions
  where portfolio_id = v_portfolio.id and asset_id = p_asset_id
  for update;

  if p_side = 'buy' then
    if v_total > v_portfolio.cash then
      raise exception 'Insufficient cash';
    end if;

    if v_pos.id is null then
      insert into career_positions (portfolio_id, asset_id, quantity, average_cost)
      values (v_portfolio.id, p_asset_id, p_quantity, v_snap.price);
    else
      v_new_qty := v_pos.quantity + p_quantity;
      v_new_avg := round(
        ((v_pos.quantity::numeric * v_pos.average_cost) + v_total) / v_new_qty::numeric,
        2
      );
      update career_positions
      set quantity = v_new_qty, average_cost = v_new_avg
      where id = v_pos.id;
    end if;

    update career_portfolios
    set cash = cash - v_total
    where id = v_portfolio.id;
  else
    if v_pos.id is null or v_pos.quantity < p_quantity then
      raise exception 'Insufficient holdings';
    end if;

    v_new_qty := v_pos.quantity - p_quantity;
    if v_new_qty = 0 then
      delete from career_positions where id = v_pos.id;
    else
      update career_positions set quantity = v_new_qty where id = v_pos.id;
    end if;

    update career_portfolios
    set cash = cash + v_total
    where id = v_portfolio.id;
  end if;

  insert into career_transactions (
    portfolio_id, asset_id, side, quantity, execution_price, total_value, price_snapshot_id
  ) values (
    v_portfolio.id, p_asset_id, p_side, p_quantity, v_snap.price, v_total, v_snap.id
  ) returning id into v_tx;

  select cash into v_portfolio.cash from career_portfolios where id = v_portfolio.id;
  perform career_record_value(v_portfolio.id);
  v_holdings := career_mark_holdings(v_portfolio.id);

  return jsonb_build_object(
    'transaction_id', v_tx,
    'execution_price', v_snap.price,
    'total_value', v_total,
    'cash', v_portfolio.cash,
    'holdings_value', v_holdings,
    'portfolio_value', (v_portfolio.cash + v_holdings)
  );
end;
$$;

revoke all on function career_mark_holdings(uuid) from public;
revoke all on function career_record_value(uuid) from public;
revoke all on function ensure_career_portfolio(uuid) from public;
revoke all on function execute_career_trade(uuid, uuid, trade_side, integer) from public;

grant execute on function ensure_career_portfolio(uuid) to service_role;
grant execute on function execute_career_trade(uuid, uuid, trade_side, integer) to service_role;

grant select on career_portfolios to authenticated, service_role;
grant select on career_positions to authenticated, service_role;
grant select on career_transactions to authenticated, service_role;
grant select on career_value_snapshots to authenticated, service_role;

grant insert, update, delete on career_portfolios to service_role;
grant insert, update, delete on career_positions to service_role;
grant insert, update, delete on career_transactions to service_role;
grant insert, update, delete on career_value_snapshots to service_role;
