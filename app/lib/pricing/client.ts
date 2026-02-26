const BASE_URL = 'https://www.pokemonpricetracker.com/api/v2';
const API_KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY ?? '';

export interface SealedProductResponse {
  data: SealedProduct[];
  pagination?: { total: number; limit: number; offset: number };
}

export interface SealedProduct {
  tcgPlayerId: number;
  name: string;
  setName?: string;
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
  imageUrl?: string;
  prices?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  };
  ebay?: {
    psa10?: GradedPriceData;
    psa9?: GradedPriceData;
  };
  priceHistory?: PriceHistoryEntry[];
}

export interface GradedPriceData {
  avg?: number;
  low?: number;
  high?: number;
  salesCount?: number;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error('POKEMON_PRICE_TRACKER_API_KEY is not configured');
  }

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${API_KEY}` },
    next: { revalidate: 0 },
  });

  if (res.status === 429) {
    throw new Error('PokemonPriceTracker rate limit exceeded');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PokemonPriceTracker API error ${res.status}: ${body}`);
  }

  return res.json();
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
