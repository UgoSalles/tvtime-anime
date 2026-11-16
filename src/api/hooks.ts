import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { browseByGenre, fetchAiredRecent, fetchAiringSchedule, fetchAnimeDetail, fetchDiscover, searchAnime } from './anilist';
import { EPISODES_PER_PAGE, loadSeasonEpisodes, mergeAired, mergeKitsu, placeholderEpisodes, type SeasonEpisodes } from './episodes';
import { fetchTvmazeEpisodes, mergeTvmaze } from './tvmaze';
import { fetchKitsuEpisodes } from './kitsu';
import { resolveFranchise } from './franchise';
import type { FranchiseSeason } from './types';

const HOUR = 3_600_000;

export const useDiscover = () =>
  useQuery({ queryKey: ['discover'], queryFn: ({ signal }) => fetchDiscover(signal), staleTime: 30 * 60_000, gcTime: 24 * HOUR });

export const useSearch = (term: string) =>
  useQuery({
    queryKey: ['search', term],
    queryFn: ({ signal }) => searchAnime(term, 1, signal),
    enabled: term.trim().length >= 2,
    staleTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });

export const useBrowse = (genre: string | null) =>
  useInfiniteQuery({
    queryKey: ['browse', genre],
    queryFn: ({ pageParam, signal }) => browseByGenre(genre, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasNext ? all.length + 1 : undefined),
    staleTime: 30 * 60_000,
  });

export const useAnimeDetail = (id: number | undefined) =>
  useQuery({
    queryKey: ['detail', id],
    queryFn: ({ signal }) => fetchAnimeDetail(id!, signal),
    enabled: id !== undefined,
    staleTime: 6 * HOUR,
    gcTime: 24 * HOUR,
  });

export const useFranchise = (id: number | undefined) =>
  useQuery({
    queryKey: ['franchise', id],
    queryFn: ({ signal }) => resolveFranchise(id!, signal),
    enabled: id !== undefined,
    staleTime: 6 * HOUR,
    gcTime: 48 * HOUR,
  });

/** Une page de 100 épisodes d'une saison. */
export const useSeasonEpisodes = (season: FranchiseSeason | undefined, page: number, enabled = true) =>
  useQuery({
    queryKey: ['episodes', season?.anime.id, page],
    queryFn: ({ signal }) => loadSeasonEpisodes(season!, page, signal),
    enabled: enabled && !!season,
    staleTime: 12 * HOUR,
    // Numéros d'épisodes affichés instantanément ; titres et dates s'ajoutent à l'arrivée des données.
    placeholderData: () => (season ? placeholderEpisodes(season, page) : undefined),
  });

const kitsuQuery = (season: FranchiseSeason | undefined, page: number, enabled: boolean) => {
  const malId = season?.anime.idMal ?? null;
  return {
    queryKey: ['kitsu', malId, page],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchKitsuEpisodes(malId!, (page - 1) * EPISODES_PER_PAGE + 1, page * EPISODES_PER_PAGE, signal),
    enabled: enabled && !!malId,
    staleTime: 12 * HOUR,
    retry: 0,
  };
};
const episodesQuery = (season: FranchiseSeason | undefined, page: number, enabled: boolean) => ({
  queryKey: ['episodes', season?.anime.id, page],
  queryFn: ({ signal }: { signal: AbortSignal }) => loadSeasonEpisodes(season!, page, signal),
  enabled: enabled && !!season,
  staleTime: 12 * HOUR,
  placeholderData: () => (season ? placeholderEpisodes(season, page) : undefined),
});

/** Dates des sorties récentes (AniList) : seulement pour une saison en cours ou de moins de ~15 mois. */
const isRecent = (s: FranchiseSeason | undefined) => {
  const y = s?.anime.startDate?.year;
  if (!s || !y) return false;
  return s.anime.status === 'RELEASING' || Date.now() - Date.UTC(y, (s.anime.startDate?.month ?? 1) - 1, s.anime.startDate?.day ?? 1) < 450 * 86_400_000;
};
const useAiredRecent = (season: FranchiseSeason | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['aired', season?.anime.id],
    queryFn: ({ signal }) => fetchAiredRecent(season!.anime.id, signal),
    enabled: enabled && isRecent(season),
    staleTime: HOUR,
    retry: 0,
  });

/** Images TVmaze (sorties récentes, que Kitsu n'a pas encore), rapprochées par date de diffusion. */
const useTvmaze = (season: FranchiseSeason | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['tvmaze', season?.anime.id],
    queryFn: ({ signal }) => fetchTvmazeEpisodes(season!.anime, signal),
    enabled: enabled && !!season,
    staleTime: 12 * HOUR,
    retry: 0,
  });

/**
 * Une page d'épisodes (pour un épisode précis : fiche épisode, « À voir ensuite ») : numéros instantanés →
 * titres/dates (Jikan) → titres de secours et images (Kitsu, puis TVmaze pour les sorties récentes).
 */
export function useEpisodeList(season: FranchiseSeason | undefined, page: number, enabled = true) {
  const eps = useQuery(episodesQuery(season, page, enabled));
  const kitsu = useQuery(kitsuQuery(season, page, enabled));
  // TVmaze seulement si Kitsu n'a pas toutes les images des épisodes diffusés de cette page.
  const airedHere = Math.max(0, Math.min(season?.aired ?? 0, page * EPISODES_PER_PAGE) - (page - 1) * EPISODES_PER_PAGE);
  const covered = Object.values(kitsu.data ?? {}).filter((e) => e.thumb).length;
  const tv = useTvmaze(season, enabled && !kitsu.isLoading && covered < airedHere);
  const aired = useAiredRecent(season, enabled);
  const data = eps.data ? { ...eps.data, episodes: mergeTvmaze(mergeAired(mergeKitsu(eps.data, kitsu.data).episodes, aired.data), tv.data) } : undefined;
  return { data, isPlaceholder: eps.isPlaceholderData, thumbsLoading: kitsu.isLoading || tv.isLoading };
}

/**
 * TOUS les épisodes d'une saison (plus de limite à 100) : la liste des numéros s'affiche aussitôt, puis chaque
 * page de 100 se complète au fil des réponses (Jikan, Kitsu), et TVmaze ajoute les images récentes.
 */
export function useAllEpisodes(season: FranchiseSeason | undefined, enabled = true) {
  const total = season ? (season.anime.episodes ?? season.aired ?? 0) : 0;
  const pages = Array.from({ length: Math.max(1, Math.ceil(total / EPISODES_PER_PAGE)) }, (_, i) => i + 1);
  const eps = useQueries({ queries: pages.map((p) => episodesQuery(season, p, enabled)) });
  const kitsu = useQueries({ queries: pages.map((p) => kitsuQuery(season, p, enabled)) });
  // TVmaze seulement si Kitsu n'a pas toutes les images des épisodes diffusés.
  const covered = kitsu.reduce((n, q) => n + Object.values(q.data ?? {}).filter((e) => e.thumb).length, 0);
  const tv = useTvmaze(season, enabled && kitsu.every((q) => !q.isLoading) && covered < (season?.aired ?? total));
  const aired = useAiredRecent(season, enabled);
  if (eps.some((q) => !q.data)) return { data: undefined, isPlaceholder: false, thumbsLoading: false };
  const lists = eps.map((q, i) => mergeKitsu(q.data!, kitsu[i]!.data));
  const data: SeasonEpisodes = {
    episodes: mergeTvmaze(mergeAired(lists.flatMap((l) => l.episodes), aired.data), tv.data),
    degraded: lists.every((l) => l.degraded),
    total,
    page: 1,
    pageCount: 1,
  };
  return { data, isPlaceholder: eps.some((q) => q.isPlaceholderData), thumbsLoading: kitsu.some((q) => q.isLoading) || tv.isLoading };
}

export const useAiring = (ids: number[]) =>
  useQuery({
    queryKey: ['airing', [...ids].sort((a, b) => a - b)],
    queryFn: ({ signal }) => fetchAiringSchedule(ids, signal),
    enabled: ids.length > 0,
    staleTime: HOUR,
  });
