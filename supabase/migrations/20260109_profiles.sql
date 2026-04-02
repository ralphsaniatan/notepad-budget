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

-- 1. Users can read their own profile
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

-- 2. Users can insert their own profile (During Sign Up)
create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- 3. Users can update their own profile
create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- 4. Secure function to look up email by username (Needed for Login)
create or replace function get_email_by_username(username_input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  found_email text;
begin
  select email into found_email
  from profiles
  where username ilike username_input;

  return found_email;
end;
$$;

grant execute on function get_email_by_username(text) to anon, authenticated;
