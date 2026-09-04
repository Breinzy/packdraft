import type { Asset, PokeSet } from '@/lib/data';
import { getAsset, hydrateCatalog, mergeAssets, mergeSets } from '@/lib/data';

let snapshotPromise: Promise<void> | null = null;
let snapshotLoaded = false;
const loadedSets = new Set<string>();
const loadedAssets = new Set<string>();

async function readJson<T>(response: Response, fallback: T): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function isSnapshotLoaded(): boolean {
  return snapshotLoaded;
}

export function isSetLoaded(setId: string): boolean {
  return loadedSets.has(setId);
}

export function isAssetLoaded(assetId: string): boolean {
  return loadedAssets.has(assetId);
}

export async function ensureCollectorSnapshot(): Promise<void> {
  if (snapshotLoaded) return;
  if (!snapshotPromise) {
    snapshotPromise = (async () => {
      try {
        const response = await fetch('/api/catalog/snapshot');
        const body = await readJson<{ assets?: Asset[]; sets?: PokeSet[] }>(response, {
          assets: [],
          sets: [],
        });
        hydrateCatalog(body.assets ?? [], body.sets ?? []);
      } catch {
        hydrateCatalog([], []);
      } finally {
        snapshotLoaded = true;
      }
    })();
  }
  await snapshotPromise;
}

export async function ensureSetMembers(setId: string): Promise<void> {
  await ensureCollectorSnapshot();
  if (!setId || loadedSets.has(setId)) return;
  try {
    const response = await fetch(`/api/catalog/sets/${encodeURIComponent(setId)}`);
    const body = await readJson<{ set?: PokeSet | null; assets?: Asset[] }>(response, {
      set: null,
      assets: [],
    });
    if (body.assets?.length) mergeAssets(body.assets);
    if (body.set) mergeSets([body.set], 'replace');
  } catch {
    // Keep the snapshot set row if we have one.
  } finally {
    loadedSets.add(setId);
  }
}

export async function ensureAssetDetail(assetId: string): Promise<void> {
  await ensureCollectorSnapshot();
  if (!assetId || loadedAssets.has(assetId)) return;
  try {
    const response = await fetch(`/api/catalog/assets/${encodeURIComponent(assetId)}`);
    const body = await readJson<{ asset?: Asset | null; set?: PokeSet | null; related?: Asset[] }>(
      response,
      { asset: null, set: null, related: [] }
    );
    const incoming = [...(body.related ?? [])];
    if (body.asset) incoming.unshift(body.asset);
    if (incoming.length) mergeAssets(incoming);
    if (body.set) mergeSets([body.set], getAsset(body.set.id) ? 'fill' : 'replace');
  } catch {
    // Asset-not-found UI handles a missing getAsset().
  } finally {
    loadedAssets.add(assetId);
  }
}
