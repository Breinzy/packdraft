export const APP_HOME = '/';
export const COLLECTION_PATH = '/portfolio';
export const MARKET_PATH = '/market';
export const WATCHLIST_PATH = '/watchlist';
export const SETS_PATH = '/sets';
export const SANDBOX_PATH = '/sandbox';
export const TOURNAMENTS_PATH = '/tournaments';
export const PREDICTIONS_PATH = '/events';
export const PRO_PATH = '/pro';

export function withQuery(path: string, params: URLSearchParams | Record<string, string | undefined>): string {
  const search =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))
        );
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
