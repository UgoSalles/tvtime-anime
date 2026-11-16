import type { ImportEntry } from './importer';

const STATUS: Record<string, NonNullable<ImportEntry['status']>> = {
  watching: 'current',
  completed: 'completed',
  'on-hold': 'paused',
  dropped: 'dropped',
  'plan to watch': 'planning',
};

/** Export XML MyAnimeList (`<myanimelist><anime>…</anime></myanimelist>`). */
export function parseMalXml(text: string): ImportEntry[] {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML illisible.');
  const val = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
  const entries: ImportEntry[] = [];
  for (const a of Array.from(doc.getElementsByTagName('anime'))) {
    const malId = Number(val(a, 'series_animedb_id'));
    if (!malId) continue;
    const status = STATUS[val(a, 'my_status').toLowerCase()] ?? (Number(val(a, 'my_status')) === 2 ? 'completed' : 'current');
    entries.push({ label: val(a, 'series_title') || String(malId), malId, status, progress: Number(val(a, 'my_watched_episodes')) || 0 });
  }
  if (!entries.length) throw new Error('Aucune série trouvée : est-ce bien un export MyAnimeList ?');
  return entries;
}
