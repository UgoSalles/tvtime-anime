import { fetchJikanEpisodes } from './jikan';
import type { KitsuEpisode } from './kitsu';
import type { EpisodeInfo, FranchiseSeason } from './types';

export const EPISODES_PER_PAGE = 100;

export interface SeasonEpisodes {
  episodes: EpisodeInfo[];
  /** Vrai si ni Jikan ni AniList n'ont donné de titres : numérotation seule. */
  degraded: boolean;
  total: number;
  page: number;
  pageCount: number;
}

const bounds = (season: FranchiseSeason, page: number) => {
  const total = season.anime.episodes ?? season.aired ?? 0;
  return { total, from: (page - 1) * EPISODES_PER_PAGE + 1, to: Math.min(total, page * EPISODES_PER_PAGE) };
};

/**
 * Liste instantanée (numéros seuls, sans réseau) : l'écran l'affiche tout de suite
 * pendant que les titres arrivent — plus de page blanche à attendre.
 */
export function placeholderEpisodes(season: FranchiseSeason, page: number): SeasonEpisodes {
  const { total, from, to } = bounds(season, page);
  const a = season.anime;
  const episodes: EpisodeInfo[] = [];
  for (let n = from; n <= to; n++)
    episodes.push({ number: n, title: null, aired: a.nextAiring?.episode === n ? new Date(a.nextAiring.airingAt * 1000).toISOString() : null });
  return { episodes, degraded: false, total, page, pageCount: Math.max(1, Math.ceil(total / EPISODES_PER_PAGE)) };
}

/**
 * Une page (100 épisodes) enrichie par Jikan (titres + dates) : UN seul appel, rapide.
 */
export async function loadSeasonEpisodes(season: FranchiseSeason, page: number, signal?: AbortSignal): Promise<SeasonEpisodes> {
  const base = placeholderEpisodes(season, page);
  const a = season.anime;
  const byNumber = new Map<number, EpisodeInfo>();
  if (a.idMal) {
    try {
      (await fetchJikanEpisodes(a.idMal, page, signal)).episodes.forEach((e) => byNumber.set(e.number, e));
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  const episodes = base.episodes.map((e) => {
    const j = byNumber.get(e.number);
    return j ? { ...e, title: j.title ?? null, aired: j.aired ?? e.aired, filler: j.filler, recap: j.recap } : e;
  });
  return { ...base, episodes, degraded: byNumber.size === 0 };
}

/** Complète une liste avec les vraies images d'épisode (Kitsu), prioritaires, et les titres/dates manquants. */
export function mergeKitsu(list: SeasonEpisodes, kitsu: Record<number, KitsuEpisode> | undefined): SeasonEpisodes {
  if (!kitsu) return list;
  const episodes = list.episodes.map((e) => {
    const k = kitsu[e.number];
    return k ? { ...e, title: e.title ?? k.title, aired: e.aired ?? k.aired, thumbnail: k.thumb ?? e.thumbnail, thumbnailLarge: k.large ?? e.thumbnailLarge } : e;
  });
  return { ...list, episodes, degraded: list.degraded && !episodes.some((e) => e.title) };
}
