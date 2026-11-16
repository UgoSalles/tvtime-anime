import type { AiringEntry, Franchise, FranchiseSeason } from '../api/types';
import type { ShowState } from './library';

export type UpcomingKind = 'scheduled' | 'estimated' | 'announced';

export interface UpcomingItem {
  key: string;
  f: Franchise;
  season: FranchiseSeason;
  episode: number;
  /** Instant de diffusion (ms). */
  at: number;
  /** « scheduled » = planifié par AniList ; « estimated » = extrapolé à 7 jours d'écart ; « announced » = 1er épisode à la date annoncée. */
  kind: UpcomingKind;
}

export interface UndatedItem {
  key: string;
  f: Franchise;
  season: FranchiseSeason;
  /** Ce qu'on sait de la date : « Printemps 2027 », « Avril 2027 », « 2027 ». */
  label: string;
}

const WEEK = 7 * 86_400_000;
const SEASON_FR: Record<string, string> = { WINTER: 'Hiver', SPRING: 'Printemps', SUMMER: 'Été', FALL: 'Automne' };
const MONTH_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** Saisons suivies encore en diffusion ou annoncées, indexées par id AniList. */
export function upcomingSeasons(shows: ShowState[]): Map<number, { f: Franchise; season: FranchiseSeason }> {
  const m = new Map<number, { f: Franchise; season: FranchiseSeason }>();
  for (const s of shows) {
    if (s.follow.status !== 'active' || !s.franchise) continue;
    for (const season of s.franchise.seasons) {
      if (season.anime.status === 'RELEASING' || season.anime.status === 'NOT_YET_RELEASED') m.set(season.anime.id, { f: s.franchise, season });
    }
  }
  return m;
}

/**
 * Construit le calendrier complet des séries suivies :
 * 1. tous les épisodes planifiés par AniList ;
 * 2. les épisodes manquants jusqu'à la fin de la saison, extrapolés chaque semaine (si le total est connu) ;
 * 3. les suites annoncées avec une date complète (1er épisode à cette date) ;
 * 4. les suites annoncées avec une date partielle, listées à part, sans jour.
 */
export function buildUpcoming(lookup: Map<number, { f: Franchise; season: FranchiseSeason }>, airing: AiringEntry[]): { dated: UpcomingItem[]; undated: UndatedItem[] } {
  const dated: UpcomingItem[] = [];
  const undated: UndatedItem[] = [];
  const byMedia = new Map<number, AiringEntry[]>();
  for (const a of airing) (byMedia.get(a.mediaId) ?? byMedia.set(a.mediaId, []).get(a.mediaId)!).push(a);

  for (const [id, { f, season }] of lookup) {
    const a = season.anime;
    const sched = [...(byMedia.get(id) ?? [])].sort((x, y) => x.episode - y.episode);
    // AniList peut n'exposer que `nextAiringEpisode` : on l'utilise comme graine.
    if (!sched.length && a.nextAiring) sched.push({ mediaId: id, episode: a.nextAiring.episode, airingAt: a.nextAiring.airingAt });

    const push = (episode: number, at: number, kind: UpcomingKind) => dated.push({ key: `${id}-${episode}`, f, season, episode, at, kind });
    sched.forEach((e) => push(e.episode, e.airingAt * 1000, 'scheduled'));

    const total = a.episodes ?? null;
    if (sched.length) {
      const last = sched[sched.length - 1]!;
      if (total) for (let e = last.episode + 1; e <= total; e++) push(e, last.airingAt * 1000 + (e - last.episode) * WEEK, 'estimated');
      continue;
    }

    // Aucun épisode planifié : suite annoncée.
    const d = a.startDate;
    if (a.status === 'NOT_YET_RELEASED' && d?.year) {
      if (d.month && d.day) {
        const start = new Date(d.year, d.month - 1, d.day, 12).getTime();
        push(1, start, 'announced');
        if (total) for (let e = 2; e <= total; e++) push(e, start + (e - 1) * WEEK, 'estimated');
      } else {
        const label = d.month ? `${MONTH_FR[d.month - 1]} ${d.year}` : a.season ? `${SEASON_FR[a.season]} ${d.year}` : String(d.year);
        undated.push({ key: `${id}-undated`, f, season, label });
      }
    }
  }
  dated.sort((x, y) => x.at - y.at);
  return { dated, undated };
}
