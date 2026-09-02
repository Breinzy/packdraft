-- Phase 16: social graph, activity, public/private tournaments, invite codes.
-- Does not mix Career cash into social or tournaments.

alter table tournaments
  add column if not exists visibility text not null default 'public';

alter table tournaments
  drop constraint if exists tournaments_visibility_check;

alter table tournaments
  add constraint tournaments_visibility_check
  check (visibility in ('public', 'private'));

alter table tournaments
  add column if not exists invite_code text;

create unique index if not exists uq_tournaments_invite_code
  on tournaments (invite_code)
  where invite_code is not null;

create table if not exists friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists uq_friendships_pair
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  followee_id  uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists activity_events (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references profiles(id) on delete cascade,
  verb         text not null,
  object_type  text not null,
  object_id    uuid,
  summary      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_activity_actor_created on activity_events (actor_id, created_at desc);
create index if not exists idx_friendships_addressee on friendships (addressee_id, status);
create index if not exists idx_follows_followee on follows (followee_id);

alter table friendships enable row level security;
alter table follows enable row level security;
alter table activity_events enable row level security;

drop policy if exists "Own friendships" on friendships;
create policy "Own friendships" on friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "Follows are public" on follows;
create policy "Follows are public" on follows for select using (true);

drop policy if exists "Feed for self follows friends" on activity_events;
create policy "Feed for self follows friends" on activity_events
  for select using (
    actor_id = auth.uid()
    or exists (
      select 1 from follows f
      where f.follower_id = auth.uid() and f.followee_id = actor_id
    )
    or exists (
      select 1 from friendships fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = auth.uid() and fr.addressee_id = actor_id)
          or (fr.addressee_id = auth.uid() and fr.requester_id = actor_id)
        )
    )
  );

grant select on friendships to authenticated, service_role;
grant select on follows to anon, authenticated, service_role;
grant select on activity_events to authenticated, service_role;
grant insert, update, delete on friendships to service_role;
grant insert, update, delete on follows to service_role;
grant insert, update, delete on activity_events to service_role;

drop policy if exists "Tournaments are public" on tournaments;
drop policy if exists "Visible tournaments" on tournaments;
create policy "Visible tournaments" on tournaments
  for select using (
    visibility = 'public'
    or created_by = auth.uid()
    or exists (
      select 1 from tournament_participants p
      where p.tournament_id = tournaments.id and p.user_id = auth.uid()
    )
  );

create or replace function record_activity(
  p_actor_id uuid,
  p_verb text,
  p_object_type text,
  p_object_id uuid,
  p_summary text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into activity_events (actor_id, verb, object_type, object_id, summary)
  values (p_actor_id, p_verb, p_object_type, p_object_id, p_summary)
  returning id into v_id;
  return v_id;
end;
$$;

drop function if exists join_tournament(uuid, uuid);

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

  if t.visibility = 'private' then
    if t.created_by is distinct from p_user_id
       and (t.invite_code is null or p_invite_code is null or t.invite_code <> p_invite_code) then
      raise exception 'Private tournament requires a valid invite';
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

create or replace function request_friendship(p_user_id uuid, p_addressee_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing friendships;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_addressee_id is null or p_addressee_id = p_user_id then
    raise exception 'Cannot friend yourself';
  end if;
  if not exists (select 1 from profiles where id = p_addressee_id) then
    raise exception 'Player not found';
  end if;

  select * into v_existing
  from friendships
  where least(requester_id, addressee_id) = least(p_user_id, p_addressee_id)
    and greatest(requester_id, addressee_id) = greatest(p_user_id, p_addressee_id);

  if found then
    if v_existing.status = 'accepted' then
      return v_existing.id;
    end if;
    if v_existing.status = 'pending' then
      return v_existing.id;
    end if;
    update friendships
    set status = 'pending', requester_id = p_user_id, addressee_id = p_addressee_id,
        created_at = now(), responded_at = null
    where id = v_existing.id
    returning id into v_id;
    return v_id;
  end if;

  insert into friendships (requester_id, addressee_id, status)
  values (p_user_id, p_addressee_id, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function respond_friendship(p_user_id uuid, p_friendship_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  f friendships;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  select * into f from friendships where id = p_friendship_id for update;
  if not found then
    raise exception 'Friend request not found';
  end if;
  if f.addressee_id <> p_user_id then
    raise exception 'Friend request not found';
  end if;
  if f.status <> 'pending' then
    return f.id;
  end if;

  update friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = f.id;

  if p_accept then
    perform record_activity(p_user_id, 'friended', 'player', f.requester_id, 'became friends');
    perform record_activity(f.requester_id, 'friended', 'player', p_user_id, 'became friends');
  end if;
  return f.id;
end;
$$;

create or replace function follow_user(p_user_id uuid, p_followee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_followee_id is null or p_followee_id = p_user_id then
    raise exception 'Cannot follow yourself';
  end if;
  if not exists (select 1 from profiles where id = p_followee_id) then
    raise exception 'Player not found';
  end if;
  insert into follows (follower_id, followee_id)
  values (p_user_id, p_followee_id)
  on conflict do nothing;
  perform record_activity(p_user_id, 'followed', 'player', p_followee_id, 'followed a player');
end;
$$;

create or replace function unfollow_user(p_user_id uuid, p_followee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  delete from follows where follower_id = p_user_id and followee_id = p_followee_id;
end;
$$;

create or replace function get_player_rankings()
returns table (
  user_id uuid,
  display_name text,
  played integer,
  wins integer,
  average_return numeric,
  rank integer
)
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select
      r.user_id,
      count(*)::int as played,
      count(*) filter (where r.rank = 1)::int as wins,
      round(avg(r.return_pct), 4) as average_return
    from tournament_results r
    group by r.user_id
  )
  select
    a.user_id,
    coalesce(nullif(p.display_name, ''), split_part(p.email, '@', 1), 'Player') as display_name,
    a.played,
    a.wins,
    a.average_return,
    row_number() over (order by a.wins desc, a.average_return desc, a.played desc, a.user_id asc)::int as rank
  from agg a
  join profiles p on p.id = a.user_id
  order by rank;
$$;

revoke all on function join_tournament(uuid, uuid, text) from public;
revoke all on function record_activity(uuid, text, text, uuid, text) from public;
revoke all on function request_friendship(uuid, uuid) from public;
revoke all on function respond_friendship(uuid, uuid, boolean) from public;
revoke all on function follow_user(uuid, uuid) from public;
revoke all on function unfollow_user(uuid, uuid) from public;
revoke all on function get_player_rankings() from public;

grant execute on function join_tournament(uuid, uuid, text) to service_role;
grant execute on function record_activity(uuid, text, text, uuid, text) to service_role;
grant execute on function request_friendship(uuid, uuid) to service_role;
grant execute on function respond_friendship(uuid, uuid, boolean) to service_role;
grant execute on function follow_user(uuid, uuid) to service_role;
grant execute on function unfollow_user(uuid, uuid) to service_role;
grant execute on function get_player_rankings() to anon, authenticated, service_role;
