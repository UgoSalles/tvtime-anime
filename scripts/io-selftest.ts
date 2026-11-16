// Auto-test des fonctions pures d'import. Exécuté dans le navigateur (dev server) :
//   const t = await import('/scripts/io-selftest.ts')  → t.results, t.failures
import { parseCsv } from '../src/io/csv';
import { parseTvTime } from '../src/io/tvtime';
import { bestMatch, mapPairs } from '../src/io/importer';
import type { Anime, Franchise, FranchiseSeason } from '../src/api/types';

let fail = 0;
export const results: string[] = [];
const eq = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fail++;
  results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` got ${JSON.stringify(a)} exp ${JSON.stringify(b)}`}`);
};

eq('csv quotes', parseCsv('a,b\n"x, y","he said ""hi"""\n'), [['a', 'b'], ['x, y', 'he said "hi"']]);
eq('csv semicolon', parseCsv('a;b\n1;2'), [['a', 'b'], ['1', '2']]);

const tv = parseTvTime([
  { name: 'seen_episode.csv', text: 'created_at,tv_show_name,episode_season_number,episode_number\n2023-01-02 10:00:00,Fairy Tail,1,1\n2023-01-03 10:00:00,Fairy Tail,1,2\n2023-01-03 10:00:00,"Shaman King (2021)",1,1\n' },
  { name: 'movies.csv', text: 'movie_name,created_at\nAkira,2020-01-01\n' },
]);
eq('tvtime shows', tv.entries.map((e) => [e.name, e.pairs!.length]), [['Fairy Tail', 2], ['Shaman King (2021)', 1]]);
eq('tvtime ignored', tv.ignoredFiles, ['movies.csv']);

const anime = (id: number, romaji: string, english: string | null, year: number, format = 'TV'): Anime =>
  ({ id, title: { romaji, english }, seasonYear: year, startDate: { year, month: 1, day: 1 }, format }) as Anime;
eq('match exact', bestMatch('Fairy Tail', [anime(1, 'FAIRY TAIL: Final Series', null, 2018), anime(2, 'FAIRY TAIL', 'Fairy Tail', 2009)])?.id, 2);
eq('match year', bestMatch('Shaman King (2021)', [anime(1, 'Shaman King', 'Shaman King', 2001), anime(2, 'Shaman King', 'Shaman King', 2021)])?.id, 2);
eq('no match', bestMatch('Totally Unknown Show', [anime(1, 'Naruto', 'Naruto', 2002)]), null);

const season = (n: number, id: number, eps: number, offset: number): FranchiseSeason => ({ number: n, anime: { id, episodes: eps } as Anime, aired: eps, offset });
const f: Franchise = { rootId: 10, ids: [10, 11], seasons: [season(1, 10, 12, 0), season(2, 11, 12, 12)], extras: [] };
eq('map direct', mapPairs(f, [{ season: 2, episode: 3 }]).rows.map((r) => [r.seasonId, r.episode]), [[11, 3]]);
const approx = mapPairs(f, [{ season: 1, episode: 1 }, { season: 1, episode: 2 }, { season: 1, episode: 14 }]);
eq('map approx flag', approx.approximate, true);
eq('map approx rows', approx.rows.map((r) => [r.seasonId, r.episode]), [[10, 1], [10, 2], [10, 3]]);

export const failures = fail;
