-- Seed PSA graded cards (mock data for development)
INSERT INTO products (name, set_name, type, category, card_name, card_number, psa_grade, image_code) VALUES
  ('Charizard ex 006 PSA 10',          'Obsidian Flames',      'psa_10', 'graded', 'Charizard ex',         '006/197', 10, 'OF'),
  ('Charizard ex 006 PSA 9',           'Obsidian Flames',      'psa_9',  'graded', 'Charizard ex',         '006/197', 9,  'OF'),
  ('Pikachu VMAX 044 PSA 10',          'Vivid Voltage',        'psa_10', 'graded', 'Pikachu VMAX',         '044/185', 10, 'VV'),
  ('Pikachu VMAX 044 PSA 9',           'Vivid Voltage',        'psa_9',  'graded', 'Pikachu VMAX',         '044/185', 9,  'VV'),
  ('Umbreon VMAX 215 PSA 10',          'Evolving Skies',       'psa_10', 'graded', 'Umbreon VMAX',         '215/203', 10, 'ES'),
  ('Umbreon VMAX 215 PSA 9',           'Evolving Skies',       'psa_9',  'graded', 'Umbreon VMAX',         '215/203', 9,  'ES'),
  ('Moonbreon 215 PSA 10',             'Evolving Skies',       'psa_10', 'graded', 'Umbreon VMAX Alt Art', '215/203', 10, 'ES'),
  ('Lugia V Alt Art PSA 10',           'Silver Tempest',       'psa_10', 'graded', 'Lugia V',              '186/195', 10, 'ST'),
  ('Lugia V Alt Art PSA 9',            'Silver Tempest',       'psa_9',  'graded', 'Lugia V',              '186/195', 9,  'ST'),
  ('Mew VMAX 114 PSA 10',             'Fusion Strike',        'psa_10', 'graded', 'Mew VMAX',             '114/264', 10, 'FS'),
  ('Gengar VMAX Alt Art PSA 10',       'Fusion Strike',        'psa_10', 'graded', 'Gengar VMAX',          '271/264', 10, 'FS'),
  ('Gengar VMAX Alt Art PSA 9',        'Fusion Strike',        'psa_9',  'graded', 'Gengar VMAX',          '271/264', 9,  'FS'),
  ('Rayquaza VMAX Alt Art PSA 10',     'Evolving Skies',       'psa_10', 'graded', 'Rayquaza VMAX',        '218/203', 10, 'ES'),
  ('Rayquaza VMAX Alt Art PSA 9',      'Evolving Skies',       'psa_9',  'graded', 'Rayquaza VMAX',        '218/203', 9,  'ES'),
  ('Giratina V Alt Art PSA 10',        'Lost Origin',          'psa_10', 'graded', 'Giratina V',           '186/196', 10, 'LO'),
  ('Giratina V Alt Art PSA 9',         'Lost Origin',          'psa_9',  'graded', 'Giratina V',           '186/196', 9,  'LO'),
  ('Mewtwo VSTAR 079 PSA 10',         'Pokemon GO',           'psa_10', 'graded', 'Mewtwo VSTAR',         '079/078', 10, 'PG'),
  ('Eevee Heroes Espeon VMAX PSA 10',  'Eevee Heroes',         'psa_10', 'graded', 'Espeon VMAX',          '189/S6a', 10, 'EH'),
  ('Eevee Heroes Espeon VMAX PSA 9',   'Eevee Heroes',         'psa_9',  'graded', 'Espeon VMAX',          '189/S6a', 9,  'EH'),
  ('Charizard UPC Promo PSA 10',       'Scarlet & Violet',     'psa_10', 'graded', 'Charizard ex',         '234',     10, 'SV');

-- Seed price snapshots for the PSA cards
INSERT INTO price_snapshots (product_id, price, change_7d, volume, source)
SELECT id, 850.00, 5.2, 89, 'seed' FROM products WHERE name = 'Charizard ex 006 PSA 10'
UNION ALL
SELECT id, 320.00, 3.1, 145, 'seed' FROM products WHERE name = 'Charizard ex 006 PSA 9'
UNION ALL
SELECT id, 420.00, -2.4, 67, 'seed' FROM products WHERE name = 'Pikachu VMAX 044 PSA 10'
UNION ALL
SELECT id, 180.00, 1.8, 112, 'seed' FROM products WHERE name = 'Pikachu VMAX 044 PSA 9'
UNION ALL
SELECT id, 1200.00, 8.7, 34, 'seed' FROM products WHERE name = 'Umbreon VMAX 215 PSA 10'
UNION ALL
SELECT id, 550.00, 4.3, 78, 'seed' FROM products WHERE name = 'Umbreon VMAX 215 PSA 9'
UNION ALL
SELECT id, 2800.00, 12.1, 12, 'seed' FROM products WHERE name = 'Moonbreon 215 PSA 10'
UNION ALL
SELECT id, 680.00, 6.5, 45, 'seed' FROM products WHERE name = 'Lugia V Alt Art PSA 10'
UNION ALL
SELECT id, 280.00, 2.9, 89, 'seed' FROM products WHERE name = 'Lugia V Alt Art PSA 9'
UNION ALL
SELECT id, 350.00, -1.5, 56, 'seed' FROM products WHERE name = 'Mew VMAX 114 PSA 10'
UNION ALL
SELECT id, 480.00, 7.8, 38, 'seed' FROM products WHERE name = 'Gengar VMAX Alt Art PSA 10'
UNION ALL
SELECT id, 195.00, 3.2, 92, 'seed' FROM products WHERE name = 'Gengar VMAX Alt Art PSA 9'
UNION ALL
SELECT id, 750.00, 9.4, 28, 'seed' FROM products WHERE name = 'Rayquaza VMAX Alt Art PSA 10'
UNION ALL
SELECT id, 310.00, 4.1, 67, 'seed' FROM products WHERE name = 'Rayquaza VMAX Alt Art PSA 9'
UNION ALL
SELECT id, 520.00, 11.3, 31, 'seed' FROM products WHERE name = 'Giratina V Alt Art PSA 10'
UNION ALL
SELECT id, 220.00, 5.6, 74, 'seed' FROM products WHERE name = 'Giratina V Alt Art PSA 9'
UNION ALL
SELECT id, 290.00, -3.2, 43, 'seed' FROM products WHERE name = 'Mewtwo VSTAR 079 PSA 10'
UNION ALL
SELECT id, 380.00, 6.1, 22, 'seed' FROM products WHERE name = 'Eevee Heroes Espeon VMAX PSA 10'
UNION ALL
SELECT id, 160.00, 2.4, 51, 'seed' FROM products WHERE name = 'Eevee Heroes Espeon VMAX PSA 9'
UNION ALL
SELECT id, 450.00, 14.2, 55, 'seed' FROM products WHERE name = 'Charizard UPC Promo PSA 10';
