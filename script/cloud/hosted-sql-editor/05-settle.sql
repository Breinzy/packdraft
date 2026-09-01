-- SQL editor safe. Settlement + daily tick.
-- Warning about DELETE is the function body, not a live wipe.

create or replace function settle_tournament(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $settle$
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
$settle$;

create or replace function tick_tournaments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $tick_all$
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
$tick_all$;
