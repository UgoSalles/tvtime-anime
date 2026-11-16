import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { epKey } from './repo';

/** Visionnage d'un épisode : date du dernier et nombre de fois vu. */
export interface WatchInfo {
  at: number;
  count: number;
}
export type WatchMap = Map<string, WatchInfo>;

/** Suivi de la franchise contenant `animeId` (n'importe quelle saison). undefined = chargement, null = pas suivi. */
export const useFollowOf = (animeId: number | undefined) =>
  useLiveQuery(async () => (animeId === undefined ? null : ((await db.follows.where('ids').equals(animeId).first()) ?? null)), [animeId]);

export const useFollows = () => useLiveQuery(() => db.follows.toArray(), []);

/** Épisodes vus d'une série : clé « saison-épisode » → date. */
export const useWatchedMap = (showId: number | undefined) =>
  useLiveQuery(async () => {
    const rows = showId === undefined ? [] : await db.watched.where('showId').equals(showId).toArray();
    return new Map<string, WatchInfo>(rows.map((r) => [epKey(r.seasonId, r.episode), { at: r.watchedAt, count: r.count ?? 1 }]));
  }, [showId]);

export const useAllWatched = () => useLiveQuery(() => db.watched.toArray(), []);

export const useReaction = (seasonId: number, episode: number) =>
  useLiveQuery(async () => (await db.reactions.get([seasonId, episode])) ?? null, [seasonId, episode]);

export const useLists = () => useLiveQuery(() => db.lists.orderBy('createdAt').toArray(), []);
export const useListItems = (listId: number | undefined) =>
  useLiveQuery(async () => (listId === undefined ? [] : await db.listItems.where('listId').equals(listId).toArray()), [listId]);
export const useListsOfShow = (showId: number | undefined) =>
  useLiveQuery(async () => (showId === undefined ? [] : await db.listItems.where('showId').equals(showId).toArray()), [showId]);
