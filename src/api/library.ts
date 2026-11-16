import { db } from '../lib/db';
import type { FollowRow } from '../lib/db';
import { fetchFranchiseNodes, type FranchiseNode } from './anilist';
import { buildFranchise, resolveFranchise, SEPARATE_SHOWS } from './franchise';
import { ensureFollow } from '../db/repo';
import { TTL } from './cache';
import type { Franchise } from './types';

const key = (id: number) => `franchise6:${id}`;

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
      // Franchise « ouverte » : un voisin direct (préquelle / suite) inconnu, hors séries volontairement séparées → parcours complet.
      const open = mine.some((n) =>
        [...n.prequels.map((p) => [p, n.anime.id] as const), ...n.sequels.map((s) => [n.anime.id, s] as const)].some(
          ([p, s]) => !(known.has(p) && known.has(s)) && !SEPARATE_SHOWS.has(s),
        ),
      );
      if (open) deep.push(f);
      const fr = buildFranchise(f.showId, mine);
      void syncFollow(f, fr);
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
    // Franchise incomplète (relation vers un id inconnu) : on ne l'affiche pas tronquée, on attend le parcours complet.
    const full = await Promise.all(deep.map(resolveDeep));
    deep.forEach((f, i) => full[i] && out.set(f.showId, full[i]!));
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

/** Parcours complet (relations) d'une franchise dont une saison manque ou dont une suite est apparue. */
function resolveDeep(f: FollowRow): Promise<Franchise | null> {
  return db.apiCache
    .delete(key(f.showId))
    .then(() => resolveFranchise(f.showId))
    .then(async (fr) => {
      // Les ids de la franchise ont changé : on met à jour le suivi pour les prochains lots.
      await syncFollow(f, fr);
      return fr;
    })
    .catch(() => null);
}

function runDeep(list: FollowRow[], onRefreshed: () => void) {
  list.forEach((f) => void resolveDeep(f).then((fr) => fr && onRefreshed()));
}

/**
 * Garde le suivi aligné sur la franchise : met à jour les ids, et si des entrées en sont sorties (série séparée,
 * ex. Boruto détaché de Naruto), leurs épisodes déjà cochés passent sur le suivi de la série séparée.
 */
async function syncFollow(f: FollowRow, fr: Franchise) {
  const now = new Set(fr.ids);
  const removed = f.ids.filter((id) => !now.has(id));
  if (!removed.length && fr.ids.length === f.ids.length) return;
  try {
    await db.follows.update(f.showId, { ids: fr.ids });
    if (!removed.length) return;
    const orphans = await db.watched.where('showId').equals(f.showId).filter((w) => removed.includes(w.seasonId)).toArray();
    const reacts = await db.reactions.where('showId').equals(f.showId).filter((r) => removed.includes(r.seasonId)).toArray();
    if (!orphans.length && !reacts.length) return;
    const other = await resolveFranchise(orphans[0]?.seasonId ?? reacts[0]!.seasonId);
    await ensureFollow(other);
    await db.watched.where('showId').equals(f.showId).filter((w) => other.ids.includes(w.seasonId)).modify({ showId: other.rootId });
    await db.reactions.where('showId').equals(f.showId).filter((r) => other.ids.includes(r.seasonId)).modify({ showId: other.rootId });
  } catch {
    /* réessayé au prochain chargement */
  }
}
