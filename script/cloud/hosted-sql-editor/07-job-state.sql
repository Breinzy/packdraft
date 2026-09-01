-- SQL editor safe. Import/sync job cursor.

create table if not exists market_job_state (
  job text primary key check (job in ('catalog_import', 'price_sync')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'paused', 'completed', 'failed')),
  stage text not null default 'sealed',
  sealed_offset integer not null default 0,
  set_index integer not null default 0,
  graded_offset integer not null default 0,
  last_asset_id uuid,
  sealed_imported integer not null default 0,
  singles_imported integer not null default 0,
  graded_imported integer not null default 0,
  snapshots_written integer not null default 0,
  pages_fetched integer not null default 0,
  assets_visited integer not null default 0,
  credits_used integer not null default 0,
  daily_remaining integer,
  export_sealed_done boolean not null default false,
  export_unavailable boolean not null default false,
  last_error text,
  stop_reason text,
  last_run_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table market_job_state enable row level security;

drop policy if exists "Market job state is readable" on market_job_state;
create policy "Market job state is readable"
  on market_job_state for select using (true);

insert into market_job_state (job, status, stage)
values
  ('catalog_import', 'pending', 'sealed'),
  ('price_sync', 'pending', 'assets')
on conflict (job) do nothing;
