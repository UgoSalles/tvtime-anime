import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { resolveFranchise } from '../api/franchise';
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

/** Toute la bibliothèque : suivis (Dexie, live) + franchises (cache AniList) + progression. */
export function useLibrary() {
  const follows = useFollows();
  const watched = useAllWatched();
  const results = useQueries({
    queries: (follows ?? []).map((f) => ({
      queryKey: ['franchise', f.showId],
      queryFn: ({ signal }: { signal: AbortSignal }) => resolveFranchise(f.showId, signal),
      staleTime: 24 * 3_600_000,
      gcTime: 48 * 3_600_000,
    })),
  });
  const stamp = results.map((r) => r.dataUpdatedAt).join();

  return useMemo(() => {
    const bySeason = new Map<number, Set<number>>();
    for (const w of watched ?? []) {
      const s = bySeason.get(w.seasonId) ?? new Set<number>();
      s.add(w.episode);
      bySeason.set(w.seasonId, s);
    }
    const shows = (follows ?? []).map((f, i) => computeShowState(f, results[i]?.data, bySeason));
    const franchises = new Map<number, Franchise>();
    results.forEach((r, i) => r.data && franchises.set(follows![i]!.showId, r.data));
    return {
      shows,
      franchises,
      watched: watched ?? [],
      ready: follows !== undefined && watched !== undefined,
      pending: results.filter((r) => r.isLoading).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follows, watched, stamp]);
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
