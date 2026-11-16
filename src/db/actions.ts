import type { Franchise, FranchiseSeason } from '../api/types';
import type { WatchMap } from './hooks';
import { airedOf, allAired, epKey, markEpisodes, rewatchEpisodes, upTo, type EpRef } from './repo';
import { openActions, type SheetAction } from '../store/sheet';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
const isWatched = (w: WatchMap, e: EpRef) => w.has(epKey(e.seasonId, e.episode));

/**
 * Tap sur la coche d'un épisode.
 * - pas vu, avec des épisodes diffusés précédents non vus → « Tout marquer jusqu'ici ? » ;
 * - déjà vu → « Décocher » ou « Revu » (en incluant, au choix, les épisodes précédents).
 */
export async function toggleEpisode(f: Franchise, seasonId: number, episode: number, watched: WatchMap) {
  const me: EpRef = { seasonId, episode };
  const before = upTo(f, seasonId, episode).filter((e) => !(e.seasonId === seasonId && e.episode === episode));

  if (isWatched(watched, me)) {
    const actions: SheetAction[] = [{ label: 'Marquer comme revu', onClick: () => rewatchEpisodes(f, [me]) }];
    if (before.length)
      actions.push({ label: `Revu, avec les ${plural(before.length, 'épisode précédent', 'épisodes précédents')}`, onClick: () => rewatchEpisodes(f, [...before, me]) });
    actions.push({ label: 'Décocher cet épisode', onClick: () => markEpisodes(f, [me], false), destructive: true });
    return openActions(`Épisode ${episode} déjà vu`, actions, `Vu ${plural(watched.get(epKey(seasonId, episode))?.count ?? 1, 'fois', 'fois')}.`);
  }

  const missing = before.filter((e) => !isWatched(watched, e));
  if (!missing.length) return markEpisodes(f, [me], true);
  openActions(
    'Marquer les épisodes précédents ?',
    [
      { label: `Tout marquer jusqu'ici (${missing.length + 1})`, onClick: () => markEpisodes(f, [...missing, me], true) },
      { label: 'Seulement cet épisode', onClick: () => markEpisodes(f, [me], true) },
    ],
    `${plural(missing.length, 'épisode diffusé avant celui-ci n’est', 'épisodes diffusés avant celui-ci ne sont')} pas marqué${missing.length > 1 ? 's' : ''} comme vu${missing.length > 1 ? 's' : ''}.`,
  );
}

/** Tap sur la coche d'une saison : tout marquer (avec les saisons précédentes si besoin) / revoir / tout décocher. */
export async function toggleSeason(f: Franchise, season: FranchiseSeason, watched: WatchMap) {
  const mine = airedOf(season);
  if (!mine.length) return;
  const complete = mine.every((e) => isWatched(watched, e));

  if (complete) {
    const prev = f.seasons.filter((s) => s.number < season.number).flatMap(airedOf);
    const actions: SheetAction[] = [{ label: 'Revoir la saison', onClick: () => rewatchEpisodes(f, mine) }];
    if (prev.length) actions.push({ label: `Revoir, avec les saisons précédentes (${prev.length + mine.length} épisodes)`, onClick: () => rewatchEpisodes(f, [...prev, ...mine]) });
    actions.push({ label: 'Tout décocher', onClick: () => markEpisodes(f, mine, false), destructive: true });
    return openActions(`Saison ${season.number} terminée`, actions);
  }

  const prevMissing = f.seasons.filter((s) => s.number < season.number).flatMap(airedOf).filter((e) => !isWatched(watched, e));
  const mineMissing = mine.filter((e) => !isWatched(watched, e));
  if (!prevMissing.length) return markEpisodes(f, mineMissing, true);
  openActions(
    'Marquer les saisons précédentes ?',
    [
      { label: `Saisons précédentes incluses (${prevMissing.length + mineMissing.length})`, onClick: () => markEpisodes(f, [...prevMissing, ...mineMissing], true) },
      { label: 'Seulement cette saison', onClick: () => markEpisodes(f, mineMissing, true) },
    ],
    `${plural(prevMissing.length, 'épisode des saisons précédentes n’est', 'épisodes des saisons précédentes ne sont')} pas marqué${prevMissing.length > 1 ? 's' : ''} comme vu${prevMissing.length > 1 ? 's' : ''}.`,
  );
}

/** Coche « Tous les épisodes » : tout marquer / revoir toute la série / tout décocher. */
export async function toggleAll(f: Franchise, watched: WatchMap) {
  const all = allAired(f);
  if (!all.length) return;
  if (all.every((e) => isWatched(watched, e)))
    return openActions('Série terminée', [
      { label: 'Revoir toute la série', onClick: () => rewatchEpisodes(f, all) },
      { label: 'Tout décocher', onClick: () => markEpisodes(f, all, false), destructive: true },
    ]);
  return markEpisodes(f, all.filter((e) => !isWatched(watched, e)), true);
}
