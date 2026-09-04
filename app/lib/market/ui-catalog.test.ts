import { describe, expect, it } from 'vitest';
import type { CatalogAsset } from '@/types';
import {
  catalogAssetToUi,
  catalogSetToUi,
  energyFromMetadata,
  honestHistory,
  setCode,
  subtitleFromCatalog,
  tagFromCatalog,
} from './ui-catalog';

const baseAsset: CatalogAsset = {
  id: 'asset-1',
  name: 'Umbreon ex',
  asset_type: 'single',
  image_url: null,
  external_id: '123',
  metadata: { cardNumber: '161/131', rarity: 'Special Illustration Rare' },
  tcg_id: 'tcg-1',
  tcg_name: 'Pokémon',
  tcg_slug: 'pokemon',
  set_id: 'set-1',
  set_name: 'Prismatic Evolutions',
  set_slug: 'prismatic-evolutions',
  set_release_date: '2025-01-17',
  price: 1420,
  recorded_at: '2026-09-01T00:00:00.000Z',
  change_7d: 6.8,
  volume: 12,
  source: 'pokemonpricetracker',
  price_type: 'market',
  condition: 'ungraded',
  stale: false,
};

describe('catalogAssetToUi', () => {
  it('maps a single onto the mockup Asset contract without inventing 24h or watchers', () => {
    const ui = catalogAssetToUi(baseAsset);
    expect(ui.type).toBe('card');
    expect(ui.subtitle).toBe('161/131');
    expect(ui.tag).toBe('Special Illustration Rare');
    expect(ui.change24h).toBe(0);
    expect(ui.change7d).toBe(6.8);
    expect(ui.change30d).toBe(0);
    expect(ui.watchers).toBe(0);
    expect(ui.grades).toBeUndefined();
    expect(ui.history).toEqual([1420]);
    expect(ui.releasedAt).toBe('2025-01-17');
  });

  it('maps sealed products to sealed and uses subtype tags', () => {
    const ui = catalogAssetToUi({
      ...baseAsset,
      name: 'Prismatic Evolutions Elite Trainer Box',
      asset_type: 'sealed',
      metadata: { sealedSubtype: 'etb' },
      condition: 'unopened',
    });
    expect(ui.type).toBe('sealed');
    expect(ui.subtitle).toBe('Elite Trainer Box');
    expect(ui.tag).toBe('Elite Trainer Box');
  });

  it('uses recorded history when Packdraft has snapshots', () => {
    expect(catalogAssetToUi(baseAsset, null, [100, 110, 1420]).history).toEqual([100, 110, 1420]);
  });
});

describe('honestHistory', () => {
  it('does not synthesize a walk when only the current price is known', () => {
    expect(honestHistory(12.5)).toEqual([12.5]);
    expect(honestHistory(0)).toEqual([]);
  });
});

describe('set helpers', () => {
  it('builds set codes from slugs', () => {
    expect(setCode({ name: 'Prismatic Evolutions', slug: 'prismatic-evolutions' })).toBe('PE');
  });

  it('averages known member prices into a set index and leaves 30d change at 0', () => {
    const members = [
      catalogAssetToUi({ ...baseAsset, id: 'a', price: 10 }),
      catalogAssetToUi({ ...baseAsset, id: 'b', price: 30 }),
    ];
    const set = catalogSetToUi(
      {
        id: 'set-1',
        name: 'Prismatic Evolutions',
        slug: 'prismatic-evolutions',
        release_date: '2025-01-17',
        asset_count: 180,
      },
      members
    );
    expect(set.price).toBe(20);
    expect(set.change30d).toBe(0);
    expect(set.cardCount).toBe(180);
  });
});

describe('metadata helpers', () => {
  it('defaults energy to colorless when the catalog has none', () => {
    expect(energyFromMetadata({})).toBe('colorless');
    expect(energyFromMetadata({ energy: 'fire' })).toBe('fire');
  });

  it('prefers card number then rarity', () => {
    expect(subtitleFromCatalog(baseAsset)).toBe('161/131');
    expect(tagFromCatalog(baseAsset)).toBe('Special Illustration Rare');
  });
});
