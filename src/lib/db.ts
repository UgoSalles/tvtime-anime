import Dexie, { type EntityTable } from 'dexie';

export interface CacheRow {
  key: string;
  value: unknown;
  fetchedAt: number;
}

/** Base locale. Phase 3 : cache des réponses API. Phase 4 : suivis, épisodes vus, réactions, listes. */
export const db = new Dexie('tvtime') as Dexie & {
  apiCache: EntityTable<CacheRow, 'key'>;
};

db.version(1).stores({
  apiCache: 'key, fetchedAt',
});
