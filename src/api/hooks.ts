import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { browseByGenre, fetchAiringSchedule, fetchAnimeDetail, fetchDiscover, searchAnime } from './anilist';
import { loadSeasonEpisodes, placeholderEpisodes } from './episodes';
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
    staleTime: 24 * HOUR,
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

export const useAiring = (ids: number[], days = 30) =>
  useQuery({
    queryKey: ['airing', [...ids].sort((a, b) => a - b), days],
    queryFn: ({ signal }) => fetchAiringSchedule(ids, days, signal),
    enabled: ids.length > 0,
    staleTime: HOUR,
  });
