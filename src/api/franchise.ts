import { db } from '../lib/db';
import { cachedFetch, TTL } from './cache';
import { fetchFranchiseNodes, type FranchiseNode } from './anilist';
import type { Anime, Franchise, FranchiseSeason } from './types';

/**
 * Sur AniList chaque saison est une entrée séparée. On remonte/descend les relations
 * PREQUEL / SEQUEL (un lot `id_in` par « génération » : 2-3 requêtes pour une franchise)
 * et on présente les formats TV / TV_SHORT / ONA comme les saisons d'UNE série ;
 * films, OVA et spéciaux liés vont dans `extras`.
 *
 * Limites connues : les « Part 2 » / cours scindés comptent comme des saisons distinctes ;
 * One Piece reste une seule saison (AniList n'a pas le découpage TVDB « S22 » de TV Time).
 */
const SEASON_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);
const MAX_NODES = 30;

const dateKey = (a: Anime) => {
  const d = a.startDate;
  if (!d?.year) return Number.MAX_SAFE_INTEGER; // pas encore daté : en dernier
  return d.year * 10000 + (d.month ?? 1) * 100 + (d.day ?? 1);
};

export function airedCount(a: Anime): number | null {
  if (a.status === 'NOT_YET_RELEASED') return 0;
  if (a.status === 'RELEASING') return a.nextAiring ? Math.max(0, a.nextAiring.episode - 1) : a.episodes;
  return a.episodes;
}

export function buildFranchise(rootId: number, nodes: FranchiseNode[]): Franchise {
  const animes = nodes.map((n) => n.anime);
  let seasonsRaw = animes
    .filter((a) => a.format && SEASON_FORMATS.has(a.format))
    .sort((a, b) => dateKey(a) - dateKey(b) || a.id - b.id);
  // Film / OVA / spécial sans série TV : l'entrée demandée est elle-même l'unique « saison ».
  if (!seasonsRaw.length) seasonsRaw = animes.filter((a) => a.id === rootId);
  const seasonIds = new Set(seasonsRaw.map((a) => a.id));
  let offset = 0;
  const seasons: FranchiseSeason[] = seasonsRaw.map((anime, i) => {
    const s: FranchiseSeason = { number: i + 1, anime, aired: airedCount(anime), offset };
    offset += anime.episodes ?? s.aired ?? 0;
    return s;
  });
  const extras = animes.filter((a) => !seasonIds.has(a.id)).sort((a, b) => dateKey(a) - dateKey(b));
  return { rootId: seasons[0]?.anime.id ?? rootId, ids: animes.map((a) => a.id), seasons, extras };
}

export function resolveFranchise(id: number, signal?: AbortSignal): Promise<Franchise> {
  return cachedFetch(`franchise3:${id}`, TTL.franchise, async () => {
    const known = new Map<number, FranchiseNode>();
    const seen = new Set<number>([id]);
    let frontier = [id];
    for (let round = 0; round < 6 && frontier.length && known.size < MAX_NODES; round++) {
      const nodes = await fetchFranchiseNodes(frontier.slice(0, 50), signal);
      frontier = [];
      for (const n of nodes) {
        known.set(n.anime.id, n);
        for (const l of n.links) if (!seen.has(l)) (seen.add(l), frontier.push(l));
      }
    }
    const franchise = buildFranchise(id, [...known.values()]);
    // La même franchise répond pour chacun de ses membres (évite de refaire le parcours).
    const now = Date.now();
    db.apiCache
      .bulkPut(franchise.ids.map((m) => ({ key: `franchise3:${m}`, value: franchise, fetchedAt: now })))
      .catch(() => undefined);
    return franchise;
  });
}

/** Position (saison, épisode) d'un numéro absolu 1-based. */
export function locateAbsolute(f: Franchise, absolute: number): { season: FranchiseSeason; episode: number } | null {
  for (const s of f.seasons) {
    const total = s.anime.episodes ?? s.aired ?? 0;
    if (absolute > s.offset && absolute <= s.offset + total) return { season: s, episode: absolute - s.offset };
  }
  return null;
}

export const totalAired = (f: Franchise) => f.seasons.reduce((n, s) => n + (s.aired ?? 0), 0);
