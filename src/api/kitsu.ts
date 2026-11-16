import { cachedFetch, TTL } from './cache';
import { fetchJsonWithRetry, RateLimitedQueue } from './queue';

/**
 * Kitsu : vraies images d'épisodes (captures de l'épisode), titres et dates. Pas de clé, CORS ouvert.
 * On part de l'id MyAnimeList (déjà fourni par AniList) → id Kitsu → épisodes par pages de 20.
 */
const BASE = 'https://kitsu.io/api/edge';
const queue = new RateLimitedQueue(240, 6);
const PAGE = 20;
const MONTH = 30 * 24 * 3600_000;

export interface KitsuEpisode {
  number: number;
  title: string | null;
  aired: string | null;
  /** 320 × 180, pour les listes. */
  thumb: string | null;
  /** 640 × 360, pour les grands visuels. */
  large: string | null;
}

interface MappingResponse {
  included?: { id: string }[];
}
interface EpisodesResponse {
  data: {
    attributes: {
      number: number | null;
      canonicalTitle: string | null;
      titles?: Record<string, string> | null;
      airdate: string | null;
      thumbnail: { small?: string; medium?: string; large?: string; original?: string } | null;
    };
  }[];
}

const kitsuId = (malId: number, signal?: AbortSignal) =>
  cachedFetch<string | null>(`kitsu:id:${malId}`, MONTH, async () => {
    const r = await fetchJsonWithRetry<MappingResponse>(
      queue,
      `${BASE}/mappings?filter%5BexternalSite%5D=myanimelist/anime&filter%5BexternalId%5D=${malId}&include=item&fields%5Banime%5D=slug`,
      {},
      { signal, retries: 1 },
    );
    return r.included?.[0]?.id ?? null;
  });

const fetchPage = (kid: string, offset: number, signal?: AbortSignal) =>
  cachedFetch<KitsuEpisode[]>(`kitsu:eps:${kid}:${offset}`, TTL.episodes, async () => {
    const r = await fetchJsonWithRetry<EpisodesResponse>(
      queue,
      `${BASE}/anime/${kid}/episodes?page%5Blimit%5D=${PAGE}&page%5Boffset%5D=${offset}&sort=number&fields%5Bepisodes%5D=number,titles,canonicalTitle,thumbnail,airdate`,
      {},
      { signal, retries: 1 },
    );
    return r.data
      .filter((e) => e.attributes.number != null)
      .map((e) => {
        const a = e.attributes;
        return {
          number: a.number!,
          title: a.titles?.en ?? a.canonicalTitle ?? null,
          aired: a.airdate ?? null,
          thumb: a.thumbnail?.small ?? a.thumbnail?.medium ?? a.thumbnail?.original ?? null,
          large: a.thumbnail?.medium ?? a.thumbnail?.large ?? a.thumbnail?.original ?? null,
        };
      });
  });

/** Épisodes `from`..`to` (numéros dans la saison) d'une entrée MAL. Vide si Kitsu ne connaît pas l'anime. */
export async function fetchKitsuEpisodes(malId: number, from: number, to: number, signal?: AbortSignal): Promise<Record<number, KitsuEpisode>> {
  const out: Record<number, KitsuEpisode> = {};
  const kid = await kitsuId(malId, signal);
  if (!kid) return out;
  const offsets: number[] = [];
  for (let o = Math.floor((from - 1) / PAGE) * PAGE; o < to; o += PAGE) offsets.push(o);
  const pages = await Promise.allSettled(offsets.map((o) => fetchPage(kid, o, signal)));
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  for (const p of pages) if (p.status === 'fulfilled') for (const e of p.value) out[e.number] = e;
  return out;
}
