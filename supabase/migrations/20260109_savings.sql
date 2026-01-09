-- Create Savings Goals Table
create table if not exists savings_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date date not null,
  created_at timestamptz default now()
);

-- RLS Policies
alter table savings_goals enable row level security;

create policy "Users can view their own savings goals"
  on savings_goals for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own savings goals"
  on savings_goals for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own savings goals"
  on savings_goals for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own savings goals"
  on savings_goals for delete
  using ( auth.uid() = user_id );
