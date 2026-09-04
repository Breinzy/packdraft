import { describe, expect, it } from 'vitest';
import { hydrateCatalog, getAsset, getSet, mergeAssets, assetsInSet, positionUnitPrice } from './data';

describe('collector catalog cache', () => {
  it('hydrates lookup maps used by the mockup UI', () => {
    hydrateCatalog(
      [
        {
          id: 'a1',
          type: 'card',
          name: 'Pikachu',
          subtitle: '025',
          setId: 's1',
          setName: 'Base',
          tag: 'Rare',
          energy: 'lightning',
          price: 10,
          change24h: 0,
          change7d: 1,
          change30d: 0,
          volume: 3,
          watchers: 0,
          releasedAt: '2024-01-01',
          history: [10],
        },
      ],
      [
        {
          id: 's1',
          name: 'Base',
          code: 'BS',
          releasedAt: '2024-01-01',
          cardCount: 1,
          logoColor: 'oklch(0.7 0.14 80)',
          price: 10,
          change30d: 0,
          history: [10],
        },
      ]
    );

    expect(getAsset('a1')?.name).toBe('Pikachu');
    expect(getSet('s1')?.code).toBe('BS');
    expect(assetsInSet('s1')).toHaveLength(1);
    expect(positionUnitPrice({ assetId: 'a1', quantity: 2, costBasisPerUnit: 8, purchaseDate: '2024-01-02' })).toBe(10);
  });

  it('keeps a longer recorded history when merging the same asset', () => {
    hydrateCatalog(
      [
        {
          id: 'a1',
          type: 'card',
          name: 'Pikachu',
          subtitle: '',
          setId: 's1',
          setName: 'Base',
          tag: 'Card',
          energy: 'lightning',
          price: 12,
          change24h: 0,
          change7d: 0,
          change30d: 0,
          volume: 0,
          watchers: 0,
          releasedAt: '',
          history: [10],
        },
      ],
      []
    );
    mergeAssets([
      {
        id: 'a1',
        type: 'card',
        name: 'Pikachu',
        subtitle: '',
        setId: 's1',
        setName: 'Base',
        tag: 'Card',
        energy: 'lightning',
        price: 12,
        change24h: 0,
        change7d: 0,
        change30d: 0,
        volume: 0,
        watchers: 0,
        releasedAt: '',
        history: [9, 11, 12],
      },
    ]);
    expect(getAsset('a1')?.history).toEqual([9, 11, 12]);
  });
});
