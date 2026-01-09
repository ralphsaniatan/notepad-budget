-- Add pinned flag to categories for Tracked Budgets (Envelopes)
ALTER TABLE categories ADD COLUMN is_pinned boolean DEFAULT false;
