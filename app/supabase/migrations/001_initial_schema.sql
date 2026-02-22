-- =============================================================
-- PACKDRAFT — Initial Schema
-- =============================================================

create extension if not exists "uuid-ossp";

-- -------------------------------------------
-- ENUMS
-- -------------------------------------------
create type contest_status as enum ('pending', 'active', 'complete');
create type product_type as enum ('booster_box', 'etb', 'premium_collection', 'booster_bundle', 'upc');

-- -------------------------------------------
-- CONTESTS
-- -------------------------------------------
create table contests (
  id              uuid primary key default uuid_generate_v4(),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          contest_status not null default 'pending',
  created_at      timestamptz not null default now()
);

-- -------------------------------------------
-- LEAGUES
-- -------------------------------------------
create table leagues (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  contest_id      uuid not null references contests(id) on delete cascade,
  player_count    int not null default 0,
  is_full         boolean not null default false,
  all_locked_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_leagues_contest on leagues(contest_id);
create index idx_leagues_open on leagues(contest_id) where is_full = false;

-- -------------------------------------------
-- PROFILES (extends auth.users)
-- -------------------------------------------
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  display_name      text,
  current_league_id uuid references leagues(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index idx_profiles_league on profiles(current_league_id);

-- -------------------------------------------
-- PRODUCTS
-- -------------------------------------------
create table products (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  set_name        text not null,
  type            product_type not null,
  tcgplayer_id    text,
  image_code      text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_products_active on products(is_active) where is_active = true;

-- -------------------------------------------
-- PRICE SNAPSHOTS
-- -------------------------------------------
create table price_snapshots (
  id              uuid primary key default uuid_generate_v4(),
  product_id      uuid not null references products(id) on delete cascade,
  price           numeric(10,2) not null,
  change_7d       numeric(6,2) default 0,
  volume          int default 0,
  recorded_at     timestamptz not null default now(),
  source          text not null default 'tcgplayer'
);

create index idx_snapshots_product on price_snapshots(product_id, recorded_at desc);

-- -------------------------------------------
-- PORTFOLIOS
-- -------------------------------------------
create table portfolios (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles(id) on delete cascade,
  contest_id          uuid not null references contests(id) on delete cascade,
  league_id           uuid not null references leagues(id) on delete cascade,
  submitted_at        timestamptz,
  is_locked           boolean not null default false,
  cash_remaining      numeric(10,2) not null default 5000,
  final_value         numeric(10,2),
  final_rank_league   int,
  final_rank_global   int,
  created_at          timestamptz not null default now(),
  unique(user_id, contest_id)
);

create index idx_portfolios_user on portfolios(user_id);
create index idx_portfolios_contest on portfolios(contest_id);
create index idx_portfolios_league on portfolios(league_id);

-- -------------------------------------------
-- PORTFOLIO ITEMS
-- -------------------------------------------
create table portfolio_items (
  id              uuid primary key default uuid_generate_v4(),
  portfolio_id    uuid not null references portfolios(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  quantity        int not null default 1 check (quantity > 0 and quantity <= 10),
  price_at_lock   numeric(10,2),
  unique(portfolio_id, product_id)
);

create index idx_items_portfolio on portfolio_items(portfolio_id);

-- -------------------------------------------
-- FUNCTIONS / TRIGGERS
-- -------------------------------------------

-- Enforce 20-slot cap and $5000 budget at DB level
create or replace function check_portfolio_limits()
returns trigger as $$
declare
  total_slots int;
  total_cost  numeric;
begin
  select coalesce(sum(quantity), 0), coalesce(sum(quantity * price_at_lock), 0)
  into total_slots, total_cost
  from portfolio_items
  where portfolio_id = NEW.portfolio_id;

  if total_slots > 20 then
    raise exception 'Portfolio exceeds maximum of 20 slots';
  end if;

  if total_cost > 5000 then
    raise exception 'Portfolio exceeds budget of $5000';
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_check_portfolio_limits
  after insert or update on portfolio_items
  for each row execute function check_portfolio_limits();

-- Auto-increment league player count on profile insert
create or replace function update_league_player_count()
returns trigger as $$
begin
  update leagues
  set player_count = player_count + 1,
      is_full = (player_count + 1 >= 20)
  where id = NEW.current_league_id;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_update_league_count
  after insert on profiles
  for each row
  when (NEW.current_league_id is not null)
  execute function update_league_player_count();

-- When a portfolio is locked, check if all league members are locked
create or replace function check_league_all_locked()
returns trigger as $$
declare
  league uuid;
  total_players int;
  locked_count int;
begin
  if NEW.is_locked = true and (OLD.is_locked is null or OLD.is_locked = false) then
    select p.league_id into league from portfolios p where p.id = NEW.id;

    select l.player_count into total_players
    from leagues l where l.id = league;

    select count(*) into locked_count
    from portfolios p where p.league_id = league and p.is_locked = true;

    if locked_count >= total_players then
      update leagues set all_locked_at = now() where id = league;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_check_league_all_locked
  after update on portfolios
  for each row execute function check_league_all_locked();

-- Auto-create profile on auth signup
create or replace function handle_new_user()
returns trigger as $$
declare
  open_league uuid;
  active_contest uuid;
  league_name text;
begin
  -- Find active or pending contest
  select id into active_contest
  from contests
  where status in ('pending', 'active')
  order by starts_at asc
  limit 1;

  -- Find open league for that contest
  if active_contest is not null then
    select id into open_league
    from leagues
    where contest_id = active_contest and is_full = false
    order by created_at asc
    limit 1;

    -- Create new league if none available
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

  -- Create empty portfolio for the contest
  if active_contest is not null and open_league is not null then
    insert into portfolios (user_id, contest_id, league_id)
    values (NEW.id, active_contest, open_league);
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------
alter table profiles enable row level security;
alter table portfolios enable row level security;
alter table portfolio_items enable row level security;
alter table products enable row level security;
alter table price_snapshots enable row level security;
alter table leagues enable row level security;
alter table contests enable row level security;

-- Public reads
create policy "Products are public" on products for select using (true);
create policy "Snapshots are public" on price_snapshots for select using (true);
create policy "Leagues are public" on leagues for select using (true);
create policy "Contests are public" on contests for select using (true);
create policy "Profiles are public" on profiles for select using (true);

-- Profiles: users update own
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- Portfolios: own always visible, others visible once league is all-locked
create policy "Own portfolio" on portfolios for select using (auth.uid() = user_id);
create policy "Locked league portfolios" on portfolios for select using (
  exists (
    select 1 from leagues
    where leagues.id = portfolios.league_id
    and leagues.all_locked_at is not null
  )
);
create policy "Insert own portfolio" on portfolios for insert with check (auth.uid() = user_id);
create policy "Update own portfolio" on portfolios for update using (auth.uid() = user_id);

-- Portfolio items: follow portfolio visibility
create policy "Own portfolio items" on portfolio_items for select using (
  exists (select 1 from portfolios where portfolios.id = portfolio_items.portfolio_id and portfolios.user_id = auth.uid())
);
create policy "Locked league portfolio items" on portfolio_items for select using (
  exists (
    select 1 from portfolios
    join leagues on leagues.id = portfolios.league_id
    where portfolios.id = portfolio_items.portfolio_id
    and leagues.all_locked_at is not null
  )
);
create policy "Insert own items" on portfolio_items for insert with check (
  exists (select 1 from portfolios where portfolios.id = portfolio_items.portfolio_id and portfolios.user_id = auth.uid())
);
create policy "Update own items" on portfolio_items for update using (
  exists (select 1 from portfolios where portfolios.id = portfolio_items.portfolio_id and portfolios.user_id = auth.uid())
);
create policy "Delete own items" on portfolio_items for delete using (
  exists (select 1 from portfolios where portfolios.id = portfolio_items.portfolio_id and portfolios.user_id = auth.uid())
);

-- -------------------------------------------
-- SEED DATA
-- -------------------------------------------
insert into products (name, set_name, type, image_code) values
  ('Prismatic Evolutions Booster Box',      'Prismatic Evolutions', 'booster_box',        'PE'),
  ('Surging Sparks Booster Box',            'Surging Sparks',       'booster_box',        'SS'),
  ('Stellar Crown Booster Box',             'Stellar Crown',        'booster_box',        'SC'),
  ('Twilight Masquerade Booster Box',       'Twilight Masquerade',  'booster_box',        'TM'),
  ('Paradox Rift Booster Box',              'Paradox Rift',         'booster_box',        'PR'),
  ('Prismatic Evolutions ETB',              'Prismatic Evolutions', 'etb',                'PE'),
  ('Surging Sparks ETB',                    'Surging Sparks',       'etb',                'SS'),
  ('Stellar Crown ETB',                     'Stellar Crown',        'etb',                'SC'),
  ('Twilight Masquerade ETB',               'Twilight Masquerade',  'etb',                'TM'),
  ('Eevee Heroes Premium Collection',       'Eevee Heroes',         'premium_collection', 'EH'),
  ('Charizard ex Premium Collection',       'Scarlet & Violet',     'premium_collection', 'CZ'),
  ('Pikachu ex Premium Collection',         'Scarlet & Violet',     'premium_collection', 'PK'),
  ('Prismatic Evolutions Booster Bundle',   'Prismatic Evolutions', 'booster_bundle',     'PE'),
  ('Surging Sparks Booster Bundle',         'Surging Sparks',       'booster_bundle',     'SS'),
  ('Stellar Crown Booster Bundle',          'Stellar Crown',        'booster_bundle',     'SC'),
  ('Prismatic Evolutions UPC',              'Prismatic Evolutions', 'upc',                'PE'),
  ('Surging Sparks UPC',                    'Surging Sparks',       'upc',                'SS'),
  ('Stellar Crown UPC',                     'Stellar Crown',        'upc',                'SC'),
  ('Twilight Masquerade UPC',               'Twilight Masquerade',  'upc',                'TM'),
  ('Paradox Rift UPC',                      'Paradox Rift',         'upc',                'PR');
