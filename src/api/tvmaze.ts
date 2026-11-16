import { cachedFetch, TTL } from './cache';
import { fetchJsonWithRetry, RateLimitedQueue } from './queue';
import { stripSeasonSuffix } from '../lib/titles';
import type { Anime, EpisodeInfo } from './types';

/**
 * TVmaze : images d'épisodes pour les sorties récentes (Kitsu les reçoit avec des semaines de retard).
 * Aucune clé, CORS ouvert. Les épisodes sont rapprochés PAR DATE DE DIFFUSION (jamais par numéro : TVmaze découpe
 * les saisons à sa façon), et une série n'est retenue que si l'un de ses épisodes sort à la date de début de la
 * saison — ce qui écarte les homonymes (ex. l'adaptation live-action de One Piece).
 */
const BASE = 'https://api.tvmaze.com';
const queue = new RateLimitedQueue(120, 6);
const DAY = 86_400_000;

/** Épisode compact : date de diffusion (AAAA-MM-JJ), image moyenne, image originale. */
interface TvmEp {
  d: string;
  /** Titre de l'épisode (secours si Jikan et Kitsu n'en ont pas). */
  n: string | null;
  m: string | null;
  o: string | null;
}
interface RawShow {
  id: number;
  name: string;
  type?: string;
  language?: string | null;
  genres?: string[];
}
interface RawEp {
  name?: string | null;
  airdate: string | null;
  image: { medium?: string; original?: string } | null;
}

const https = (u: string | null | undefined) => (u ? u.replace(/^http:/, 'https:') : null);
const dayOf = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY);

const startDay = (a: Anime) => {
  const d = a.startDate;
  return d?.year && d.month && d.day ? Math.floor(Date.UTC(d.year, d.month - 1, d.day) / DAY) : null;
};

const searchShows = (q: string, signal?: AbortSignal) =>
  fetchJsonWithRetry<{ show: RawShow }[]>(queue, `${BASE}/search/shows?q=${encodeURIComponent(q)}`, {}, { signal, retries: 1 }).then((r) =>
    r.map((x) => x.show).filter((s) => s.language === 'Japanese' || s.type === 'Animation' || s.genres?.includes('Anime')),
  );

const showEpisodes = (showId: number, signal?: AbortSignal) =>
  cachedFetch<TvmEp[]>(`tvmaze:eps:${showId}`, TTL.episodes, async () => {
    const raw = await fetchJsonWithRetry<RawEp[]>(queue, `${BASE}/shows/${showId}/episodes`, {}, { signal, retries: 1 });
    return raw.filter((e) => !!e.airdate).map((e) => ({ d: e.airdate!, n: e.name ?? null, m: https(e.image?.medium), o: https(e.image?.original) }));
  });

/** Série TVmaze correspondant à cette saison (ou null), vérifiée par la date du premier épisode. */
async function findShow(anime: Anime, signal?: AbortSignal): Promise<number | null> {
  const start = startDay(anime);
  if (start === null) return null; // date incomplète : impossible de vérifier, on n'affiche rien plutôt qu'une erreur
  const queries = [...new Set([anime.title.english, anime.title.romaji].filter((t): t is string => !!t).map(stripSeasonSuffix))];
  const tried = new Set<number>();
  for (const q of queries) {
    let shows: RawShow[] = [];
    try {
      shows = await searchShows(q, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      continue;
    }
    for (const s of shows.slice(0, 4)) {
      if (tried.has(s.id)) continue;
      tried.add(s.id);
      try {
        const eps = await showEpisodes(s.id, signal);
        if (eps.some((e) => Math.abs(dayOf(e.d) - start) <= 3)) return s.id;
      } catch (e) {
        if (signal?.aborted) throw e;
      }
    }
  }
  return null;
}

/** Épisodes TVmaze (avec images) de la série qui correspond à cette saison ; liste vide sinon. */
export async function fetchTvmazeEpisodes(anime: Anime, signal?: AbortSignal): Promise<TvmEp[]> {
  const showId = await cachedFetch<number | null>(`tvmaze:show:${anime.id}`, 7 * DAY, () => findShow(anime, signal));
  return showId ? showEpisodes(showId, signal) : [];
}

/**
 * Ajoute l'image (et le titre, à défaut) TVmaze aux épisodes qui n'en ont pas encore : épisode de TVmaze diffusé le même jour (à ±1 jour),
 * à condition qu'il soit unique — sinon (sorties groupées) on n'affiche rien plutôt que le mauvais épisode.
 */
export function mergeTvmaze<T extends EpisodeInfo>(episodes: T[], tv: TvmEp[] | undefined): T[] {
  if (!tv?.length) return episodes;
  const byDay = new Map<number, TvmEp[]>();
  for (const e of tv) {
    if (!e.m && !e.o && !e.n) continue;
    const k = dayOf(e.d);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  // Un même jour a-t-il plusieurs épisodes dans TVmaze (sortie groupée) ? Alors aucune correspondance sûre.
  const allByDay = new Map<number, number>();
  for (const e of tv) allByDay.set(dayOf(e.d), (allByDay.get(dayOf(e.d)) ?? 0) + 1);
  return episodes.map((e) => {
    if ((e.thumbnail && e.title) || !e.aired) return e;
    const k = dayOf(e.aired);
    const exact = allByDay.get(k) === 1 ? byDay.get(k) : undefined;
    let hit = exact?.[0];
    if (!hit && !allByDay.get(k)) {
      const near = [k - 1, k + 1].filter((n) => allByDay.get(n) === 1 && byDay.has(n));
      if (near.length === 1) hit = byDay.get(near[0]!)![0];
    }
    return hit ? { ...e, title: e.title ?? hit.n, thumbnail: e.thumbnail ?? hit.m ?? hit.o, thumbnailLarge: e.thumbnailLarge ?? hit.o ?? hit.m } : e;
  });
}
