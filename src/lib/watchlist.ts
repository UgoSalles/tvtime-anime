import { useQueries } from '@tanstack/react-query';
import { locateAbsolute, resolveFranchise, totalAired } from '../api/franchise';
import type { Franchise, FranchiseSeason } from '../api/types';
import type { Follow } from '../data/demoFollows';

export interface WatchEntry {
  follow: Follow;
  franchise: Franchise;
  next: { season: FranchiseSeason; episode: number; absolute: number };
  /** Épisodes diffusés restant après le prochain (« +177 »). */
  behind: number;
  started: boolean;
}

/** Calcule le prochain épisode à voir ; null si tout ce qui est diffusé est vu. */
export function computeEntry(follow: Follow, franchise: Franchise): WatchEntry | null {
  const aired = totalAired(franchise);
  if (follow.watched >= aired) return null;
  const absolute = follow.watched + 1;
  const loc = locateAbsolute(franchise, absolute);
  if (!loc) return null;
  return {
    follow,
    franchise,
    next: { season: loc.season, episode: loc.episode, absolute },
    behind: aired - absolute,
    started: follow.watched > 0,
  };
}

export function useFollowFranchises(follows: Follow[]) {
  return useQueries({
    queries: follows.map((f) => ({
      queryKey: ['franchise', f.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => resolveFranchise(f.id, signal),
      staleTime: 24 * 3_600_000,
      gcTime: 48 * 3_600_000,
    })),
  });
}
