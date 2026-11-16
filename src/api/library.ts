import { db } from '../lib/db';
import type { FollowRow } from '../lib/db';
import { fetchFranchiseNodes, type FranchiseNode } from './anilist';
import { buildFranchise, resolveFranchise } from './franchise';
import { TTL } from './cache';
import type { Franchise } from './types';

const key = (id: number) => `franchise3:${id}`;

/**
 * Franchises de TOUTES les séries suivies, vite :
 * 1. lecture du cache IndexedDB (même périmé) → réponse immédiate ;
 * 2. pour les absentes / périmées : UNE requête groupée (`id_in`) avec les ids déjà connus de chaque suivi
 *    (au lieu de 2-3 requêtes en cascade par série) ;
 * 3. si les relations révèlent un id inconnu (nouvelle suite annoncée), on relance le parcours complet de cette
 *    franchise en arrière-plan.
 * `onRefreshed` est appelé quand l'arrière-plan a mis des données à jour.
 */
export async function loadLibraryFranchises(follows: FollowRow[], onRefreshed: () => void, signal?: AbortSignal): Promise<Map<number, Franchise>> {
  const out = new Map<number, Franchise>();
  if (!follows.length) return out;

  const rows = await db.apiCache.bulkGet(follows.map((f) => key(f.showId))).catch(() => []);
  const stale: FollowRow[] = [];
  const now = Date.now();
  follows.forEach((f, i) => {
    const r = rows[i];
    if (r) {
      out.set(f.showId, r.value as Franchise);
      if (now - r.fetchedAt >= TTL.franchise) stale.push(f);
    } else stale.push(f);
  });
  if (!stale.length) return out;

  const missing = stale.filter((f) => !out.has(f.showId));
  const refresh = async (list: FollowRow[]) => {
    const ids = [...new Set(list.flatMap((f) => f.ids))];
    const nodes = new Map<number, FranchiseNode>();
    for (let i = 0; i < ids.length; i += 50) (await fetchFranchiseNodes(ids.slice(i, i + 50), signal)).forEach((n) => nodes.set(n.anime.id, n));
    const putRows: { key: string; value: Franchise; fetchedAt: number }[] = [];
    const deep: FollowRow[] = [];
    const result = new Map<number, Franchise>();
    for (const f of list) {
      const mine = f.ids.map((id) => nodes.get(id)).filter((n): n is FranchiseNode => !!n);
      if (!mine.length) continue;
      const known = new Set(f.ids);
      if (mine.some((n) => n.links.some((l) => !known.has(l)))) deep.push(f); // nouvelle relation : parcours complet
      const fr = buildFranchise(f.showId, mine);
      result.set(f.showId, fr);
      fr.ids.forEach((id) => putRows.push({ key: key(id), value: fr, fetchedAt: Date.now() }));
    }
    await db.apiCache.bulkPut(putRows).catch(() => undefined);
    return { result, deep };
  };

  // Les absentes : on attend (une requête). Les périmées : arrière-plan, on garde l'ancienne valeur.
  if (missing.length) {
    const { result, deep } = await refresh(missing);
    result.forEach((v, k) => out.set(k, v));
    runDeep(deep, onRefreshed);
  }
  const old = stale.filter((f) => out.has(f.showId) && !missing.includes(f));
  if (old.length)
    void refresh(old)
      .then(({ deep }) => {
        runDeep(deep, onRefreshed);
        onRefreshed();
      })
      .catch(() => undefined);
  return out;
}

/** Parcours complet (relations) des franchises dont une nouvelle suite est apparue. */
function runDeep(list: FollowRow[], onRefreshed: () => void) {
  list.forEach((f) => {
    void db.apiCache
      .delete(key(f.showId))
      .then(() => resolveFranchise(f.showId))
      .then(async (fr) => {
        // Les ids de la franchise ont changé : on met à jour le suivi pour les prochains lots.
        await db.follows.update(f.showId, { ids: fr.ids });
        onRefreshed();
      })
      .catch(() => undefined);
  });
}
