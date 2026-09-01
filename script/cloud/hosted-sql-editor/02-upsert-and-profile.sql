-- SQL editor safe. Expected warning: DROP unused league trigger/column on profiles.
-- Catalog rows are not deleted.

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
as $upsert_asset$
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
$upsert_asset$;

drop trigger if exists trg_update_league_count on profiles;
drop function if exists update_league_player_count();
alter table profiles drop constraint if exists profiles_current_league_id_fkey;
drop index if exists idx_profiles_league;
alter table profiles drop column if exists current_league_id;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $handle_new_user$
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
$handle_new_user$;

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
