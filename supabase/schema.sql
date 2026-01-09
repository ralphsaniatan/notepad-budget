-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ROLES & RLS
-- We assume Supabase Auth is used. Each table will have RLS enabled.

-- 1. MONTHS
-- Tracks the high-level budget for a specific month (e.g., '2023-10-01').
create table months (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  iso_month date not null, -- First day of the month, e.g. 2026-01-01
  status text check (status in ('active', 'closed')) default 'active',
  income numeric(12, 2) default 0.00,
  rollover numeric(12, 2) default 0.00, -- Amount rolled over from previous month
  created_at timestamptz default now(),
  
  unique(user_id, iso_month)
);

alter table months enable row level security;
create policy "Users can manage their own months" on months
  for all using (auth.uid() = user_id);

-- 2. CATEGORIES
-- Budget categories. 'is_commitment' distinguishes fixed bills from variable expenses.
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  is_commitment boolean default false, -- true = Fixed/Committed, false = Variable
  budget_limit numeric(12, 2) default 0.00,
  created_at timestamptz default now()
);

alter table categories enable row level security;
create policy "Users can manage their own categories" on categories
  for all using (auth.uid() = user_id);

-- 3. DEBTS
-- Persistent debt balances.
create table debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  total_balance numeric(12, 2) default 0.00,
  interest_rate numeric(4, 2) default 0.00, -- e.g. 5.5 = 5.5%
  created_at timestamptz default now()
);

alter table debts enable row level security;
create policy "Users can manage their own debts" on debts
  for all using (auth.uid() = user_id);

-- 4. TRANSACTIONS
-- All money movements.
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  month_id uuid references months(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null, -- Optional if type is not expense
  debt_id uuid references debts(id) on delete set null, -- Optional if payment towards debt
  
  description text,
  amount numeric(12, 2) not null, -- Positive for Income, Negative for Expense usually, or just Magnitude with Type handling it.
  -- Let's stick to signed values based on context, or explicit type.
  -- Strategy: 'expense', 'income', 'debt_payment'
  type text check (type in ('income', 'expense', 'debt_payment')) not null,
  
  date date default current_date,
  created_at timestamptz default now()
);

alter table transactions enable row level security;
create policy "Users can manage their own transactions" on transactions
  for all using (auth.uid() = user_id);
