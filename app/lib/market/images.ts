import type { Asset } from '@/types';

export function assetImageSrc(asset: Pick<Asset, 'image_url' | 'external_id'>): string | null {
  if (asset.image_url) return asset.image_url;
  if (asset.external_id) {
    return `https://tcgplayer-cdn.tcgplayer.com/product/${asset.external_id}_in_1000x1000.jpg`;
  }
  return null;
}
