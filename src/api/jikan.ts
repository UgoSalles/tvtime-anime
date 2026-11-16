import { cachedFetch, TTL } from './cache';
import { fetchJsonWithRetry, HttpError, RateLimitedQueue } from './queue';
import type { EpisodeInfo } from './types';

// Jikan : 3 req/s, 60 req/min.
export const jikanQueue = new RateLimitedQueue(60, 3);

// Disjoncteur : si Jikan est injoignable (réseau, blocage), on n'insiste pas pendant 5 min
// et l'app retombe aussitôt sur les titres AniList.
let downUntil = 0;

interface JikanEpisode {
  mal_id: number;
  title: string | null;
  title_romanji?: string | null;
  aired: string | null;
  filler?: boolean;
  recap?: boolean;
}
interface JikanEpisodesResponse {
  pagination: { last_visible_page: number; has_next_page: boolean };
  data: JikanEpisode[];
}

export interface EpisodePage {
  episodes: EpisodeInfo[];
  hasNext: boolean;
}

/** Titres et dates des épisodes d'une entrée MAL (100 par page). */
export function fetchJikanEpisodes(malId: number, page = 1, signal?: AbortSignal): Promise<EpisodePage> {
  return cachedFetch(`jikan:eps:${malId}:${page}`, TTL.episodes, async () => {
    if (Date.now() < downUntil) throw new Error('Jikan indisponible (disjoncteur)');
    let res: JikanEpisodesResponse;
    try {
      res = await fetchJsonWithRetry<JikanEpisodesResponse>(jikanQueue, `https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`, {}, { signal, retries: 1 });
    } catch (e) {
      if (!signal?.aborted && !(e instanceof HttpError)) downUntil = Date.now() + 5 * 60_000;
      throw e;
    }
    return {
      episodes: res.data.map((e) => ({
        number: e.mal_id,
        title: e.title ?? e.title_romanji ?? null,
        aired: e.aired ?? null,
        filler: e.filler,
        recap: e.recap,
      })),
      hasNext: res.pagination.has_next_page,
    };
  });
}
