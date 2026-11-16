import { fetchStreamingEpisodes } from './anilist';
import { fetchJikanEpisodes } from './jikan';
import type { EpisodeInfo, FranchiseSeason } from './types';

const EP_RE = /^\s*(?:episode|épisode|ep\.?)\s*(\d+)\s*[-–:]\s*(.+)$/i;

/** Titres de secours : `streamingEpisodes` d'AniList (« Episode 5 - Titre »). */
function parseStreaming(list: { title: string; thumbnail: string | null }[]): Map<number, { title: string; thumbnail: string | null }> {
  const m = new Map<number, { title: string; thumbnail: string | null }>();
  list.forEach((e, i) => {
    const hit = EP_RE.exec(e.title);
    m.set(hit ? Number(hit[1]) : i + 1, { title: hit ? hit[2]!.trim() : e.title, thumbnail: e.thumbnail });
  });
  return m;
}

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
 * Une page (100 épisodes) d'une saison enrichie : titres + dates depuis Jikan (rapide, un seul appel) ;
 * seulement si Jikan échoue, titres + vignettes depuis AniList (une requête légère).
 */
export async function loadSeasonEpisodes(season: FranchiseSeason, page: number, signal?: AbortSignal): Promise<SeasonEpisodes> {
  const base = placeholderEpisodes(season, page);
  const a = season.anime;
  const byNumber = new Map<number, EpisodeInfo>();

  let jikanOk = false;
  if (a.idMal) {
    try {
      (await fetchJikanEpisodes(a.idMal, page, signal)).episodes.forEach((e) => byNumber.set(e.number, e));
      jikanOk = byNumber.size > 0;
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  let streaming = new Map<number, { title: string; thumbnail: string | null }>();
  if (!jikanOk) {
    try {
      streaming = parseStreaming(await fetchStreamingEpisodes(a.id, signal));
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  const episodes = base.episodes.map((e) => {
    const j = byNumber.get(e.number);
    const st = streaming.get(e.number);
    return { ...e, title: j?.title ?? st?.title ?? null, aired: j?.aired ?? e.aired, filler: j?.filler, recap: j?.recap, thumbnail: st?.thumbnail ?? null };
  });
  return { ...base, episodes, degraded: !jikanOk && streaming.size === 0 };
}
