-- Seed an active contest
INSERT INTO contests (starts_at, ends_at, status)
VALUES (now(), now() + interval '7 days', 'active');

-- Seed price snapshots for all products using mock TCGPlayer-style data
INSERT INTO price_snapshots (product_id, price, change_7d, volume, source)
SELECT id, 289.99, 12.4, 1240, 'seed' FROM products WHERE name = 'Prismatic Evolutions Booster Box'
UNION ALL
SELECT id, 134.99, -3.2, 890, 'seed' FROM products WHERE name = 'Surging Sparks Booster Box'
UNION ALL
SELECT id, 89.99, 1.8, 620, 'seed' FROM products WHERE name = 'Stellar Crown Booster Box'
UNION ALL
SELECT id, 109.99, -1.1, 540, 'seed' FROM products WHERE name = 'Twilight Masquerade Booster Box'
UNION ALL
SELECT id, 119.99, 5.6, 780, 'seed' FROM products WHERE name = 'Paradox Rift Booster Box'
UNION ALL
SELECT id, 84.99, 18.2, 3200, 'seed' FROM products WHERE name = 'Prismatic Evolutions ETB'
UNION ALL
SELECT id, 44.99, -2.1, 1800, 'seed' FROM products WHERE name = 'Surging Sparks ETB'
UNION ALL
SELECT id, 39.99, 0.5, 1100, 'seed' FROM products WHERE name = 'Stellar Crown ETB'
UNION ALL
SELECT id, 49.99, 3.3, 960, 'seed' FROM products WHERE name = 'Twilight Masquerade ETB'
UNION ALL
SELECT id, 179.99, 22.1, 420, 'seed' FROM products WHERE name = 'Eevee Heroes Premium Collection'
UNION ALL
SELECT id, 64.99, -4.5, 680, 'seed' FROM products WHERE name = 'Charizard ex Premium Collection'
UNION ALL
SELECT id, 54.99, 1.2, 590, 'seed' FROM products WHERE name = 'Pikachu ex Premium Collection'
UNION ALL
SELECT id, 34.99, 9.8, 2100, 'seed' FROM products WHERE name = 'Prismatic Evolutions Booster Bundle'
UNION ALL
SELECT id, 24.99, -1.8, 1400, 'seed' FROM products WHERE name = 'Surging Sparks Booster Bundle'
UNION ALL
SELECT id, 22.99, 0.3, 980, 'seed' FROM products WHERE name = 'Stellar Crown Booster Bundle'
UNION ALL
SELECT id, 44.99, 14.6, 1890, 'seed' FROM products WHERE name = 'Prismatic Evolutions UPC'
UNION ALL
SELECT id, 29.99, -2.9, 1100, 'seed' FROM products WHERE name = 'Surging Sparks UPC'
UNION ALL
SELECT id, 27.99, 1.1, 760, 'seed' FROM products WHERE name = 'Stellar Crown UPC'
UNION ALL
SELECT id, 32.99, 2.7, 830, 'seed' FROM products WHERE name = 'Twilight Masquerade UPC'
UNION ALL
SELECT id, 34.99, 4.1, 910, 'seed' FROM products WHERE name = 'Paradox Rift UPC';
