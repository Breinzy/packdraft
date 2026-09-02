-- Phase 15: competition settlement price (not last sale).
-- Window [as_of - 24h, as_of], IQR outlier drop when 4+ prints, then median/mean/single.
-- Fallback: latest snapshot at or before as_of. Fail the caller if that is also missing.

create or replace function packdraft_settlement_price(
  p_asset_id uuid,
  p_as_of timestamptz
)
returns table (
  price numeric(14,2),
  method text,
  sample_size integer,
  snapshot_id uuid,
  recorded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with windowed as (
    select s.id, s.price, s.recorded_at
    from price_snapshots s
    where s.asset_id = p_asset_id
      and s.recorded_at <= p_as_of
      and s.recorded_at >= p_as_of - interval '24 hours'
      and s.price > 0
  ),
  stats as (
    select
      count(*)::int as n,
      percentile_cont(0.25) within group (order by w.price) as q1,
      percentile_cont(0.75) within group (order by w.price) as q3
    from windowed w
  ),
  filtered as (
    select w.id, w.price, w.recorded_at
    from windowed w
    cross join stats s
    where s.n < 4
       or (s.q3 - s.q1) = 0
       or (
         w.price >= s.q1 - 1.5 * (s.q3 - s.q1)
         and w.price <= s.q3 + 1.5 * (s.q3 - s.q1)
       )
  ),
  agg as (
    select
      count(*)::int as n,
      percentile_cont(0.5) within group (order by f.price) as median_price,
      avg(f.price) as mean_price
    from filtered f
  ),
  single_row as (
    select f.id, f.price, f.recorded_at
    from filtered f
    order by f.recorded_at desc, f.id
    limit 1
  ),
  fallback as (
    select s.id, s.price, s.recorded_at
    from price_snapshots s
    where s.asset_id = p_asset_id
      and s.recorded_at <= p_as_of
      and s.price > 0
    order by s.recorded_at desc, s.id
    limit 1
  )
  select
    case
      when agg.n >= 3 then round(agg.median_price::numeric, 2)::numeric(14,2)
      when agg.n = 2 then round(agg.mean_price::numeric, 2)::numeric(14,2)
      when agg.n = 1 then round(single_row.price::numeric, 2)::numeric(14,2)
      else round(fallback.price::numeric, 2)::numeric(14,2)
    end as price,
    case
      when agg.n >= 3 then 'median'
      when agg.n = 2 then 'mean'
      when agg.n = 1 then 'single'
      else 'fallback'
    end as method,
    case
      when agg.n >= 1 then agg.n
      else 1
    end as sample_size,
    case
      when agg.n = 1 then single_row.id
      when agg.n = 0 then fallback.id
      else null
    end as snapshot_id,
    case
      when agg.n >= 2 then p_as_of
      when agg.n = 1 then single_row.recorded_at
      else fallback.recorded_at
    end as recorded_at
  from agg
  left join single_row on true
  left join fallback on true
  where agg.n >= 1 or fallback.id is not null;
$$;

revoke all on function packdraft_settlement_price(uuid, timestamptz) from public;
grant execute on function packdraft_settlement_price(uuid, timestamptz) to service_role, authenticated;

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
  join lateral packdraft_settlement_price(pos.asset_id, v_close) snap on true
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
