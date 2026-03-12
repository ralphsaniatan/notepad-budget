-- Keep-Alive Logs Table
-- Used to prevent Supabase database pausing by generating periodic read/write activity

create table if not exists public.keep_alive_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS but don't add policies since this should be internal to anon/service_role only 
-- Or allow anon insert for the API to work if using anon key?
-- Actually, the API will use anon key or service role. Let's add a simple policy if needed, 
-- but actually let's allow all for now since it's just dummy ping data.
alter table public.keep_alive_logs enable row level security;

-- Allow insert/delete for anon since cron job API might use anon key
create policy "Allow anon insert keep_alive" on public.keep_alive_logs for insert with check (true);
create policy "Allow anon delete keep_alive" on public.keep_alive_logs for delete using (true);
