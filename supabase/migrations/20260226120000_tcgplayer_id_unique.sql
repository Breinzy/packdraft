-- Partial unique indexes on products for import upsert integrity.
-- Separated by psa_grade to handle NULLs correctly.

-- Sealed products: unique on tcgplayer_id where psa_grade IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tcgplayer_sealed
  ON products (tcgplayer_id)
  WHERE psa_grade IS NULL AND tcgplayer_id IS NOT NULL;

-- Graded products: unique on (tcgplayer_id, psa_grade)
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tcgplayer_graded
  ON products (tcgplayer_id, psa_grade)
  WHERE psa_grade IS NOT NULL AND tcgplayer_id IS NOT NULL;

-- Stored function for upserting products from the API import.
-- Handles the NULL psa_grade comparison that ON CONFLICT can't express.
CREATE OR REPLACE FUNCTION upsert_product(
  p_tcgplayer_id text,
  p_name text,
  p_set_name text,
  p_type text,
  p_category text,
  p_psa_grade int DEFAULT NULL,
  p_card_name text DEFAULT NULL,
  p_card_number text DEFAULT NULL,
  p_image_code text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  result_id uuid;
BEGIN
  IF p_psa_grade IS NULL THEN
    UPDATE products SET
      name = p_name, set_name = p_set_name, type = p_type::product_type,
      category = p_category, image_code = p_image_code, is_active = true
    WHERE tcgplayer_id = p_tcgplayer_id AND psa_grade IS NULL
    RETURNING id INTO result_id;
  ELSE
    UPDATE products SET
      name = p_name, set_name = p_set_name, type = p_type::product_type,
      category = p_category, card_name = p_card_name,
      card_number = p_card_number, image_code = p_image_code, is_active = true
    WHERE tcgplayer_id = p_tcgplayer_id AND psa_grade = p_psa_grade
    RETURNING id INTO result_id;
  END IF;

  IF result_id IS NULL THEN
    INSERT INTO products (
      tcgplayer_id, name, set_name, type, category,
      psa_grade, card_name, card_number, image_code, is_active
    ) VALUES (
      p_tcgplayer_id, p_name, p_set_name, p_type::product_type, p_category,
      p_psa_grade, p_card_name, p_card_number, p_image_code, true
    ) RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql;
