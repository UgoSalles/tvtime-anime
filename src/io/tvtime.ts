import { parseCsv } from './csv';
import type { ImportEntry } from './importer';

/**
 * Export de données TV Time (CSV). Le format exact n'est pas documenté et n'a pas pu être vérifié
 * (aucun exemple fourni) : on détecte donc les colonnes par leur nom, sans tenir compte de la casse
 * ni des séparateurs (« tv_show_name », « TV Show Name »… sont équivalents).
 * Un fichier avec nom de série + saison + épisode = épisodes vus ; avec le seul nom = série suivie.
 */
const COLS = {
  name: ['tvshowname', 'showname', 'seriesname', 'tvshowtitle', 'showtitle', 'seriestitle', 'series', 'tvshow'],
  season: ['episodeseasonnumber', 'seasonnumber', 'seasonno', 'season'],
  episode: ['episodenumber', 'episodeno', 'epnumber', 'episode'],
  date: ['watchedat', 'seenat', 'createdat', 'updatedat', 'date', 'timestamp'],
};
const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

function pick(headers: string[], candidates: string[]): number {
  const keys = headers.map(key);
  for (const c of candidates) {
    const i = keys.indexOf(c);
    if (i >= 0) return i;
  }
  return -1;
}

export interface TvTimeParse {
  entries: ImportEntry[];
  ignoredFiles: string[];
}

function parseDate(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (Number.isFinite(n) && n > 1e9) return n < 1e12 ? n * 1000 : n;
  const t = Date.parse(v.replace(' ', 'T'));
  return Number.isNaN(t) ? undefined : t;
}

export function parseTvTime(files: { name: string; text: string }[]): TvTimeParse {
  const byShow = new Map<string, ImportEntry>();
  const ignoredFiles: string[] = [];
  for (const f of files) {
    const rows = parseCsv(f.text);
    const header = rows[0];
    if (!header) {
      ignoredFiles.push(f.name);
      continue;
    }
    const iName = pick(header, COLS.name);
    if (iName < 0) {
      ignoredFiles.push(f.name); // films, listes, profil… : pas de colonne « série »
      continue;
    }
    const iSeason = pick(header, COLS.season);
    const iEp = pick(header, COLS.episode);
    const iDate = pick(header, COLS.date);
    for (const r of rows.slice(1)) {
      const name = r[iName]?.trim();
      if (!name) continue;
      const e = byShow.get(name.toLowerCase()) ?? { label: name, name, status: 'current' as const, pairs: [] };
      const season = iSeason >= 0 ? Number(r[iSeason]) : NaN;
      const episode = iEp >= 0 ? Number(r[iEp]) : NaN;
      if (Number.isFinite(season) && Number.isFinite(episode) && season > 0 && episode > 0) e.pairs!.push({ season, episode, at: parseDate(r[iDate]) });
      byShow.set(name.toLowerCase(), e);
    }
  }
  return { entries: [...byShow.values()], ignoredFiles };
}
