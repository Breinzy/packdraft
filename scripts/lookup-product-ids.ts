/**
 * Helper script to look up PokemonPriceTracker / TCGPlayer IDs for all products.
 *
 * Usage:
 *   POKEMON_PRICE_TRACKER_API_KEY=your_key npx tsx scripts/lookup-product-ids.ts
 *
 * This searches the PokemonPriceTracker API for each product name and prints
 * the results so you can find the correct tcgPlayerId for each product.
 * Use the output to populate the migration file.
 */

const API_KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY;
if (!API_KEY) {
  console.error('Set POKEMON_PRICE_TRACKER_API_KEY env var');
  process.exit(1);
}

const BASE_URL = 'https://www.pokemonpricetracker.com/api/v2';

const SEALED_PRODUCTS = [
  'Prismatic Evolutions Booster Box',
  'Surging Sparks Booster Box',
  'Stellar Crown Booster Box',
  'Twilight Masquerade Booster Box',
  'Paradox Rift Booster Box',
  'Prismatic Evolutions ETB',
  'Surging Sparks ETB',
  'Stellar Crown ETB',
  'Twilight Masquerade ETB',
  'Eevee Heroes Premium Collection',
  'Charizard ex Premium Collection',
  'Pikachu ex Premium Collection',
  'Prismatic Evolutions Booster Bundle',
  'Surging Sparks Booster Bundle',
  'Stellar Crown Booster Bundle',
  'Prismatic Evolutions UPC',
  'Surging Sparks UPC',
  'Stellar Crown UPC',
  'Twilight Masquerade UPC',
  'Paradox Rift UPC',
];

const GRADED_CARDS = [
  { name: 'Charizard ex 006 PSA 10', search: 'Charizard ex Obsidian Flames 006' },
  { name: 'Charizard ex 006 PSA 9', search: 'Charizard ex Obsidian Flames 006' },
  { name: 'Pikachu VMAX 044 PSA 10', search: 'Pikachu VMAX Vivid Voltage 044' },
  { name: 'Pikachu VMAX 044 PSA 9', search: 'Pikachu VMAX Vivid Voltage 044' },
  { name: 'Umbreon VMAX 215 PSA 10', search: 'Umbreon VMAX Evolving Skies 215' },
  { name: 'Umbreon VMAX 215 PSA 9', search: 'Umbreon VMAX Evolving Skies 215' },
  { name: 'Moonbreon 215 PSA 10', search: 'Umbreon VMAX Alt Art Evolving Skies 215' },
  { name: 'Lugia V Alt Art PSA 10', search: 'Lugia V Silver Tempest 186' },
  { name: 'Lugia V Alt Art PSA 9', search: 'Lugia V Silver Tempest 186' },
  { name: 'Mew VMAX 114 PSA 10', search: 'Mew VMAX Fusion Strike 114' },
  { name: 'Gengar VMAX Alt Art PSA 10', search: 'Gengar VMAX Fusion Strike 271' },
  { name: 'Gengar VMAX Alt Art PSA 9', search: 'Gengar VMAX Fusion Strike 271' },
  { name: 'Rayquaza VMAX Alt Art PSA 10', search: 'Rayquaza VMAX Evolving Skies 218' },
  { name: 'Rayquaza VMAX Alt Art PSA 9', search: 'Rayquaza VMAX Evolving Skies 218' },
  { name: 'Giratina V Alt Art PSA 10', search: 'Giratina V Lost Origin 186' },
  { name: 'Giratina V Alt Art PSA 9', search: 'Giratina V Lost Origin 186' },
  { name: 'Mewtwo VSTAR 079 PSA 10', search: 'Mewtwo VSTAR Pokemon GO 079' },
  { name: 'Eevee Heroes Espeon VMAX PSA 10', search: 'Espeon VMAX Eevee Heroes' },
  { name: 'Eevee Heroes Espeon VMAX PSA 9', search: 'Espeon VMAX Eevee Heroes' },
  { name: 'Charizard UPC Promo PSA 10', search: 'Charizard ex Scarlet Violet promo 234' },
];

async function searchSealed(query: string) {
  const url = `${BASE_URL}/sealed-products?search=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function searchCards(query: string) {
  const url = `${BASE_URL}/cards?search=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function main() {
  console.log('=== SEALED PRODUCTS ===\n');
  for (const name of SEALED_PRODUCTS) {
    console.log(`Searching for: ${name}`);
    const results = await searchSealed(name);
    if (results.length === 0) {
      console.log('  NO RESULTS FOUND\n');
    } else {
      for (const r of results) {
        console.log(`  tcgPlayerId: ${r.tcgPlayerId} | ${r.name} | $${r.prices?.market ?? 'N/A'}`);
      }
      console.log();
    }
    // Respect rate limit
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log('\n=== GRADED CARDS ===\n');
  for (const { name, search } of GRADED_CARDS) {
    console.log(`Searching for: ${name} (query: "${search}")`);
    const results = await searchCards(search);
    if (results.length === 0) {
      console.log('  NO RESULTS FOUND\n');
    } else {
      for (const r of results) {
        console.log(`  tcgPlayerId: ${r.tcgPlayerId} | ${r.name} | ${r.setName ?? ''} | #${r.number ?? '?'}`);
      }
      console.log();
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log('\nDone! Use the tcgPlayerId values above to populate the migration.');
}

main().catch(console.error);
