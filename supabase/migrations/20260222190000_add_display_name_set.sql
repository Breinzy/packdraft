-- Add display_name_set flag to profiles
-- Used to determine if user has gone through onboarding
alter table profiles add column display_name_set boolean not null default false;

-- Existing users are already onboarded
update profiles set display_name_set = true;
