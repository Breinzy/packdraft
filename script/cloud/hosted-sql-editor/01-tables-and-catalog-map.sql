-- SQL editor safe. Expected warning: DROP of unused league trigger/column.
-- Does NOT delete products, contests, or price history.

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
  tcg_id, set_id, name, asset_type, external_id, image_url, metadata, active, legacy_product_id
)
select
  t.id,
  s.id,
  p.name,
  case when p.category = 'graded' then 'graded' else 'sealed' end,
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
left join sets s on s.tcg_id = t.id and s.name = p.set_name
where t.slug = 'pokemon'
  and not exists (select 1 from assets a where a.legacy_product_id = p.id)
  and (
    nullif(p.tcgplayer_id, '') is null
    or not exists (
      select 1 from assets a
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
