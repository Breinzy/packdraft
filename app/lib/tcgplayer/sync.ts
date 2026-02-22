import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sync prices from TCGPlayer API (or manual data) into price_snapshots.
 * For v1 this is a manual trigger. In v2, this runs on a Supabase cron.
 *
 * Replace the mock data below with real TCGPlayer API calls when ready.
 */

interface PriceData {
  productId: string;
  price: number;
  change7d: number;
  volume: number;
}

const MOCK_PRICES: Record<string, Omit<PriceData, 'productId'>> = {
  'Prismatic Evolutions Booster Box': { price: 289.99, change7d: 12.4, volume: 1240 },
  'Surging Sparks Booster Box': { price: 134.99, change7d: -3.2, volume: 890 },
  'Stellar Crown Booster Box': { price: 89.99, change7d: 1.8, volume: 620 },
  'Twilight Masquerade Booster Box': { price: 109.99, change7d: -1.1, volume: 540 },
  'Paradox Rift Booster Box': { price: 119.99, change7d: 5.6, volume: 780 },
  'Prismatic Evolutions ETB': { price: 84.99, change7d: 18.2, volume: 3200 },
  'Surging Sparks ETB': { price: 44.99, change7d: -2.1, volume: 1800 },
  'Stellar Crown ETB': { price: 39.99, change7d: 0.5, volume: 1100 },
  'Twilight Masquerade ETB': { price: 49.99, change7d: 3.3, volume: 960 },
  'Eevee Heroes Premium Collection': { price: 179.99, change7d: 22.1, volume: 420 },
  'Charizard ex Premium Collection': { price: 64.99, change7d: -4.5, volume: 680 },
  'Pikachu ex Premium Collection': { price: 54.99, change7d: 1.2, volume: 590 },
  'Prismatic Evolutions Booster Bundle': { price: 34.99, change7d: 9.8, volume: 2100 },
  'Surging Sparks Booster Bundle': { price: 24.99, change7d: -1.8, volume: 1400 },
  'Stellar Crown Booster Bundle': { price: 22.99, change7d: 0.3, volume: 980 },
  'Prismatic Evolutions UPC': { price: 44.99, change7d: 14.6, volume: 1890 },
  'Surging Sparks UPC': { price: 29.99, change7d: -2.9, volume: 1100 },
  'Stellar Crown UPC': { price: 27.99, change7d: 1.1, volume: 760 },
  'Twilight Masquerade UPC': { price: 32.99, change7d: 2.7, volume: 830 },
  'Paradox Rift UPC': { price: 34.99, change7d: 4.1, volume: 910 },
};

export async function syncPrices(supabase: SupabaseClient): Promise<{
  synced: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;

  // Get all active products
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true);

  if (fetchError || !products) {
    return { synced: 0, errors: [`Failed to fetch products: ${fetchError?.message}`] };
  }

  for (const product of products) {
    const mockData = MOCK_PRICES[product.name];
    if (!mockData) {
      errors.push(`No price data for: ${product.name}`);
      continue;
    }

    const { error: insertError } = await supabase.from('price_snapshots').insert({
      product_id: product.id,
      price: mockData.price,
      change_7d: mockData.change7d,
      volume: mockData.volume,
      source: 'mock',
    });

    if (insertError) {
      errors.push(`Failed to insert snapshot for ${product.name}: ${insertError.message}`);
    } else {
      synced++;
    }
  }

  return { synced, errors };
}
