-- =============================================================
-- PHASE 2 — Market + user data foundation
--
-- Adds provider-agnostic market tables, maps the existing
-- Pokemon catalog into them, and stops auto-assigning leagues
-- on signup. Does not drop legacy contest tables or product rows.
-- =============================================================

-- -------------------------------------------
-- TCGS / SETS / ASSETS
-- -------------------------------------------

create table if not exists tcgs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists sets (
  id            uuid primary key default gen_random_uuid(),
  tcg_id        uuid not null references tcgs(id) on delete restrict,
  name          text not null,
  slug          text,
  release_date  date,
  created_at    timestamptz not null default now(),
  unique (tcg_id, name)
);

create index if not exists idx_sets_tcg on sets (tcg_id);

create table if not exists assets (
  id                  uuid primary key default gen_random_uuid(),
  tcg_id              uuid not null references tcgs(id) on delete restrict,
  set_id              uuid references sets(id) on delete set null,
  name                text not null,
  asset_type          text not null check (asset_type in ('sealed', 'single', 'graded')),
  external_id         text,
  image_url           text,
  metadata            jsonb not null default '{}'::jsonb,
  active              boolean not null default true,
  legacy_product_id   uuid unique,
  created_at          timestamptz not null default now()
);

create index if not exists idx_assets_tcg on assets (tcg_id);
create index if not exists idx_assets_set on assets (set_id);
create index if not exists idx_assets_active on assets (active) where active = true;
create index if not exists idx_assets_external on assets (external_id) where external_id is not null;

create unique index if not exists uq_assets_provider_identity
  on assets (
    tcg_id,
    external_id,
    asset_type,
    coalesce(metadata->>'grade', '')
  )
  where external_id is not null;

-- -------------------------------------------
-- PRICE SNAPSHOTS — attach to assets
-- -------------------------------------------

alter table price_snapshots
  add column if not exists asset_id uuid references assets(id) on delete cascade;

alter table price_snapshots
  add column if not exists condition text;

alter table price_snapshots
  add column if not exists price_type text not null default 'market';

alter table price_snapshots
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table price_snapshots
  alter column source set default 'pokemonpricetracker';

alter table price_snapshots
  alter column product_id drop not null;

create index if not exists idx_snapshots_asset on price_snapshots (asset_id, recorded_at desc);

-- -------------------------------------------
-- SEED POKEMON + MAP EXISTING CATALOG
-- -------------------------------------------

insert into tcgs (slug, name)
values ('pokemon', 'Pokémon')
on conflict (slug) do nothing;

insert into sets (tcg_id, name)
select t.id, p.set_name
from products p
cross join tcgs t
where t.slug = 'pokemon'
  and p.set_name is not null
  and length(trim(p.set_name)) > 0
on conflict (tcg_id, name) do nothing;

insert into assets (
  tcg_id,
  set_id,
  name,
  asset_type,
  external_id,
  image_url,
  metadata,
  active,
  legacy_product_id
)
select
  t.id,
  s.id,
  p.name,
  case
    when p.category = 'graded' then 'graded'
    else 'sealed'
  end,
  nullif(p.tcgplayer_id, ''),
  case
    when p.image_code is not null and p.image_code like 'http%' then p.image_code
    else null
  end,
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_type', p.type,
    'legacy_category', p.category,
    'card_name', p.card_name,
    'card_number', p.card_number,
    'grade', p.psa_grade,
    'image_code', p.image_code
  )),
  p.is_active,
  p.id
from products p
cross join tcgs t
left join sets s
  on s.tcg_id = t.id
 and s.name = p.set_name
where t.slug = 'pokemon'
  and not exists (
    select 1 from assets a where a.legacy_product_id = p.id
  )
  and (
    nullif(p.tcgplayer_id, '') is null
    or not exists (
      select 1
      from assets a
      where a.tcg_id = t.id
        and a.external_id = nullif(p.tcgplayer_id, '')
        and a.asset_type = case when p.category = 'graded' then 'graded' else 'sealed' end
        and coalesce(a.metadata->>'grade', '') = coalesce(p.psa_grade::text, '')
    )
  );

update price_snapshots ps
set
  asset_id = a.id,
  condition = case
    when a.asset_type = 'graded' and a.metadata->>'grade' is not null
      then 'PSA ' || (a.metadata->>'grade')
    when a.asset_type = 'sealed' then 'unopened'
    else ps.condition
  end,
  price_type = case
    when a.asset_type = 'graded' then 'ebay_smart'
    when a.asset_type = 'sealed' then 'unopened'
    else coalesce(ps.price_type, 'market')
  end
from assets a
where a.legacy_product_id = ps.product_id
  and ps.asset_id is null;

-- -------------------------------------------
-- UPSERT ASSET (provider import)
-- -------------------------------------------

create or replace function upsert_asset(
  p_tcg_slug text,
  p_set_name text,
  p_name text,
  p_asset_type text,
  p_external_id text,
  p_image_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_active boolean default true
) returns uuid
language plpgsql
as $$
declare
  v_tcg_id uuid;
  v_set_id uuid;
  v_id uuid;
  v_grade text;
begin
  if p_asset_type not in ('sealed', 'single', 'graded') then
    raise exception 'Invalid asset_type: %', p_asset_type;
  end if;

  select id into v_tcg_id from tcgs where slug = p_tcg_slug;
  if v_tcg_id is null then
    raise exception 'Unknown tcg slug: %', p_tcg_slug;
  end if;

  if p_set_name is not null and length(trim(p_set_name)) > 0 then
    insert into sets (tcg_id, name)
    values (v_tcg_id, p_set_name)
    on conflict (tcg_id, name) do update set name = excluded.name
    returning id into v_set_id;

    if v_set_id is null then
      select id into v_set_id from sets where tcg_id = v_tcg_id and name = p_set_name;
    end if;
  end if;

  v_grade := coalesce(p_metadata->>'grade', '');

  if p_external_id is not null then
    update assets
    set
      name = p_name,
      set_id = coalesce(v_set_id, set_id),
      image_url = coalesce(p_image_url, image_url),
      metadata = coalesce(p_metadata, metadata),
      active = p_active
    where tcg_id = v_tcg_id
      and external_id = p_external_id
      and asset_type = p_asset_type
      and coalesce(metadata->>'grade', '') = v_grade
    returning id into v_id;
  end if;

  if v_id is null then
    insert into assets (
      tcg_id, set_id, name, asset_type, external_id, image_url, metadata, active
    ) values (
      v_tcg_id, v_set_id, p_name, p_asset_type, p_external_id, p_image_url,
      coalesce(p_metadata, '{}'::jsonb), p_active
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- -------------------------------------------
-- PROFILES: strip league assignment
-- -------------------------------------------

-- The legacy weekly-league player-count trigger/function reference current_league_id,
-- so they must be removed before the column can be dropped.
drop trigger if exists trg_update_league_count on profiles;
drop function if exists update_league_player_count();
alter table profiles drop constraint if exists profiles_current_league_id_fkey;
drop index if exists idx_profiles_league;
alter table profiles drop column if exists current_league_id;

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, display_name, display_name_set)
  values (
    NEW.id,
    NEW.email,
    coalesce(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    false
  )
  on conflict (id) do nothing;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- -------------------------------------------
-- RLS
-- -------------------------------------------

alter table tcgs enable row level security;
alter table sets enable row level security;
alter table assets enable row level security;

drop policy if exists "Tcgs are public" on tcgs;
create policy "Tcgs are public" on tcgs for select using (true);

drop policy if exists "Sets are public" on sets;
create policy "Sets are public" on sets for select using (true);

drop policy if exists "Assets are public" on assets;
create policy "Assets are public" on assets for select using (true);

drop policy if exists "Snapshots are public" on price_snapshots;
create policy "Snapshots are public" on price_snapshots for select using (true);
