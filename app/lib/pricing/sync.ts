import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSealedProductPrices,
  getGradedCardPrices,
  type SealedProduct,
  type Card,
} from './client';

interface SyncResult {
  synced: number;
  errors: string[];
  skipped: number;
}

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 62_000;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sync prices from PokemonPriceTracker API for all active products.
 * Processes in batches of 50 with 62s delays to respect 60 credits/minute.
 */
export async function syncPrices(supabase: SupabaseClient): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, category, tcgplayer_id')
    .eq('is_active', true);

  if (fetchError || !products) {
    return { synced: 0, skipped: 0, errors: [`Failed to fetch products: ${fetchError?.message}`] };
  }

  const sealedProducts = products.filter(
    (p) => p.category === 'sealed' && p.tcgplayer_id
  );
  const gradedProducts = products.filter(
    (p) => p.category === 'graded' && p.tcgplayer_id
  );

  const noId = products.filter((p) => !p.tcgplayer_id);
  if (noId.length > 0) {
    skipped = noId.length;
    errors.push(`${noId.length} products missing tcgplayer_id, skipped`);
  }

  // Sealed products -- 1 credit each, batch by 50
  const sealedBatches = chunk(sealedProducts, BATCH_SIZE);
  for (let bi = 0; bi < sealedBatches.length; bi++) {
    if (bi > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

    const batch = sealedBatches[bi];
    const ids = batch.map((p) => Number(p.tcgplayer_id));

    let sealedData: SealedProduct[] = [];
    try {
      sealedData = await getSealedProductPrices(ids);
    } catch (err) {
      errors.push(`Sealed batch ${bi} fetch failed: ${err}`);
      continue;
    }

    const byTcgId = new Map(sealedData.map((s) => [s.tcgPlayerId, s]));

    for (const product of batch) {
      const apiData = byTcgId.get(Number(product.tcgplayer_id));
      if (!apiData) {
        errors.push(`No data returned for sealed product: ${product.name}`);
        continue;
      }
      const price = apiData.unopenedPrice ?? apiData.prices?.market;
      if (!price) {
        errors.push(`No price for sealed product: ${product.name}`);
        continue;
      }

      const change7d = computeChange7d(apiData);

      const { error: insertError } = await supabase.from('price_snapshots').insert({
        product_id: product.id,
        price,
        change_7d: change7d,
        volume: 0,
        source: 'pokemonpricetracker',
      });

      if (insertError) {
        errors.push(`Snapshot insert failed for ${product.name}: ${insertError.message}`);
      } else {
        synced++;
      }
    }
  }

  // Graded cards -- 2 credits each (includeEbay), batch by 25
  const gradedBatchSize = Math.floor(BATCH_SIZE / 2);
  const gradedBatches = chunk(gradedProducts, gradedBatchSize);
  for (let bi = 0; bi < gradedBatches.length; bi++) {
    if (bi > 0 || sealedBatches.length > 0) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }

    const batch = gradedBatches[bi];
    const ids = batch.map((p) => Number(p.tcgplayer_id));

    // Fetch snapshots from ~7 days ago to compute change_7d
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldSnapshots } = await supabase
      .from('price_snapshots')
      .select('product_id, price')
      .in('product_id', batch.map((p) => p.id))
      .lte('recorded_at', sevenDaysAgo)
      .order('recorded_at', { ascending: false });
    const prevPrices = new Map<string, number>();
    for (const snap of oldSnapshots ?? []) {
      if (!prevPrices.has(snap.product_id)) {
        prevPrices.set(snap.product_id, Number(snap.price));
      }
    }

    let cardData: Card[] = [];
    try {
      cardData = await getGradedCardPrices(ids, { includeEbay: true });
    } catch (err) {
      errors.push(`Graded batch ${bi} fetch failed: ${err}`);
      continue;
    }

    const byTcgId = new Map(cardData.map((c) => [c.tcgPlayerId, c]));

    for (const product of batch) {
      const apiData = byTcgId.get(Number(product.tcgplayer_id));
      if (!apiData) {
        errors.push(`No data returned for graded card: ${product.name}`);
        continue;
      }

      const price = getGradedPrice(apiData, product.name);
      if (price === null) {
        errors.push(`No price data for graded card: ${product.name}`);
        continue;
      }

      const prevPrice = prevPrices.get(product.id);
      const change_7d =
        prevPrice && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;

      const { error: insertError } = await supabase.from('price_snapshots').insert({
        product_id: product.id,
        price,
        change_7d,
        volume: 0,
        source: 'pokemonpricetracker',
      });

      if (insertError) {
        errors.push(`Snapshot insert failed for ${product.name}: ${insertError.message}`);
      } else {
        synced++;
      }
    }
  }

  return { synced, skipped, errors };
}

function computeChange7d(product: SealedProduct): number {
  if (!product.priceHistory || product.priceHistory.length < 2) return 0;

  const sorted = [...product.priceHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const current = sorted[0].price;
  const weekAgo = sorted[sorted.length - 1]?.price ?? current;

  if (weekAgo === 0) return 0;
  return ((current - weekAgo) / weekAgo) * 100;
}

function getGradedPrice(card: Card, productName: string): number | null {
  const isPsa10 = productName.toLowerCase().includes('psa 10');
  const isPsa9 = productName.toLowerCase().includes('psa 9');

  const psa10 = card.ebay?.salesByGrade?.psa10 ?? card.ebay?.psa10;
  const psa9 = card.ebay?.salesByGrade?.psa9 ?? card.ebay?.psa9;

  if (isPsa10 && psa10) return psa10.smartMarketPrice?.price ?? psa10.averagePrice ?? psa10.avg ?? null;
  if (isPsa9 && psa9) return psa9.smartMarketPrice?.price ?? psa9.averagePrice ?? psa9.avg ?? null;

  return card.prices?.market ?? null;
}
