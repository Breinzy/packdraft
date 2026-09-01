import { gunzipSync } from 'node:zlib';

const BASE_URL = 'https://www.pokemonpricetracker.com/api/v2';

function getApiKey() {
  return process.env.POKEMON_PRICE_TRACKER_API_KEY ?? '';
}

export interface SetInfo {
  id: string;
  name: string;
  slug?: string;
  tcgPlayerId?: string;
  tcgPlayerNumericId?: number;
  releaseDate?: string;
  totalCards?: number;
  cardCount?: number;
  hasPriceGuide?: boolean;
}

export interface SetsResponse {
  data: SetInfo[];
  pagination?: ApiPagination;
  metadata?: ApiPagination;
}

export interface ApiPagination {
  total: number;
  count?: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export interface SealedProductResponse {
  data: SealedProduct[];
  pagination?: ApiPagination;
  metadata?: ApiPagination;
}

export interface CardResponse {
  data: Card[];
  pagination?: ApiPagination;
  metadata?: ApiPagination;
}

export interface SealedProduct {
  tcgPlayerId: number;
  name: string;
  setName?: string;
  setSlug?: string;
  setId?: string;
  imageUrl?: string;
  imageCdnUrl?: string;
  unopenedPrice?: number;
  prices?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  };
  priceHistory?: PriceHistoryEntry[];
}

export interface Card {
  tcgPlayerId: number;
  name: string;
  setName?: string;
  number?: string;
  cardNumber?: string;
  rarity?: string;
  imageUrl?: string;
  imageCdnUrl?: string;
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

function getTotal(res: { pagination?: ApiPagination; metadata?: ApiPagination }): number {
  return res.pagination?.total ?? res.metadata?.total ?? 0;
}

const MAX_RETRIES = 1;
const INITIAL_BACKOFF_MS = 5000;
/** Abort hung PPT HTTP calls so a chunk cannot sit past Vercel maxDuration. */
export const PPT_REQUEST_TIMEOUT_MS = 45_000;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

export interface ProviderResponseMeta {
  creditsConsumed: number;
  dailyRemaining: number | null;
  minuteRemaining: number | null;
  retryAfterSeconds: number | null;
}

export class PokemonPriceTrackerRateLimitError extends Error {
  readonly status = 429;
  constructor(
    message: string,
    readonly limitType: 'daily' | 'per_minute' | 'unknown',
    readonly retryAfterSeconds: number
  ) {
    super(message);
    this.name = 'PokemonPriceTrackerRateLimitError';
  }
}

function headerNumber(res: Response, name: string): number | null {
  const raw = res.headers.get(name);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function creditsFromBody(body: unknown): number {
  if (!body || typeof body !== 'object' || !('metadata' in body)) return 0;
  const consumed = (body as { metadata?: { apiCallsConsumed?: { total?: number } | number } })
    .metadata?.apiCallsConsumed;
  if (typeof consumed === 'number' && Number.isFinite(consumed)) return consumed;
  if (consumed && typeof consumed === 'object' && typeof consumed.total === 'number') {
    return consumed.total;
  }
  return 0;
}

function parseMeta(res: Response, body: unknown): ProviderResponseMeta {
  const fromHeader =
    headerNumber(res, 'X-API-Calls-Consumed') ?? headerNumber(res, 'X-RateLimit-Cost') ?? 0;
  const creditsConsumed = fromHeader || creditsFromBody(body);
  const retryAfter = headerNumber(res, 'Retry-After');
  return {
    creditsConsumed,
    dailyRemaining:
      headerNumber(res, 'X-RateLimit-Daily-Remaining') ??
      headerNumber(res, 'X-RateLimit-Total-Remaining'),
    minuteRemaining: headerNumber(res, 'X-RateLimit-Minute-Remaining'),
    retryAfterSeconds: retryAfter,
  };
}

async function parseRateLimit(res: Response, bodyText: string): Promise<PokemonPriceTrackerRateLimitError> {
  const retryAfter = headerNumber(res, 'Retry-After') ?? 60;
  let limitType: 'daily' | 'per_minute' | 'unknown' = 'unknown';
  try {
    const parsed = JSON.parse(bodyText) as { limitType?: string };
    if (parsed.limitType === 'daily' || parsed.limitType === 'per_minute') {
      limitType = parsed.limitType;
    }
  } catch {
    // body is not JSON
  }
  return new PokemonPriceTrackerRateLimitError(
    `PokemonPriceTracker rate limit exceeded (${limitType})`,
    limitType,
    retryAfter
  );
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<{
  body: T;
  meta: ProviderResponseMeta;
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('POKEMON_PRICE_TRACKER_API_KEY is not configured');
  }

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== '') url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(PPT_REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt < MAX_RETRIES && isAbortError(err)) {
        continue;
      }
      if (isAbortError(err)) {
        throw new Error(`PokemonPriceTracker request timed out after ${PPT_REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    }

    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      const error = await parseRateLimit(res, body);
      if (attempt < MAX_RETRIES && error.limitType !== 'daily') {
        await new Promise((r) => setTimeout(r, error.retryAfterSeconds * 1000 || INITIAL_BACKOFF_MS));
        continue;
      }
      throw error;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`PokemonPriceTracker API error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as T;
    return { body: json, meta: parseMeta(res, json) };
  }

  throw new Error('PokemonPriceTracker: exhausted retries');
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function creditsOrEstimate(meta: ProviderResponseMeta, itemCount: number, perItem = 1): number {
  if (meta.creditsConsumed > 0) return meta.creditsConsumed;
  return Math.max(1, itemCount) * perItem;
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
      const { body } = await apiFetch<SealedProductResponse>('/sealed-products', params);
      results.push(...asArray(body.data));
    } catch {
      // individual product failures are silent; caller gets partial results
    }
  }

  return results;
}

/**
 * Fetch card prices by TCGPlayer IDs.
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
      const { body } = await apiFetch<CardResponse>('/cards', params);
      results.push(...asArray(body.data));
    } catch {
      // individual card failures are silent; caller gets partial results
    }
  }

  return results;
}

/**
 * Fetch Pokemon TCG sets. Metadata-only; typically 0 credits.
 */
export async function getSets(): Promise<SetInfo[]> {
  const { body } = await apiFetch<SetsResponse>('/sets', {
    sortBy: 'releaseDate',
    sortOrder: 'desc',
    limit: '500',
    language: 'english',
  });
  return body.data ?? [];
}

export async function getAllSets(): Promise<{ sets: SetInfo[]; meta: ProviderResponseMeta }> {
  const sets: SetInfo[] = [];
  let offset = 0;
  const limit = 100;
  let lastMeta: ProviderResponseMeta = {
    creditsConsumed: 0,
    dailyRemaining: null,
    minuteRemaining: null,
    retryAfterSeconds: null,
  };

  for (;;) {
    const { body, meta } = await apiFetch<SetsResponse>('/sets', {
      sortBy: 'name',
      sortOrder: 'asc',
      limit: String(limit),
      offset: String(offset),
      language: 'english',
    });
    lastMeta = meta;
    const page = body.data ?? [];
    sets.push(...page);
    const total = getTotal(body);
    offset += page.length;
    const reachedTotal = total > 0 && offset >= total;
    if (page.length === 0 || page.length < limit || reachedTotal) break;
  }

  return { sets, meta: lastMeta };
}

/**
 * Fetch all sealed products for a given set slug.
 * Cost: billed on requested limit (or set size with fetchAllInSet).
 */
export async function getSealedProductsBySet(
  setSlug: string
): Promise<SealedProduct[]> {
  try {
    const { body } = await apiFetch<SealedProductResponse>('/sealed-products', {
      set: setSlug,
      fetchAllInSet: 'true',
    });
    return asArray(body.data);
  } catch {
    return [];
  }
}

export async function getSealedProductsPage(options: {
  search?: string;
  minPrice?: number;
  set?: string;
  fetchAllInSet?: boolean;
  limit?: number;
  offset?: number;
  language?: string;
}): Promise<{ products: SealedProduct[]; total: number; meta: ProviderResponseMeta }> {
  const params: Record<string, string> = {
    language: options.language ?? 'english',
  };
  if (options.search) params.search = options.search;
  if (options.minPrice != null) params.minPrice = String(options.minPrice);
  if (options.set) params.set = options.set;
  if (options.fetchAllInSet) {
    params.fetchAllInSet = 'true';
  } else {
    params.limit = String(options.limit ?? 50);
    if (options.offset) params.offset = String(options.offset);
  }

  const { body, meta } = await apiFetch<SealedProductResponse>('/sealed-products', params);
  const products = asArray(body.data);
  return {
    products,
    total: getTotal(body),
    meta: {
      ...meta,
      creditsConsumed: creditsOrEstimate(meta, products.length || Number(params.limit ?? 1)),
    },
  };
}

/**
 * Fetch sealed products by search term, paginated.
 * Cost: billed on requested limit, not matches returned.
 */
export async function getSealedProductsBySearch(options: {
  search: string;
  limit?: number;
  offset?: number;
}): Promise<{ products: SealedProduct[]; total: number; meta: ProviderResponseMeta }> {
  return getSealedProductsPage({
    search: options.search,
    limit: options.limit,
    offset: options.offset,
  });
}

export async function getCardsPage(options: {
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
  includeEbay?: boolean;
  minPrice?: number;
  set?: string;
  setId?: string;
  fetchAllInSet?: boolean;
  language?: string;
}): Promise<{ cards: Card[]; total: number; meta: ProviderResponseMeta }> {
  const params: Record<string, string> = {
    language: options.language ?? 'english',
  };
  if (options.setId) params.setId = options.setId;
  if (options.set) params.set = options.set;
  if (options.fetchAllInSet) {
    params.fetchAllInSet = 'true';
  } else {
    params.sortBy = options.sortBy ?? 'cardNumber';
    params.sortOrder = options.sortOrder ?? 'asc';
    params.limit = String(options.limit ?? (options.includeEbay ? 50 : 100));
    if (options.offset) params.offset = String(options.offset);
  }
  if (options.includeEbay) params.includeEbay = 'true';
  if (options.minPrice) params.minPrice = String(options.minPrice);

  const { body, meta } = await apiFetch<CardResponse>('/cards', params);
  const cards = asArray(body.data);
  const perItem = options.includeEbay ? 2 : 1;
  return {
    cards,
    total: getTotal(body),
    meta: {
      ...meta,
      creditsConsumed: creditsOrEstimate(meta, cards.length || Number(params.limit ?? 1), perItem),
    },
  };
}

/**
 * Fetch top cards sorted by a field, with pagination.
 * Cost: billed on requested limit (+1/card if includeEbay).
 */
export async function getTopCards(options: {
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
  includeEbay?: boolean;
  minPrice?: number;
}): Promise<{ cards: Card[]; total: number; meta: ProviderResponseMeta }> {
  return getCardsPage({
    sortBy: options.sortBy ?? 'price',
    sortOrder: options.sortOrder ?? 'desc',
    limit: options.limit,
    offset: options.offset,
    includeEbay: options.includeEbay,
    minPrice: options.minPrice,
  });
}

export type PptExportType = 'cards' | 'printings' | 'sealed' | 'ebay' | 'population';

export type ExportResult =
  | { ok: true; csv: string; downloadsRemaining: number | null }
  | { ok: false; status: number; retryAfterSeconds: number | null; message: string };

/**
 * Business-plan daily CSV dump. 0 credits, 2 downloads/day.
 * Follows the 302 to blob storage without forwarding the API key.
 */
export async function tryDownloadExport(type: PptExportType): Promise<ExportResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('POKEMON_PRICE_TRACKER_API_KEY is not configured');
  }

  const url = new URL(`${BASE_URL}/export`);
  url.searchParams.set('type', type);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    redirect: 'manual',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(PPT_REQUEST_TIMEOUT_MS),
  });

  const downloadsRemaining = headerNumber(res, 'X-Export-Downloads-Remaining');
  const retryAfterSeconds = headerNumber(res, 'Retry-After');

  if (res.status === 403) {
    return { ok: false, status: 403, retryAfterSeconds: null, message: 'Export requires Business plan' };
  }
  if (res.status === 503) {
    return {
      ok: false,
      status: 503,
      retryAfterSeconds: retryAfterSeconds ?? 3600,
      message: 'Export dump is not ready yet',
    };
  }
  if (res.status === 429) {
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: retryAfterSeconds ?? 3600,
      message: 'Export daily download quota reached',
    };
  }

  let gzipUrl: string | null = null;
  if (res.status === 302 || res.status === 301 || res.status === 307 || res.status === 308) {
    gzipUrl = res.headers.get('Location');
  } else if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    const csv = maybeGunzipToString(buf);
    return { ok: true, csv, downloadsRemaining };
  } else {
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, retryAfterSeconds, message: body.slice(0, 300) };
  }

  if (!gzipUrl) {
    return { ok: false, status: res.status, retryAfterSeconds, message: 'Export redirect missing Location' };
  }

  const file = await fetch(gzipUrl, {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(PPT_REQUEST_TIMEOUT_MS),
  });
  if (!file.ok) {
    return {
      ok: false,
      status: file.status,
      retryAfterSeconds: null,
      message: `Export blob download failed (${file.status})`,
    };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return { ok: true, csv: maybeGunzipToString(buf), downloadsRemaining };
}

function maybeGunzipToString(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString('utf8');
  }
  return buf.toString('utf8');
}
