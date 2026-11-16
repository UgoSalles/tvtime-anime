import { db, type CacheRow } from '../lib/db';

/**
 * Cache agressif (IndexedDB) : renvoie la valeur fraîche si elle existe, sinon appelle le réseau ;
 * en cas d'échec réseau (hors-ligne, quota…), renvoie la valeur périmée plutôt que de planter.
 */
export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  let row: CacheRow | undefined;
  try {
    row = await db.apiCache.get(key);
  } catch {
    row = undefined;
  }
  if (row && Date.now() - row.fetchedAt < ttlMs) return row.value as T;
  try {
    const value = await fetcher();
    db.apiCache.put({ key, value, fetchedAt: Date.now() }).catch(() => undefined);
    return value;
  } catch (e) {
    if (row) return row.value as T;
    throw e;
  }
}

export const TTL = {
  list: 30 * 60 * 1000,
  detail: 6 * 60 * 60 * 1000,
  franchise: 24 * 60 * 60 * 1000,
  episodes: 12 * 60 * 60 * 1000,
  airing: 60 * 60 * 1000,
};
