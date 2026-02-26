-- Fix handle_new_user() to include 'registration' contest status
-- Previously only checked for 'pending' and 'active', missing users who
-- sign up during the registration window.

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
  );

  if active_contest is not null and open_league is not null then
    insert into portfolios (user_id, contest_id, league_id)
    values (NEW.id, active_contest, open_league);
  end if;

  return NEW;
end;
$$ language plpgsql security definer;
