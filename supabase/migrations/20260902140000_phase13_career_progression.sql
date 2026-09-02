-- Phase 13: public Career standings. Progression (levels, archetypes, milestones)
-- is derived in application code from the existing career ledger and snapshots.
-- This RPC is security definer so one player can see ranks without reading
-- another player's positions or cash rows (RLS still hides those tables).

create or replace function get_career_standings()
returns table (
  user_id uuid,
  display_name text,
  portfolio_value numeric,
  return_pct numeric,
  rank integer
)
language sql
stable
security definer
set search_path = public
as $$
  with marked as (
    select
      cp.user_id,
      cp.starting_cash,
      (cp.cash + coalesce(sum(pos.quantity::numeric * lp.price), 0))::numeric(14,2) as portfolio_value
    from career_portfolios cp
    left join career_positions pos on pos.portfolio_id = cp.id
    left join asset_latest_prices lp on lp.asset_id = pos.asset_id
    group by cp.id, cp.user_id, cp.starting_cash, cp.cash
  )
  select
    m.user_id,
    coalesce(nullif(p.display_name, ''), split_part(p.email, '@', 1), 'Player') as display_name,
    m.portfolio_value,
    case
      when m.starting_cash = 0 then 0
      else round(((m.portfolio_value - m.starting_cash) / m.starting_cash) * 100, 4)
    end as return_pct,
    row_number() over (order by m.portfolio_value desc, m.user_id asc)::int as rank
  from marked m
  join profiles p on p.id = m.user_id
  order by rank;
$$;

revoke all on function get_career_standings() from public;
grant execute on function get_career_standings() to anon, authenticated, service_role;
