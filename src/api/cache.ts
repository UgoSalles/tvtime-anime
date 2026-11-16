import { db, type CacheRow } from '../lib/db';

const refreshing = new Map<string, Promise<unknown>>();

/**
 * Cache agressif (IndexedDB), « stale-while-revalidate » :
 * - valeur fraîche → renvoyée telle quelle ;
 * - valeur périmée → renvoyée IMMÉDIATEMENT (l'écran ne attend pas le réseau) et rafraîchie en arrière-plan,
 *   la prochaine lecture sera à jour ;
 * - rien en cache → réseau ; en cas d'échec réseau, on ne plante pas si une valeur périmée existe.
 */
export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  let row: CacheRow | undefined;
  try {
    row = await db.apiCache.get(key);
  } catch {
    row = undefined;
  }
  if (row && Date.now() - row.fetchedAt < ttlMs) return row.value as T;

  const refresh = () => {
    const running = refreshing.get(key);
    if (running) return running as Promise<T>;
    const p = fetcher()
      .then((value) => {
        db.apiCache.put({ key, value, fetchedAt: Date.now() }).catch(() => undefined);
        return value;
      })
      .finally(() => refreshing.delete(key));
    refreshing.set(key, p);
    return p;
  };

  if (row) {
    refresh().catch(() => undefined); // arrière-plan : une erreur ici n'est pas gênante
    return row.value as T;
  }
  return refresh();
}

export const TTL = {
  list: 30 * 60 * 1000,
  detail: 6 * 60 * 60 * 1000,
  franchise: 24 * 60 * 60 * 1000,
  episodes: 12 * 60 * 60 * 1000,
  airing: 60 * 60 * 1000,
};
