import { locateInSeason } from '../lib/seasons';
import { fetchAnilistIdsByMal, searchAnime } from '../api/anilist';
import { locateAbsolute, resolveFranchise } from '../api/franchise';
import type { Anime, Franchise } from '../api/types';
import { ensureFollow, importWatched, setDropped } from '../db/repo';

/** Une série (ou une saison) à importer, quelle que soit la source. */
export interface ImportEntry {
  label: string;
  anilistId?: number;
  malId?: number;
  /** TV Time : le nom seul ; on cherche la série sur AniList. */
  name?: string;
  status?: 'current' | 'completed' | 'paused' | 'dropped' | 'planning';
  /** AniList / MAL : épisodes vus de CETTE entrée (= une saison). */
  progress?: number;
  /** TV Time : épisodes vus (saison / numéro TV Time) avec leur date. */
  pairs?: { season: number; episode: number; at?: number }[];
}

export interface ImportProgress {
  done: number;
  total: number;
  label: string;
  phase: 'matching' | 'applying';
}

export interface ImportReport {
  shows: number;
  episodes: number;
  /** Séries que l'on n'a pas su relier à AniList. */
  unmatched: string[];
  /** Entrées reconnues mais non suivables (films, OVA…). */
  skipped: string[];
  /** Séries dont la numérotation TV Time ne correspond pas aux saisons AniList (ordre séquentiel supposé). */
  approximate: string[];
}

// ── Correspondance de titres ───────────────────────────────────────────────
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(\d{4}\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokens = (s: string) => new Set(norm(s).split(' ').filter(Boolean));

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (norm(a) === norm(b)) return 1;
  const A = tokens(a);
  const B = tokens(b);
  const inter = [...A].filter((t) => B.has(t)).length;
  return inter / (A.size + B.size - inter);
}

const SERIES = new Set(['TV', 'TV_SHORT', 'ONA']);

export function bestMatch(name: string, candidates: Anime[]): Anime | null {
  const year = /\((\d{4})\)/.exec(name)?.[1];
  let best: { a: Anime; s: number } | null = null;
  for (const a of candidates) {
    const titles = [a.title.romaji, a.title.english, a.title.native].filter(Boolean) as string[];
    let s = Math.max(0, ...titles.map((t) => similarity(name, t)));
    if (a.format && SERIES.has(a.format)) s += 0.05;
    if (year && String(a.seasonYear ?? a.startDate?.year) === year) s += 0.15;
    if (!best || s > best.s) best = { a, s };
  }
  return best && best.s >= 0.6 ? best.a : null;
}

// ── TV Time : saison/épisode TV Time → saison/épisode AniList ──────────────
interface Pair {
  season: number;
  episode: number;
  at?: number;
}

/**
 * Si chaque (saison, épisode) TV Time tombe dans la saison de même rang de la franchise, on garde
 * la numérotation. Sinon (cas fréquent des animes : TV Time suit TVDB, AniList découpe par cour),
 * on suppose un visionnage dans l'ordre et on classe les épisodes par rang absolu.
 */
export function mapPairs(f: Franchise, pairs: Pair[]): { rows: { seasonId: number; episode: number; at: number }[]; approximate: boolean } {
  const real = pairs.filter((p) => p.season > 0);
  const located = real.map((p) => locateInSeason(f, p.season, p.episode));
  const fits = located.every((l) => !!l);
  const now = Date.now();
  if (fits) return { rows: real.map((p, i) => ({ seasonId: located[i]!.season.anime.id, episode: located[i]!.episode, at: p.at ?? now })), approximate: false };
  const sorted = [...real].sort((a, b) => a.season - b.season || a.episode - b.episode);
  const rows: { seasonId: number; episode: number; at: number }[] = [];
  sorted.forEach((p, i) => {
    const loc = locateAbsolute(f, i + 1);
    if (loc) rows.push({ seasonId: loc.season.anime.id, episode: loc.episode, at: p.at ?? now });
  });
  return { rows, approximate: true };
}

// ── Pipeline ───────────────────────────────────────────────────────────────
export async function runImport(entries: ImportEntry[], opts: { signal?: AbortSignal; onProgress?: (p: ImportProgress) => void } = {}): Promise<ImportReport> {
  const { signal, onProgress } = opts;
  const report: ImportReport = { shows: 0, episodes: 0, unmatched: [], skipped: [], approximate: [] };
  const total = entries.length;
  const check = () => {
    if (signal?.aborted) throw new DOMException('Import annulé', 'AbortError');
  };

  // 1. MAL → AniList en lot
  const malIds = entries.filter((e) => e.malId && !e.anilistId).map((e) => e.malId!);
  const malMap = malIds.length ? await fetchAnilistIdsByMal([...new Set(malIds)], signal) : new Map<number, number>();

  const known = new Map<number, Franchise>(); // id AniList (toute saison) → franchise déjà résolue
  const dropped = new Set<number>();
  const active = new Set<number>();
  const followed = new Set<number>();

  for (let i = 0; i < entries.length; i++) {
    check();
    const e = entries[i]!;
    onProgress?.({ done: i, total, label: e.label, phase: 'matching' });

    // 2. identifier la série AniList
    let id = e.anilistId ?? (e.malId ? malMap.get(e.malId) : undefined);
    if (!id && e.name) {
      const found = bestMatch(e.name, (await searchAnime(e.name.replace(/\(\d{4}\)/, '').trim(), 1, signal)).items);
      id = found?.id;
    }
    if (!id) {
      report.unmatched.push(e.label);
      continue;
    }

    // 3. franchise (mémoïsée par id)
    let f = known.get(id);
    if (!f) {
      try {
        f = await resolveFranchise(id, signal);
      } catch (err) {
        if (signal?.aborted) throw err;
        report.unmatched.push(`${e.label} (réseau)`);
        continue;
      }
      f.ids.forEach((x) => known.set(x, f!));
    }
    if (!f.seasons.length) {
      report.skipped.push(e.label);
      continue;
    }
    onProgress?.({ done: i, total, label: e.label, phase: 'applying' });

    // 4. appliquer
    await ensureFollow(f);
    followed.add(f.rootId);
    if (e.status === 'dropped') dropped.add(f.rootId);
    if (e.status === 'current' || e.status === 'completed' || e.status === 'planning' || e.status === 'paused') active.add(f.rootId);

    if (e.pairs) {
      const { rows, approximate } = mapPairs(f, e.pairs);
      report.episodes += await importWatched(f, rows);
      if (approximate && rows.length) report.approximate.push(e.label);
    } else {
      const season = f.seasons.find((s) => s.anime.id === id);
      if (!season) {
        if (e.status !== 'planning') report.skipped.push(e.label); // film / OVA / spécial lié à la série
        continue;
      }
      const aired = season.aired ?? 0;
      const n = Math.min(aired, e.status === 'completed' && !e.progress ? aired : (e.progress ?? 0));
      const rows = Array.from({ length: n }, (_, k) => ({ seasonId: season.anime.id, episode: k + 1, at: Date.now() }));
      report.episodes += await importWatched(f, rows);
    }
  }

  // Arrêtée = au moins une entrée abandonnée et aucune en cours / à voir.
  for (const root of dropped) if (!active.has(root)) await setDropped(root, true);
  report.shows = followed.size;
  onProgress?.({ done: total, total, label: '', phase: 'applying' });
  return report;
}
