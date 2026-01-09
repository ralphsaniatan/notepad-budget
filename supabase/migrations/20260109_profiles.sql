-- PROFILES
-- Mapping table to support "Login by Username".
-- Allows looking up an Email address given a Username.

create table profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  email text not null,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;

-- 1. Anyone can read profiles (Needed to resolve Username -> Email during Login)
create policy "Public can read profiles" on profiles
  for select using (true);

-- 2. Users can insert their own profile (During Sign Up)
create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- 3. Users can update their own profile
create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);
