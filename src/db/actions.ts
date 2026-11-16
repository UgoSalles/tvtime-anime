import type { Franchise } from '../api/types';
import { epKey, markEpisodes, upTo, type EpRef } from './repo';
import { openActions } from '../store/sheet';

/**
 * Coche / décoche un épisode. Si des épisodes diffusés précédents ne sont pas vus, propose de
 * tout marquer jusqu'ici (SPEC §4.5 « tout marquer jusqu'ici »).
 */
export async function toggleEpisode(f: Franchise, seasonId: number, episode: number, watchedKeys: { has(k: string): boolean }) {
  const key = epKey(seasonId, episode);
  if (watchedKeys.has(key)) return markEpisodes(f, [{ seasonId, episode }], false);
  const prior = upTo(f, seasonId, episode).filter((e) => !(e.seasonId === seasonId && e.episode === episode) && !watchedKeys.has(epKey(e.seasonId, e.episode)));
  const only: EpRef[] = [{ seasonId, episode }];
  if (!prior.length) return markEpisodes(f, only, true);
  openActions(
    'Marquer les épisodes précédents ?',
    [
      { label: `Tout marquer jusqu'ici (${prior.length + 1})`, onClick: () => markEpisodes(f, [...prior, ...only], true) },
      { label: 'Seulement cet épisode', onClick: () => markEpisodes(f, only, true) },
    ],
    `${prior.length} épisode${prior.length > 1 ? 's' : ''} diffusé${prior.length > 1 ? 's' : ''} avant celui-ci ne ${prior.length > 1 ? 'sont' : 'est'} pas marqué${prior.length > 1 ? 's' : ''} comme vu${prior.length > 1 ? 's' : ''}.`,
  );
}
