import { useUi } from '../store/ui';
import type { Titles } from '../api/types';

export type TitleLang = 'romaji' | 'english';

export function pickTitle(t: Titles, lang: TitleLang): string {
  return (lang === 'english' ? t.english || t.romaji : t.romaji || t.english) ?? t.native ?? '—';
}

/** Titre selon le réglage « romaji / anglais ». */
export function useTitle() {
  const lang = useUi((s) => s.titleLang);
  return (t: Titles) => pickTitle(t, lang);
}

/** Titre d'affichage d'une série/saison avec numéro : « Titre » ou « Titre — Saison 2 ». */
export const stripSeasonSuffix = (s: string) => s.replace(/\s*(?:season|saison|part|cour)\s*\d+\s*$/i, '').trim();
