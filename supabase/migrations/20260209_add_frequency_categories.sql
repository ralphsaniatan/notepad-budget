-- Migration: Add frequency_months and balance to categories
-- Description: Support for frequency-based categories (e.g., every 2 months) with accumulated balance.

alter table categories 
add column if not exists frequency_months integer default 1 check (frequency_months >= 1),
add column if not exists balance numeric default 0;

comment on column categories.frequency_months is 'Frequency of the budget limit in months (1 = monthly, 12 = yearly)';
comment on column categories.balance is 'Accumulated surplus for sinking fund/frequency categories';
