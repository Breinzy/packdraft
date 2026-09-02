-- Phase 20: release campaigns group a tournament and prediction events
-- around a TCG set drop. No cash moves between the child competitions.

create table if not exists release_campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  set_id       uuid references sets(id) on delete set null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists release_campaign_items (
  campaign_id  uuid not null references release_campaigns(id) on delete cascade,
  kind         text not null check (kind in ('tournament', 'event')),
  target_id    uuid not null,
  sort_order   integer not null default 0,
  primary key (campaign_id, kind, target_id)
);

create index if not exists idx_release_campaigns_starts on release_campaigns (starts_at desc);

alter table release_campaigns enable row level security;
alter table release_campaign_items enable row level security;

drop policy if exists "Release campaigns are public" on release_campaigns;
create policy "Release campaigns are public" on release_campaigns for select using (true);

drop policy if exists "Release campaign items are public" on release_campaign_items;
create policy "Release campaign items are public" on release_campaign_items for select using (true);

grant select on release_campaigns to anon, authenticated, service_role;
grant select on release_campaign_items to anon, authenticated, service_role;
grant insert, update, delete on release_campaigns to service_role;
grant insert, update, delete on release_campaign_items to service_role;
