import { fetchAnimeDetail } from './anilist';
import { fetchJikanEpisodes } from './jikan';
import type { AnimeDetail, EpisodeInfo, FranchiseSeason } from './types';

const EP_RE = /^\s*(?:episode|épisode|ep\.?)\s*(\d+)\s*[-–:]\s*(.+)$/i;

/** Titres de secours : `streamingEpisodes` d'AniList (« Episode 5 - Titre »). */
function fromStreaming(detail: AnimeDetail | undefined): Map<number, { title: string; thumbnail: string | null }> {
  const m = new Map<number, { title: string; thumbnail: string | null }>();
  detail?.streamingEpisodes.forEach((e, i) => {
    const hit = EP_RE.exec(e.title);
    m.set(hit ? Number(hit[1]) : i + 1, { title: hit ? hit[2]!.trim() : e.title, thumbnail: e.thumbnail });
  });
  return m;
}

export const EPISODES_PER_PAGE = 100;

export interface SeasonEpisodes {
  episodes: EpisodeInfo[];
  /** Vrai si Jikan est injoignable : titres/dates alors issus d'AniList ou générés. */
  degraded: boolean;
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Une page (100 épisodes, comme Jikan) d'une saison. Fusionne : numérotation (AniList : total ou
 * épisodes diffusés), titres + dates (Jikan), à défaut titres/vignettes AniList (`streamingEpisodes`),
 * puis la date du prochain épisode (AniList `nextAiringEpisode`).
 */
export async function loadSeasonEpisodes(season: FranchiseSeason, page: number, signal?: AbortSignal): Promise<SeasonEpisodes> {
  const a = season.anime;
  const total = a.episodes ?? season.aired ?? 0;
  const from = (page - 1) * EPISODES_PER_PAGE + 1;
  const to = Math.min(total, page * EPISODES_PER_PAGE);
  const byNumber = new Map<number, EpisodeInfo>();
  let degraded = false;

  // Jikan (titres, dates) et AniList (titres/vignettes de secours) en parallèle.
  const [jikan, detail] = await Promise.allSettled([
    a.idMal ? fetchJikanEpisodes(a.idMal, page, signal) : Promise.reject(new Error('pas d\'id MAL')),
    fetchAnimeDetail(a.id, signal),
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (jikan.status === 'fulfilled') jikan.value.episodes.forEach((e) => byNumber.set(e.number, e));
  else degraded = true;
  const streaming = fromStreaming(detail.status === 'fulfilled' ? detail.value : undefined);

  const episodes: EpisodeInfo[] = [];
  for (let n = from; n <= to; n++) {
    const j = byNumber.get(n);
    const st = streaming.get(n);
    episodes.push({
      number: n,
      title: j?.title ?? st?.title ?? null,
      aired: j?.aired ?? (a.nextAiring?.episode === n ? new Date(a.nextAiring.airingAt * 1000).toISOString() : null),
      filler: j?.filler,
      recap: j?.recap,
      thumbnail: st?.thumbnail ?? null,
    });
  }
  return { episodes, degraded: degraded && byNumber.size === 0, total, page, pageCount: Math.max(1, Math.ceil(total / EPISODES_PER_PAGE)) };
}
