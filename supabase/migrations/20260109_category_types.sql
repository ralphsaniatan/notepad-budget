-- Add commitment_type column
ALTER TABLE categories ADD COLUMN commitment_type text CHECK (commitment_type IN ('fixed', 'variable_fixed'));

-- Migrate existing commitments
UPDATE categories SET commitment_type = 'fixed' WHERE is_commitment = true;

-- Make is_commitment optional or deprecated (we will ignore it in code moving forward, but keep for safety if needed, or just rely on commitment_type)
-- Ideally we would drop it, but let's just leave it for now and update the code to use commitment_type.
