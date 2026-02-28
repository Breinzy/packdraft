import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSealedProductsBySearch,
  getTopCards,
  type SealedProduct,
  type Card,
} from './client';

export interface ImportOptions {
  maxSets?: number;
  maxGradedCards?: number;
  creditBudget?: number;
  throttleMs?: number;
}

export interface ImportResult {
  sealedImported: number;
  gradedImported: number;
  creditsUsed: number;
  errors: string[];
  stoppedEarly: boolean;
}

const DEFAULT_OPTIONS: Required<ImportOptions> = {
  maxSets: 30,
  maxGradedCards: 200,
  creditBudget: 5000,
  throttleMs: 31000,
};

class CreditTracker {
  used = 0;
  constructor(private budget: number) {}

  add(count: number) { this.used += count; }
  remaining() { return this.budget - this.used; }
  exceeded() { return this.used >= this.budget; }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifySealedType(
  name: string
): 'booster_box' | 'etb' | 'premium_collection' | 'booster_bundle' | 'upc' {
  const lower = name.toLowerCase();
  if (lower.includes('ultra premium') || lower.includes('upc')) return 'upc';
  if (lower.includes('elite trainer box') || lower.includes('etb')) return 'etb';
  if (lower.includes('booster bundle') || lower.includes('bundle')) return 'booster_bundle';
  if (lower.includes('premium collection') || lower.includes('special collection'))
    return 'premium_collection';
  return 'booster_box';
}

async function upsertAndSnapshot(
  supabase: SupabaseClient,
  product: {
    tcgplayer_id: string;
    name: string;
    set_name: string;
    type: string;
    category: string;
    psa_grade?: number | null;
    card_name?: string | null;
    card_number?: string | null;
    image_code?: string | null;
  },
  price: number | null,
  volume: number
): Promise<{ ok: boolean; error?: string }> {
  const { data: productId, error: rpcError } = await supabase.rpc('upsert_product', {
    p_tcgplayer_id: product.tcgplayer_id,
    p_name: product.name,
    p_set_name: product.set_name,
    p_type: product.type,
    p_category: product.category,
    p_psa_grade: product.psa_grade ?? null,
    p_card_name: product.card_name ?? null,
    p_card_number: product.card_number ?? null,
    p_image_code: product.image_code ?? null,
  });

  if (rpcError) {
    return { ok: false, error: `Upsert failed for "${product.name}": ${rpcError.message}` };
  }

  if (!productId) {
    return { ok: false, error: `Upsert returned no ID for "${product.name}" (tcgplayer_id=${product.tcgplayer_id}, psa_grade=${product.psa_grade ?? 'null'})` };
  }

  if (price != null && productId) {
    const { error: snapError } = await supabase.from('price_snapshots').insert({
      product_id: productId,
      price,
      change_7d: 0,
      volume,
      source: 'pokemonpricetracker',
    });
    if (snapError) {
      return { ok: true, error: `Snapshot failed for "${product.name}": ${snapError.message}` };
    }
  }

  return { ok: true };
}

const SEALED_SEARCH_TERMS = [
  'Booster Box',
  'Elite Trainer Box',
  'Booster Bundle',
  'Ultra Premium Collection',
  'Premium Collection',
];

/**
 * Import sealed products by searching for each product type keyword.
 * Respects credit budget and throttles between API calls.
 */
export async function importSealedProducts(
  supabase: SupabaseClient,
  credits: CreditTracker,
  opts: Required<ImportOptions>
): Promise<{ imported: number; errors: string[] }> {
  if (opts.maxSets <= 0) return { imported: 0, errors: [] };

  const errors: string[] = [];
  let imported = 0;
  const pageSize = 20;
  const seen = new Set<number>();

  for (const searchTerm of SEALED_SEARCH_TERMS) {
    if (credits.exceeded()) {
      errors.push(`Credit budget reached (${credits.used}/${opts.creditBudget}), stopped sealed import`);
      break;
    }

    let offset = 0;
    let fetched = 0;

    while (true) {
      if (credits.exceeded()) break;

      await sleep(opts.throttleMs);

      let products: SealedProduct[];
      let total: number;
      try {
        const result = await getSealedProductsBySearch({ search: searchTerm, limit: pageSize, offset });
        products = result.products;
        total = result.total;
        credits.add(products.length || 1);
      } catch (err) {
        errors.push(`Failed to fetch "${searchTerm}" at offset ${offset}: ${err}`);
        break;
      }

      if (!products.length) break;


      for (const product of products) {
        if (!product.tcgPlayerId || seen.has(product.tcgPlayerId)) continue;
        seen.add(product.tcgPlayerId);

        const result = await upsertAndSnapshot(
          supabase,
          {
            tcgplayer_id: String(product.tcgPlayerId),
            name: product.name,
            set_name: product.setName ?? 'Unknown',
            type: classifySealedType(product.name),
            category: 'sealed',
          },
          product.unopenedPrice ?? product.prices?.market ?? null,
          0
        );

        if (result.error) errors.push(result.error);
        if (result.ok) imported++;
      }

      fetched += products.length;
      offset += pageSize;
      if (offset >= total || fetched >= opts.maxSets * pageSize) break;
    }
  }

  return { imported, errors };
}

/**
 * Import top graded cards by price from PokemonPriceTracker.
 * Creates PSA 10 and PSA 9 product rows where eBay data exists.
 */
export async function importTopGradedCards(
  supabase: SupabaseClient,
  credits: CreditTracker,
  opts: Required<ImportOptions>
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  const pageSize = 25;
  const allCards: Card[] = [];

  for (let offset = 0; offset < opts.maxGradedCards; offset += pageSize) {
    if (credits.exceeded()) {
      errors.push(`Credit budget reached (${credits.used}/${opts.creditBudget}), stopped card fetch`);
      break;
    }

    await sleep(opts.throttleMs);

    try {
      const batchSize = Math.min(pageSize, opts.maxGradedCards - offset);
      const { cards } = await getTopCards({
        sortBy: 'volume',
        sortOrder: 'desc',
        limit: batchSize,
        offset,
        includeEbay: true,
        minPrice: 5,
      });
      credits.add(cards.length * 2);
      if (!cards.length) break;
      allCards.push(...cards);
    } catch (err) {
      errors.push(`Failed to fetch cards at offset ${offset}: ${err}`);
      break;
    }
  }


  for (const card of allCards) {
    if (!card.tcgPlayerId) continue;

    const grades: Array<{ grade: 10 | 9; price: number; volume: number }> = [];

    // API returns data in ebay.salesByGrade.psa10/psa9
    const psa10 = card.ebay?.salesByGrade?.psa10 ?? card.ebay?.psa10;
    const psa9 = card.ebay?.salesByGrade?.psa9 ?? card.ebay?.psa9;

    const psa10Price = psa10?.smartMarketPrice?.price ?? psa10?.averagePrice ?? psa10?.avg;
    const psa9Price = psa9?.smartMarketPrice?.price ?? psa9?.averagePrice ?? psa9?.avg;

    if (psa10Price) {
      grades.push({ grade: 10, price: psa10Price, volume: psa10?.count ?? 0 });
    }
    if (psa9Price) {
      grades.push({ grade: 9, price: psa9Price, volume: psa9?.count ?? 0 });
    }

    if (!grades.length) continue;

    for (const { grade, price, volume } of grades) {
      const productName = `${card.name}${card.number ? ` ${card.number}` : ''} PSA ${grade}`;

      const result = await upsertAndSnapshot(
        supabase,
        {
          tcgplayer_id: String(card.tcgPlayerId),
          name: productName,
          set_name: card.setName ?? 'Unknown',
          type: grade === 10 ? 'psa_10' : 'psa_9',
          category: 'graded',
          psa_grade: grade,
          card_name: card.name,
          card_number: card.number ?? null,
          image_code: card.imageUrl ?? null,
        },
        price,
        volume
      );

      if (result.error) errors.push(result.error);
      if (result.ok) imported++;
    }
  }

  return { imported, errors };
}

/**
 * Run a full product import with credit budget and throttling.
 */
export async function importAllProducts(
  supabase: SupabaseClient,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const credits = new CreditTracker(opts.creditBudget);

  const sealed = await importSealedProducts(supabase, credits, opts);
  const graded = await importTopGradedCards(supabase, credits, opts);

  const result: ImportResult = {
    sealedImported: sealed.imported,
    gradedImported: graded.imported,
    creditsUsed: credits.used,
    errors: [...sealed.errors, ...graded.errors],
    stoppedEarly: credits.exceeded(),
  };

  return result;
}
