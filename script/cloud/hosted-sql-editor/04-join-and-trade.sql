-- SQL editor safe. tick + join + trade RPCs.

create or replace function tick_tournament_row(t tournaments)
returns tournaments
language plpgsql
as $tick_row$
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
$tick_row$;

create or replace function join_tournament(p_user_id uuid, p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $join_tournament$
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
$join_tournament$;

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
as $execute_trade$
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
$execute_trade$;
