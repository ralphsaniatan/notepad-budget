-- Update commitment_type check constraint
ALTER TABLE categories DROP CONSTRAINT categories_commitment_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_commitment_type_check 
  CHECK (commitment_type IN ('fixed', 'variable_fixed', 'wants'));

COMMENT ON COLUMN categories.commitment_type IS 'Category type: fixed (Landmark), variable_fixed (Needs/ShoppingBag), wants (Wants/ShoppingBag), or null (Standard)';
