-- SQL editor safe. Standings RPC + grants.

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
as $standings$
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
$standings$;

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
