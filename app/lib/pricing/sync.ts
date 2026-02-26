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

/**
 * Sync prices from PokemonPriceTracker API for all active products.
 * Sealed products use /sealed-products, graded cards use /cards with eBay data.
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

  // Fetch sealed product prices
  if (sealedProducts.length > 0) {
    const sealedIds = sealedProducts.map((p) => Number(p.tcgplayer_id));
    let sealedData: SealedProduct[] = [];
    try {
      sealedData = await getSealedProductPrices(sealedIds);
    } catch (err) {
      errors.push(`Sealed products fetch failed: ${err}`);
    }

    const sealedByTcgId = new Map(
      sealedData.map((s) => [s.tcgPlayerId, s])
    );

    for (const product of sealedProducts) {
      const apiData = sealedByTcgId.get(Number(product.tcgplayer_id));
      if (!apiData?.prices?.market) {
        errors.push(`No price data returned for sealed product: ${product.name}`);
        continue;
      }

      const change7d = computeChange7d(apiData);

      const { error: insertError } = await supabase.from('price_snapshots').insert({
        product_id: product.id,
        price: apiData.prices.market,
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

  // Fetch graded card prices
  if (gradedProducts.length > 0) {
    const gradedIds = gradedProducts.map((p) => Number(p.tcgplayer_id));
    let cardData: Card[] = [];
    try {
      cardData = await getGradedCardPrices(gradedIds, { includeEbay: true });
    } catch (err) {
      errors.push(`Graded cards fetch failed: ${err}`);
    }

    const cardsByTcgId = new Map(
      cardData.map((c) => [c.tcgPlayerId, c])
    );

    for (const product of gradedProducts) {
      const apiData = cardsByTcgId.get(Number(product.tcgplayer_id));
      if (!apiData) {
        errors.push(`No data returned for graded card: ${product.name}`);
        continue;
      }

      // For graded cards, prefer eBay PSA data over TCGPlayer market price
      const price = getGradedPrice(apiData, product.name);
      if (price === null) {
        errors.push(`No price data for graded card: ${product.name}`);
        continue;
      }

      const { error: insertError } = await supabase.from('price_snapshots').insert({
        product_id: product.id,
        price,
        change_7d: 0,
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

  // API returns data in ebay.salesByGrade.psa10/psa9
  const psa10 = card.ebay?.salesByGrade?.psa10 ?? card.ebay?.psa10;
  const psa9 = card.ebay?.salesByGrade?.psa9 ?? card.ebay?.psa9;

  if (isPsa10 && psa10) return psa10.smartMarketPrice?.price ?? psa10.averagePrice ?? psa10.avg ?? null;
  if (isPsa9 && psa9) return psa9.smartMarketPrice?.price ?? psa9.averagePrice ?? psa9.avg ?? null;

  return card.prices?.market ?? null;
}
