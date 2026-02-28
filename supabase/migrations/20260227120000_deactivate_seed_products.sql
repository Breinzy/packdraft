-- Deactivate old hardcoded seed products that have no tcgplayer_id.
-- These are superseded by API-imported products.
UPDATE products SET is_active = false WHERE tcgplayer_id IS NULL;
