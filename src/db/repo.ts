import { db, type FollowRow, type ReactionRow } from '../lib/db';
import { resolveFranchise } from '../api/franchise';
import type { Franchise, FranchiseSeason } from '../api/types';

export const epKey = (seasonId: number, episode: number) => `${seasonId}-${episode}`;

// ── Suivis ─────────────────────────────────────────────────────────────────
/** Crée (ou renvoie) le suivi d'une franchise. */
export async function ensureFollow(f: Franchise): Promise<FollowRow> {
  const existing = await db.follows.get(f.rootId);
  if (existing) return existing;
  const root = f.seasons[0]?.anime;
  const row: FollowRow = {
    showId: f.rootId,
    ids: f.ids,
    title: root?.title ?? { romaji: null, english: null },
    cover: root?.coverLarge ?? null,
    color: root?.color ?? null,
    addedAt: Date.now(),
    status: 'active',
    favorite: false,
    lastWatchedAt: null,
  };
  await db.follows.put(row);
  return row;
}

/** Suit la franchise à laquelle appartient `animeId` (résout les relations au besoin). */
export async function followAnime(animeId: number): Promise<number> {
  const existing = await db.follows.where('ids').equals(animeId).first();
  if (existing) return existing.showId;
  return (await ensureFollow(await resolveFranchise(animeId))).showId;
}

/** Ne plus suivre : l'historique « vu » est conservé (re-suivre le restaure). */
export const unfollow = (showId: number) => db.follows.delete(showId);
export const setDropped = (showId: number, dropped: boolean) => db.follows.update(showId, { status: dropped ? 'dropped' : 'active' });
export async function toggleFavorite(showId: number) {
  const f = await db.follows.get(showId);
  if (f) await db.follows.update(showId, { favorite: !f.favorite });
}

// ── Progression ────────────────────────────────────────────────────────────
export interface EpRef {
  seasonId: number;
  episode: number;
}

/** Épisodes diffusés d'une saison. */
export function airedOf(s: FranchiseSeason): EpRef[] {
  const n = s.aired ?? 0;
  return Array.from({ length: n }, (_, i) => ({ seasonId: s.anime.id, episode: i + 1 }));
}
export const allAired = (f: Franchise): EpRef[] => f.seasons.flatMap(airedOf);

/** Tous les épisodes diffusés jusqu'à (et y compris) l'épisode donné, dans l'ordre de la franchise. */
export function upTo(f: Franchise, seasonId: number, episode: number): EpRef[] {
  const out: EpRef[] = [];
  for (const s of f.seasons) {
    for (const e of airedOf(s)) {
      out.push(e);
      if (s.anime.id === seasonId && e.episode === episode) return out;
    }
  }
  return out;
}

/** Coche / décoche des épisodes en lot (suit la série si besoin). */
export async function markEpisodes(f: Franchise, eps: EpRef[], watched: boolean) {
  if (!eps.length) return;
  const follow = await ensureFollow(f);
  const now = Date.now();
  await db.transaction('rw', db.watched, db.follows, async () => {
    if (watched) {
      await db.watched.bulkPut(eps.map((e) => ({ ...e, showId: f.rootId, watchedAt: now })));
      await db.follows.update(follow.showId, { lastWatchedAt: now });
    } else {
      await db.watched.bulkDelete(eps.map((e) => [e.seasonId, e.episode] as [number, number]));
    }
  });
}

// ── Réactions (note, émotion, personnage préféré) ──────────────────────────
export async function setReaction(f: Franchise, seasonId: number, episode: number, patch: Partial<Pick<ReactionRow, 'rating' | 'emotion' | 'characterId'>>) {
  const cur = await db.reactions.get([seasonId, episode]);
  await db.reactions.put({
    seasonId,
    episode,
    showId: f.rootId,
    rating: null,
    emotion: null,
    characterId: null,
    ...cur,
    ...patch,
    updatedAt: Date.now(),
  });
}

// ── Listes perso ───────────────────────────────────────────────────────────
export const createList = (name: string) => db.lists.add({ name: name.trim(), createdAt: Date.now() });
export const renameList = (id: number, name: string) => db.lists.update(id, { name: name.trim() });
export async function deleteList(id: number) {
  await db.transaction('rw', db.lists, db.listItems, async () => {
    await db.listItems.where('listId').equals(id).delete();
    await db.lists.delete(id);
  });
}
export const addToList = (listId: number, showId: number) => db.listItems.put({ listId, showId, addedAt: Date.now() });
export const removeFromList = (listId: number, showId: number) => db.listItems.delete([listId, showId]);
