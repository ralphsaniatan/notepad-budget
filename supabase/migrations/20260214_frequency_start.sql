-- Migration: Add frequency_start to categories
-- Allows users to specify which month the frequency cycle starts (payment month).

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS frequency_start date;

COMMENT ON COLUMN categories.frequency_start IS 'Start date for frequency cycle. The month of this date is month 0 of the cycle (payment month).';
