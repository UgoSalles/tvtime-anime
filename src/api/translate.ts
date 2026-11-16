import { useQuery } from '@tanstack/react-query';
import { cachedFetch } from './cache';

/**
 * Les synopsis d'AniList sont en anglais : on les traduit en français à la volée (service de traduction
 * public de Google, sans clé) puis on garde le résultat pour toujours dans IndexedDB.
 * Seul le texte du synopsis (public) est envoyé. En cas d'échec, le texte d'origine reste affiché.
 */
const YEAR = 365 * 24 * 3600_000;
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t';

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return `${(h >>> 0).toString(36)}${s.length}`;
};

/** Coupe en morceaux d'au plus ~1800 caractères, aux sauts de ligne. */
function chunks(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if (cur && cur.length + line.length > 1800) {
      out.push(cur);
      cur = '';
    }
    cur += (cur ? '\n' : '') + line;
  }
  if (cur) out.push(cur);
  return out;
}

async function translateChunk(q: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q }),
    signal,
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = (await res.json()) as [string[][]?];
  const out = (data[0] ?? []).map((seg) => seg[0] ?? '').join('');
  if (!out.trim()) throw new Error('translate vide');
  return out;
}

export const translateFr = (text: string, signal?: AbortSignal) =>
  cachedFetch<string>(`tr:fr:${hash(text)}`, YEAR, async () => {
    const parts: string[] = [];
    for (const c of chunks(text)) parts.push(await translateChunk(c, signal));
    return parts.join('\n');
  });

/** Texte en français dès qu'il est prêt ; l'original (anglais) en attendant ou si la traduction échoue. */
export function useFrench(text: string | null | undefined): string | null {
  const q = useQuery({
    queryKey: ['tr-fr', text ? hash(text) : null],
    queryFn: ({ signal }) => translateFr(text!, signal),
    enabled: !!text,
    staleTime: Infinity,
    gcTime: 24 * 3600_000,
    retry: 1,
  });
  return q.data ?? text ?? null;
}
