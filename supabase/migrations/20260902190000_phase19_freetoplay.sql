-- Phase 19: explicit free-to-play. Entry is always free. Optional qualifier
-- gates a later tournament by a prior finish — still no cash entry.

alter table tournaments
  add column if not exists entry_mode text not null default 'free';

alter table tournaments
  drop constraint if exists tournaments_entry_mode_check;

alter table tournaments
  add constraint tournaments_entry_mode_check
  check (entry_mode = 'free');

alter table tournaments
  add column if not exists qualifier_tournament_id uuid references tournaments(id) on delete set null;

alter table tournaments
  add column if not exists qualifier_max_rank integer not null default 3
    check (qualifier_max_rank >= 1);

create or replace function join_tournament(
  p_user_id uuid,
  p_tournament_id uuid,
  p_invite_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t tournaments;
  v_portfolio uuid;
  v_qual_rank integer;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'Profile required';
  end if;

  select * into t from tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  t := tick_tournament_row(t);

  if t.status not in ('upcoming', 'active') then
    raise exception 'Tournament is not open to join';
  end if;

  if t.entry_mode <> 'free' then
    raise exception 'Only free tournaments are open';
  end if;

  if t.visibility = 'private' then
    if t.created_by is distinct from p_user_id
       and (t.invite_code is null or p_invite_code is null or t.invite_code <> p_invite_code) then
      raise exception 'Private tournament requires a valid invite';
    end if;
  end if;

  if t.qualifier_tournament_id is not null then
    select r.rank into v_qual_rank
    from tournament_results r
    where r.tournament_id = t.qualifier_tournament_id
      and r.user_id = p_user_id;
    if v_qual_rank is null or v_qual_rank > t.qualifier_max_rank then
      raise exception 'Qualifier finish required';
    end if;
  end if;

  select id into v_portfolio
  from tournament_portfolios
  where tournament_id = p_tournament_id and user_id = p_user_id;

  if v_portfolio is not null then
    return v_portfolio;
  end if;

  insert into tournament_portfolios (tournament_id, user_id, starting_cash, cash)
  values (p_tournament_id, p_user_id, t.starting_budget, t.starting_budget)
  returning id into v_portfolio;

  insert into tournament_participants (tournament_id, user_id, portfolio_id)
  values (p_tournament_id, p_user_id, v_portfolio);

  perform record_activity(
    p_user_id,
    'joined',
    'tournament',
    p_tournament_id,
    'joined ' || t.name
  );

  return v_portfolio;
end;
$$;

revoke all on function join_tournament(uuid, uuid, text) from public;
grant execute on function join_tournament(uuid, uuid, text) to service_role;
