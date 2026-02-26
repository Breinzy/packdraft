-- Add configurable max_players to leagues instead of hardcoding 20
alter table leagues add column max_players int not null default 20;

-- Update the trigger to use the league's own max_players
create or replace function update_league_player_count()
returns trigger as $$
declare
  league_max int;
begin
  select max_players into league_max
  from leagues
  where id = NEW.current_league_id;

  update leagues
  set player_count = player_count + 1,
      is_full = (player_count + 1 >= league_max)
  where id = NEW.current_league_id;

  return NEW;
end;
$$ language plpgsql;
