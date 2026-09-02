-- Phase 17: creator-hosted tournaments. Creators get a public page and can
-- host isolated books with the same engine as admin tournaments.

alter table profiles
  add column if not exists creator_slug text;

alter table profiles
  add column if not exists creator_bio text not null default '';

alter table profiles
  add column if not exists is_creator boolean not null default false;

create unique index if not exists uq_profiles_creator_slug
  on profiles (creator_slug)
  where creator_slug is not null;

alter table tournaments
  add column if not exists host_kind text not null default 'admin';

alter table tournaments
  drop constraint if exists tournaments_host_kind_check;

alter table tournaments
  add constraint tournaments_host_kind_check
  check (host_kind in ('admin', 'creator'));

create or replace function claim_creator_profile(
  p_user_id uuid,
  p_slug text,
  p_bio text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;
  v_slug := lower(regexp_replace(trim(p_slug), '[^a-z0-9-]', '', 'g'));
  if v_slug is null or length(v_slug) < 3 or length(v_slug) > 32 then
    raise exception 'Creator slug must be 3–32 letters, numbers, or dashes';
  end if;
  if exists (
    select 1 from profiles
    where creator_slug = v_slug and id <> p_user_id
  ) then
    raise exception 'Creator slug is taken';
  end if;

  update profiles
  set is_creator = true,
      creator_slug = v_slug,
      creator_bio = coalesce(left(trim(p_bio), 280), '')
  where id = p_user_id;

  if not found then
    raise exception 'Profile required';
  end if;
end;
$$;

revoke all on function claim_creator_profile(uuid, text, text) from public;
grant execute on function claim_creator_profile(uuid, text, text) to service_role;
