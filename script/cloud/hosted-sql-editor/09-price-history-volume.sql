-- SQL editor safe. 6-month PPT history + volume stats.
-- history_backfill starts paused. Set indexes use these snapshots for 24h/30d.

alter table market_job_state
  drop constraint if exists market_job_state_job_check;

alter table market_job_state
  add constraint market_job_state_job_check
  check (job in ('catalog_import', 'price_sync', 'history_backfill'));

insert into market_job_state (job, status, stage)
values ('history_backfill', 'paused', 'assets')
on conflict (job) do nothing;

create table if not exists asset_market_stats (
  asset_id           uuid primary key references assets(id) on delete cascade,
  volume_7d          integer not null default 0 check (volume_7d >= 0),
  volume_30d         integer not null default 0 check (volume_30d >= 0),
  volume_180d        integer not null default 0 check (volume_180d >= 0),
  history_points     integer not null default 0 check (history_points >= 0),
  last_price         numeric(14,2),
  last_volume        integer not null default 0 check (last_volume >= 0),
  last_point_date    date,
  daily_tier         text not null default 'skip'
                       check (daily_tier in ('always', 'high', 'normal', 'skip')),
  always_daily       boolean not null default false,
  history_synced_at  timestamptz,
  updated_at         timestamptz not null default now()
);

create index if not exists idx_asset_market_stats_tier_vol
  on asset_market_stats (daily_tier, volume_30d desc);

create index if not exists idx_asset_market_stats_always
  on asset_market_stats (always_daily)
  where always_daily;

alter table asset_market_stats enable row level security;

drop policy if exists "Asset market stats are public" on asset_market_stats;
create policy "Asset market stats are public"
  on asset_market_stats for select using (true);

grant select on asset_market_stats to anon, authenticated, service_role;
grant insert, update, delete on asset_market_stats to service_role;
