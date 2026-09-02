/** Optional TCGPlayer affiliate query. Never required. Never logged. */
export function tcgplayerProductUrl(
  externalId: string | null | undefined,
  affiliate: string | null | undefined
): string | null {
  if (!externalId || !/^\d+$/.test(externalId.trim())) return null;
  const url = new URL(`https://www.tcgplayer.com/product/${externalId.trim()}`);
  const code = affiliate?.trim();
  if (code) url.searchParams.set('utm_campaign', 'affiliate');
  if (code) url.searchParams.set('partner', code);
  return url.toString();
}
