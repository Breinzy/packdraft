-- Phase 14: Market Events. Prediction competitions, isolated from Career and
-- tournament books. No cash, positions, or transfers.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'market_event_type') then
    create type market_event_type as enum (
      'release_price',
      'direction',
      'ranking',
      'biggest_mover'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'market_event_status') then
    create type market_event_status as enum (
      'upcoming',
      'open',
      'locked',
      'settling',
      'completed',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists market_events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  type          market_event_type not null,
  status        market_event_status not null default 'upcoming',
  opens_at      timestamptz not null,
  locks_at      timestamptz not null,
  settles_at    timestamptz not null,
  created_by    uuid references profiles(id) on delete set null,
  settled_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (locks_at > opens_at),
  check (settles_at > locks_at)
);

create table if not exists market_event_assets (
  event_id            uuid not null references market_events(id) on delete cascade,
  asset_id            uuid not null references assets(id) on delete restrict,
  sort_order          integer not null default 0,
  start_price         numeric(14,2),
  start_snapshot_id   uuid references price_snapshots(id) on delete set null,
  start_recorded_at   timestamptz,
  start_method        text,
  end_price           numeric(14,2),
  end_snapshot_id     uuid references price_snapshots(id) on delete set null,
  end_recorded_at     timestamptz,
  end_method          text,
  primary key (event_id, asset_id)
);

create table if not exists market_event_entries (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references market_events(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  payload       jsonb not null,
  submitted_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists market_event_results (
  event_id    uuid not null references market_events(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  score       numeric(12,4) not null,
  rank        integer not null check (rank >= 1),
  detail      jsonb not null default '{}'::jsonb,
  locked_at   timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_market_events_status on market_events (status, opens_at);
create index if not exists idx_market_event_entries_user on market_event_entries (user_id, submitted_at desc);
create index if not exists idx_market_event_results_rank on market_event_results (event_id, rank);

alter table market_events enable row level security;
alter table market_event_assets enable row level security;
alter table market_event_entries enable row level security;
alter table market_event_results enable row level security;

drop policy if exists "Market events are public" on market_events;
create policy "Market events are public" on market_events for select using (true);

drop policy if exists "Market event assets are public" on market_event_assets;
create policy "Market event assets are public" on market_event_assets for select using (true);

drop policy if exists "Market event results are public" on market_event_results;
create policy "Market event results are public" on market_event_results for select using (true);

drop policy if exists "Own market event entries" on market_event_entries;
create policy "Own market event entries" on market_event_entries
  for select using (user_id = auth.uid());

drop policy if exists "Locked market event entries are public" on market_event_entries;
create policy "Locked market event entries are public" on market_event_entries
  for select using (
    exists (
      select 1 from market_events e
      where e.id = event_id
        and e.status in ('locked', 'settling', 'completed', 'cancelled')
    )
  );

grant select on market_events to anon, authenticated, service_role;
grant select on market_event_assets to anon, authenticated, service_role;
grant select on market_event_entries to anon, authenticated, service_role;
grant select on market_event_results to anon, authenticated, service_role;
grant insert, update, delete on market_events to service_role;
grant insert, update, delete on market_event_assets to service_role;
grant insert, update, delete on market_event_entries to service_role;
grant insert, update, delete on market_event_results to service_role;

create or replace function freeze_market_event_prices(
  p_event_id uuid,
  p_phase text,
  p_as_of timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  snap record;
  v_missing int := 0;
begin
  if p_phase not in ('start', 'end') then
    raise exception 'Phase must be start or end';
  end if;

  for r in
    select asset_id
    from market_event_assets
    where event_id = p_event_id
  loop
    select * into snap from packdraft_settlement_price(r.asset_id, p_as_of);
    if not found or snap.price is null then
      v_missing := v_missing + 1;
      continue;
    end if;

    if p_phase = 'start' then
      update market_event_assets
      set
        start_price = snap.price,
        start_snapshot_id = snap.snapshot_id,
        start_recorded_at = snap.recorded_at,
        start_method = snap.method
      where event_id = p_event_id and asset_id = r.asset_id and start_price is null;
    else
      update market_event_assets
      set
        end_price = snap.price,
        end_snapshot_id = snap.snapshot_id,
        end_recorded_at = snap.recorded_at,
        end_method = snap.method
      where event_id = p_event_id and asset_id = r.asset_id and end_price is null;
    end if;
  end loop;

  if p_phase = 'start' then
    select count(*) into v_missing
    from market_event_assets
    where event_id = p_event_id and start_price is null;
  else
    select count(*) into v_missing
    from market_event_assets
    where event_id = p_event_id and end_price is null;
  end if;

  if v_missing > 0 then
    raise exception 'Missing settlement price for one or more event assets';
  end if;

  return jsonb_build_object('ok', true, 'phase', p_phase);
end;
$$;

create or replace function submit_market_event_entry(
  p_user_id uuid,
  p_event_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e market_events;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'Profile required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload is required';
  end if;

  select * into e from market_events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found';
  end if;

  if e.status <> 'open' or now() < e.opens_at or now() >= e.locks_at then
    raise exception 'Event is not open for entries';
  end if;

  insert into market_event_entries (event_id, user_id, payload, submitted_at)
  values (p_event_id, p_user_id, p_payload, now())
  on conflict (event_id, user_id) do update
    set payload = excluded.payload,
        submitted_at = now();

  return jsonb_build_object('ok', true, 'event_id', p_event_id);
end;
$$;

revoke all on function freeze_market_event_prices(uuid, text, timestamptz) from public;
revoke all on function submit_market_event_entry(uuid, uuid, jsonb) from public;
grant execute on function freeze_market_event_prices(uuid, text, timestamptz) to service_role;
grant execute on function submit_market_event_entry(uuid, uuid, jsonb) to service_role;
