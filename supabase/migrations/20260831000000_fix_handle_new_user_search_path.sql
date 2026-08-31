-- handle_new_user() is a SECURITY DEFINER trigger on auth.users that fires as the
-- supabase_auth_admin role. That role's search_path does not include `public`, so the
-- unqualified table references (contests, leagues, profiles, portfolios) failed to
-- resolve and every signup aborted with "relation \"contests\" does not exist".
--
-- Pin an explicit search_path so name resolution is deterministic regardless of the
-- invoking role. This also resolves the Supabase "function_search_path_mutable" security
-- lint for SECURITY DEFINER functions. The function body is unchanged.

create or replace function handle_new_user()
returns trigger as $$
declare
  open_league uuid;
  active_contest uuid;
  league_name text;
begin
  select id into active_contest
  from contests
  where status in ('registration', 'pending', 'active')
  order by starts_at asc
  limit 1;

  if active_contest is not null then
    select id into open_league
    from leagues
    where contest_id = active_contest and is_full = false
    order by created_at asc
    limit 1;

    if open_league is null then
      league_name := 'League-' || substr(gen_random_uuid()::text, 1, 6);
      insert into leagues (name, contest_id)
      values (league_name, active_contest)
      returning id into open_league;
    end if;
  end if;

  insert into profiles (id, email, display_name, current_league_id)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    open_league
  )
  on conflict (id) do nothing;

  if active_contest is not null and open_league is not null then
    insert into portfolios (user_id, contest_id, league_id)
    values (NEW.id, active_contest, open_league)
    on conflict do nothing;
  end if;

  return NEW;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
