import Dexie, { type EntityTable } from 'dexie';
import type { Titles } from '../api/types';

export interface CacheRow {
  key: string;
  value: unknown;
  fetchedAt: number;
}

/** Une série suivie. `showId` = id AniList de la saison 1 de la franchise. */
export interface FollowRow {
  showId: number;
  /** Tous les ids AniList de la franchise (permet de retrouver le suivi depuis n'importe quelle saison). */
  ids: number[];
  /** Instantané pour l'affichage hors-ligne du profil. */
  title: Titles;
  cover: string | null;
  color: string | null;
  addedAt: number;
  /** « dropped » = arrêtée / abandonnée (n'apparaît plus dans la watchlist). */
  status: 'active' | 'dropped';
  favorite: boolean;
  /** Dernier épisode coché (tri de la watchlist). */
  lastWatchedAt: number | null;
}

/** Un épisode vu (clé : saison AniList + numéro dans la saison). */
export interface WatchedRow {
  seasonId: number;
  episode: number;
  showId: number;
  /** Date du dernier visionnage. */
  watchedAt: number;
  /** Nombre de visionnages (absent = 1) : « revoir » l'incrémente. */
  count?: number;
}

export interface ReactionRow {
  seasonId: number;
  episode: number;
  showId: number;
  /** 1 à 5. */
  rating: number | null;
  /** Clé d'émotion (SPEC §4.6). */
  emotion: string | null;
  /** Id AniList du personnage préféré de l'épisode. */
  characterId: number | null;
  updatedAt: number;
}

export interface ListRow {
  id?: number;
  name: string;
  createdAt: number;
}

export interface ListItemRow {
  listId: number;
  showId: number;
  addedAt: number;
}

/** Base locale : cache des réponses API (phase 3) + données utilisateur (phase 4). */
export const db = new Dexie('tvtime') as Dexie & {
  apiCache: EntityTable<CacheRow, 'key'>;
  follows: EntityTable<FollowRow, 'showId'>;
  watched: Dexie.Table<WatchedRow, [number, number]>;
  reactions: Dexie.Table<ReactionRow, [number, number]>;
  lists: EntityTable<ListRow, 'id'>;
  listItems: Dexie.Table<ListItemRow, [number, number]>;
};

db.version(1).stores({
  apiCache: 'key, fetchedAt',
});
db.version(2).stores({
  apiCache: 'key, fetchedAt',
  follows: 'showId, *ids, addedAt, lastWatchedAt',
  watched: '[seasonId+episode], showId, watchedAt',
  reactions: '[seasonId+episode], showId',
  lists: '++id, name',
  listItems: '[listId+showId], listId, showId',
});
db.version(3).stores({
  lists: '++id, name, createdAt',
});
