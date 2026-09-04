-- Set indexes: one Packdraft basket per Pokémon set.
-- Index level = sum of latest prices for every active member (singles, graded, sealed)
-- with price > 0. Not a provider field; derived from price_snapshots.

create or replace view set_latest_indexes as
select
  a.set_id,
  coalesce(sum(p.price) filter (where p.price > 0), 0)::numeric(14, 2) as index_price,
  count(*)::integer as tracked_count,
  count(*) filter (where a.asset_type = 'sealed')::integer as sealed_count,
  count(*) filter (where a.asset_type <> 'sealed')::integer as card_count,
  count(*) filter (where p.price > 0)::integer as priced_count
from assets a
left join asset_latest_prices p on p.asset_id = a.id
where a.active
  and a.set_id is not null
group by a.set_id;

grant select on set_latest_indexes to anon, authenticated;

-- Latest snapshot at or before p_at. Optional asset-id filter.
create or replace function latest_prices_at(p_at timestamptz, p_ids uuid[] default null)
returns table(asset_id uuid, price numeric, recorded_at timestamptz)
language sql
stable
security invoker
as $$
  select distinct on (s.asset_id)
    s.asset_id,
    s.price,
    s.recorded_at
  from price_snapshots s
  where s.asset_id is not null
    and s.recorded_at <= p_at
    and s.price > 0
    and (p_ids is null or s.asset_id = any(p_ids))
  order by s.asset_id, s.recorded_at desc
$$;

grant execute on function latest_prices_at(timestamptz, uuid[]) to anon, authenticated;

-- Basket index for every set as of p_at (last observation carried forward).
create or replace function set_indexes_at(p_at timestamptz)
returns table(set_id uuid, index_price numeric)
language sql
stable
security invoker
as $$
  select
    a.set_id,
    coalesce(sum(p.price), 0)::numeric(14, 2) as index_price
  from assets a
  join latest_prices_at(p_at, null) p on p.asset_id = a.id
  where a.active
    and a.set_id is not null
  group by a.set_id
$$;

grant execute on function set_indexes_at(timestamptz) to anon, authenticated;
