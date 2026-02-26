const BASE_URL = 'https://www.pokemonpricetracker.com/api/v2';

function getApiKey() {
  return process.env.POKEMON_PRICE_TRACKER_API_KEY ?? '';
}

export interface SetInfo {
  id: string;
  name: string;
  slug?: string;
  releaseDate?: string;
  totalCards?: number;
}

export interface SetsResponse {
  data: SetInfo[];
}

export interface SealedProductResponse {
  data: SealedProduct[];
  pagination?: { total: number; limit: number; offset: number };
}

export interface SealedProduct {
  tcgPlayerId: number;
  name: string;
  setName?: string;
  setSlug?: string;
  imageUrl?: string;
  prices?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  };
  priceHistory?: PriceHistoryEntry[];
}

export interface CardResponse {
  data: Card[];
  pagination?: { total: number; limit: number; offset: number };
}

export interface Card {
  tcgPlayerId: number;
  name: string;
  setName?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  prices?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  };
  ebay?: EbayGradedData;
  priceHistory?: PriceHistoryEntry[];
}

export interface GradedPriceData {
  avg?: number;
  low?: number;
  high?: number;
  salesCount?: number;
  averagePrice?: number;
  smartMarketPrice?: { price: number; confidence: string };
  count?: number;
}

export interface EbayGradedData {
  salesByGrade?: {
    psa10?: GradedPriceData;
    psa9?: GradedPriceData;
    [key: string]: GradedPriceData | undefined;
  };
  psa10?: GradedPriceData;
  psa9?: GradedPriceData;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

const MAX_RETRIES = 1;
const INITIAL_BACKOFF_MS = 5000;

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('POKEMON_PRICE_TRACKER_API_KEY is not configured');
  }

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    });

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[api] 429 on ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw new Error('PokemonPriceTracker rate limit exceeded after retries');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`PokemonPriceTracker API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  throw new Error('PokemonPriceTracker: exhausted retries');
}

/**
 * Fetch sealed product prices by TCGPlayer IDs.
 * Each product costs 1 credit. Adding history costs +1 credit each.
 */
export async function getSealedProductPrices(
  tcgPlayerIds: number[],
  options: { includeHistory?: boolean; days?: number } = {}
): Promise<SealedProduct[]> {
  const results: SealedProduct[] = [];

  for (const id of tcgPlayerIds) {
    try {
      const params: Record<string, string> = { tcgPlayerId: String(id) };
      if (options.includeHistory) {
        params.includeHistory = 'true';
        if (options.days) params.days = String(options.days);
      }
      const response = await apiFetch<SealedProductResponse>('/sealed-products', params);
      if (response.data?.length) {
        results.push(...response.data);
      }
    } catch (err) {
      console.error(`Failed to fetch sealed product ${id}:`, err);
    }
  }

  return results;
}

/**
 * Fetch graded card prices by TCGPlayer IDs.
 * Includes eBay PSA data when includeEbay is true (+1 credit each).
 */
export async function getGradedCardPrices(
  tcgPlayerIds: number[],
  options: { includeEbay?: boolean; includeHistory?: boolean; days?: number } = {}
): Promise<Card[]> {
  const results: Card[] = [];

  for (const id of tcgPlayerIds) {
    try {
      const params: Record<string, string> = { tcgPlayerId: String(id) };
      if (options.includeEbay) params.includeEbay = 'true';
      if (options.includeHistory) {
        params.includeHistory = 'true';
        if (options.days) params.days = String(options.days);
      }
      const response = await apiFetch<CardResponse>('/cards', params);
      if (response.data?.length) {
        results.push(...response.data);
      }
    } catch (err) {
      console.error(`Failed to fetch card ${id}:`, err);
    }
  }

  return results;
}

/**
 * Fetch all available Pokemon TCG sets.
 * Cost: likely 0 credits (metadata only).
 */
export async function getSets(): Promise<SetInfo[]> {
  const response = await apiFetch<SetsResponse>('/sets', {
    sortBy: 'releaseDate',
    sortOrder: 'desc',
    limit: '500',
  });
  return response.data ?? [];
}

/**
 * Fetch all sealed products for a given set slug.
 * Cost: 1 credit per product returned.
 */
export async function getSealedProductsBySet(
  setSlug: string
): Promise<SealedProduct[]> {
  try {
    const response = await apiFetch<SealedProductResponse>('/sealed-products', {
      set: setSlug,
      limit: '100',
    });
    return response.data ?? [];
  } catch (err) {
    console.error(`Failed to fetch sealed products for set ${setSlug}:`, err);
    return [];
  }
}

/**
 * Fetch top cards sorted by a field, with pagination.
 * Cost: 1 credit per card (+1 if includeEbay).
 */
export async function getTopCards(options: {
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
  includeEbay?: boolean;
  minPrice?: number;
}): Promise<{ cards: Card[]; total: number }> {
  const params: Record<string, string> = {
    sortBy: options.sortBy ?? 'price',
    sortOrder: options.sortOrder ?? 'desc',
    limit: String(options.limit ?? 100),
  };
  if (options.offset) params.offset = String(options.offset);
  if (options.includeEbay) params.includeEbay = 'true';
  if (options.minPrice) params.minPrice = String(options.minPrice);

  const response = await apiFetch<CardResponse>('/cards', params);
  return {
    cards: response.data ?? [],
    total: response.pagination?.total ?? 0,
  };
}
