-- =============================================================
-- Add PSA graded cards + league scheduling
-- =============================================================

-- New product types for graded cards
ALTER TYPE product_type ADD VALUE 'psa_10';
ALTER TYPE product_type ADD VALUE 'psa_9';

-- New columns on products for graded card metadata
ALTER TABLE products ADD COLUMN card_name text;
ALTER TABLE products ADD COLUMN card_number text;
ALTER TABLE products ADD COLUMN psa_grade int CHECK (psa_grade IN (9, 10));
ALTER TABLE products ADD COLUMN category text NOT NULL DEFAULT 'sealed'
  CHECK (category IN ('sealed', 'graded'));

-- Registration status for weekly league cycle
ALTER TYPE contest_status ADD VALUE 'registration' BEFORE 'pending';

-- Registration window timestamp
ALTER TABLE contests ADD COLUMN registration_opens_at timestamptz;
