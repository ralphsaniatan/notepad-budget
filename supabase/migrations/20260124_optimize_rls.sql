-- Optimize RLS policies to prevent unnecessary re-evaluation of auth.uid()
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- 1. MONTHS
drop policy if exists "Users can manage their own months" on months;
create policy "Users can manage their own months" on months
  for all using ((select auth.uid()) = user_id);

-- 2. CATEGORIES
drop policy if exists "Users can manage their own categories" on categories;
create policy "Users can manage their own categories" on categories
  for all using ((select auth.uid()) = user_id);

-- 3. DEBTS
drop policy if exists "Users can manage their own debts" on debts;
create policy "Users can manage their own debts" on debts
  for all using ((select auth.uid()) = user_id);

-- 4. TRANSACTIONS
drop policy if exists "Users can manage their own transactions" on transactions;
create policy "Users can manage their own transactions" on transactions
  for all using ((select auth.uid()) = user_id);

-- 5. SAVINGS GOALS
drop policy if exists "Users can view their own savings goals" on savings_goals;
create policy "Users can view their own savings goals"
  on savings_goals for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own savings goals" on savings_goals;
create policy "Users can insert their own savings goals"
  on savings_goals for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own savings goals" on savings_goals;
create policy "Users can update their own savings goals"
  on savings_goals for update
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own savings goals" on savings_goals;
create policy "Users can delete their own savings goals"
  on savings_goals for delete
  using ((select auth.uid()) = user_id);

-- 6. PROFILES
drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" on profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" on profiles
  for update using ((select auth.uid()) = id);
