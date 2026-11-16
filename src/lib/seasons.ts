import type { Franchise, FranchiseSeason } from '../api/types';

/** Numéro d'épisode affiché : à la suite des parties précédentes de la même saison (Part 2 : E13, E14…). */
export const shownEpisode = (s: FranchiseSeason, episode: number) => (s.partOffset ?? 0) + episode;

/** Saisons regroupées par numéro : une saison scindée en « Part 1 / Part 2 » donne UN groupe de 2 entrées. */
export function seasonGroups(f: Franchise): { number: number; parts: FranchiseSeason[] }[] {
  const out: { number: number; parts: FranchiseSeason[] }[] = [];
  for (const s of f.seasons) {
    const last = out.at(-1);
    if (last && last.number === s.number) last.parts.push(s);
    else out.push({ number: s.number, parts: [s] });
  }
  return out;
}

/** Nombre de saisons au sens de l'utilisateur (parties fusionnées). */
export const seasonCount = (f: Franchise) => seasonGroups(f).length;

/**
 * Retrouve l'entrée AniList et le numéro local d'un épisode d'après (numéro de saison, numéro affiché dans la saison),
 * ex. TV Time « S3 E15 » = 3e partie de la saison 3 → Part 2, épisode 3. Null si l'épisode n'existe pas.
 */
export function locateInSeason(f: Franchise, seasonNumber: number, shown: number): { season: FranchiseSeason; episode: number } | null {
  const parts = f.seasons.filter((s) => s.number === seasonNumber);
  for (const s of parts) {
    const total = s.aired ?? s.anime.episodes ?? Infinity;
    const local = shown - (s.partOffset ?? 0);
    if (local >= 1 && local <= total) return { season: s, episode: local };
  }
  return null;
}
