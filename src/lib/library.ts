import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadLibraryFranchises } from '../api/library';
import type { Franchise, FranchiseSeason } from '../api/types';
import { useAllWatched, useFollows } from '../db/hooks';
import type { FollowRow } from './db';

export interface NextEpisode {
  season: FranchiseSeason;
  episode: number;
  /** Numéro absolu dans la franchise (« E151 »). */
  absolute: number;
}

/** État dérivé d'une série suivie. */
export interface ShowState {
  follow: FollowRow;
  franchise?: Franchise;
  /** Premier épisode diffusé et non vu. */
  next?: NextEpisode;
  /** Épisodes diffusés non vus APRÈS le prochain (« +177 »). */
  behind: number;
  started: boolean;
  /** Tout ce qui est diffusé est vu ET la série n'a plus rien à diffuser. */
  completed: boolean;
  watchedCount: number;
  airedCount: number;
}

const DONE = new Set(['FINISHED', 'CANCELLED']);

export function computeShowState(follow: FollowRow, franchise: Franchise | undefined, watchedBySeason: Map<number, Set<number>>): ShowState {
  const base: ShowState = { follow, franchise, behind: 0, started: false, completed: false, watchedCount: 0, airedCount: 0 };
  if (!franchise) return base;
  let next: NextEpisode | undefined;
  let unwatched = 0;
  for (const s of franchise.seasons) {
    const aired = s.aired ?? 0;
    const seen = watchedBySeason.get(s.anime.id);
    const seenCount = seen ? [...seen].filter((e) => e <= aired).length : 0;
    base.airedCount += aired;
    base.watchedCount += seenCount;
    if (seenCount >= aired) continue;
    unwatched += aired - seenCount;
    if (!next) {
      for (let e = 1; e <= aired; e++) {
        if (!seen?.has(e)) {
          next = { season: s, episode: e, absolute: s.offset + e };
          break;
        }
      }
    }
  }
  return {
    ...base,
    next,
    behind: Math.max(0, unwatched - 1),
    started: base.watchedCount > 0,
    completed: !next && base.airedCount > 0 && franchise.seasons.every((s) => !s.anime.status || DONE.has(s.anime.status)),
  };
}

/** Calcul de la bibliothèque : suivis (Dexie, live) + franchises (cache AniList) + progression. */
function useLibraryCompute() {
  const follows = useFollows();
  const watched = useAllWatched();
  const qc = useQueryClient();
  // Une seule requête pour toutes les franchises (cache d'abord, lot AniList ensuite).
  const followKey = (follows ?? []).map((f) => `${f.showId}:${f.ids.length}`).join(',');
  const franchisesQ = useQuery({
    queryKey: ['library-franchises', followKey],
    queryFn: ({ signal }) => loadLibraryFranchises(follows!, () => void qc.invalidateQueries({ queryKey: ['library-franchises'] }), signal),
    enabled: follows !== undefined,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
  const franchiseMap = franchisesQ.data;
  const stamp = String(franchisesQ.dataUpdatedAt);

  return useMemo(() => {
    const bySeason = new Map<number, Set<number>>();
    for (const w of watched ?? []) {
      const s = bySeason.get(w.seasonId) ?? new Set<number>();
      s.add(w.episode);
      bySeason.set(w.seasonId, s);
    }
    const shows = (follows ?? []).map((f) => computeShowState(f, franchiseMap?.get(f.showId), bySeason));
    const franchises = new Map<number, Franchise>(franchiseMap ?? []);
    // Tout id AniList (n'importe quelle saison) → suivi : recherche O(1) pour les boutons « + » des listes.
    const followByAnimeId = new Map<number, FollowRow>();
    follows?.forEach((f) => f.ids.forEach((id) => followByAnimeId.set(id, f)));
    return {
      shows,
      franchises,
      followByAnimeId: follows ? followByAnimeId : undefined,
      watched: watched ?? [],
      ready: follows !== undefined && watched !== undefined,
      pending: franchisesQ.isLoading ? (follows?.length ?? 0) : 0,
      error: franchisesQ.isError && !franchisesQ.data,
      retry: () => void franchisesQ.refetch(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follows, watched, stamp, franchisesQ.isLoading, franchisesQ.isError]);
}

export type Library = ReturnType<typeof useLibraryCompute>;
const LibraryContext = createContext<Library | null>(null);

/**
 * UNE seule instance du calcul pour toute l'app (avant : une par écran, soit autant de requêtes Dexie,
 * de recalculs et de rendus à chaque coche).
 */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const lib = useLibraryCompute();
  return createElement(LibraryContext.Provider, { value: lib }, children);
}

export function useLibrary(): Library {
  const lib = useContext(LibraryContext);
  if (!lib) throw new Error('useLibrary hors de <LibraryProvider>');
  return lib;
}

// ── Statistiques ───────────────────────────────────────────────────────────
export interface Stats {
  minutes: number;
  months: number;
  days: number;
  hours: number;
  episodes: number;
  last30Days: number;
  shows: number;
}

const DEFAULT_MINUTES = 24;

/** Temps passé façon TV Time : mois de 30 jours, puis jours, puis heures. */
export function computeStats(lib: ReturnType<typeof useLibrary>): Stats {
  const duration = new Map<number, number>();
  lib.franchises.forEach((f) => f.seasons.forEach((s) => duration.set(s.anime.id, s.anime.duration ?? DEFAULT_MINUTES)));
  const cutoff = Date.now() - 30 * 86_400_000;
  let minutes = 0;
  let recent = 0;
  for (const w of lib.watched) {
    minutes += (duration.get(w.seasonId) ?? DEFAULT_MINUTES) * (w.count ?? 1);
    if (w.watchedAt >= cutoff) recent++;
  }
  const totalHours = Math.floor(minutes / 60);
  return {
    minutes,
    months: Math.floor(totalHours / 720),
    days: Math.floor((totalHours % 720) / 24),
    hours: totalHours % 24,
    episodes: lib.watched.length,
    last30Days: recent,
    shows: lib.shows.length,
  };
}
