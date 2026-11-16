import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type TitleLangPref = 'romaji' | 'english';
export type ShowsTab = 'watchlist' | 'upcoming';

interface UiState {
  themePref: ThemePref;
  titleLang: TitleLangPref;
  setTitleLang: (t: TitleLangPref) => void;
  setThemePref: (t: ThemePref) => void;
  showsTab: ShowsTab;
  setShowsTab: (t: ShowsTab) => void;
  /** Bascule liste / grille de la Watchlist (contenu de la grille : SPEC Q4). */
  grid: boolean;
  toggleGrid: () => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      themePref: 'system',
      setThemePref: (themePref) => set({ themePref }),
      titleLang: 'english',
      setTitleLang: (titleLang) => set({ titleLang }),
      showsTab: 'watchlist',
      setShowsTab: (showsTab) => set({ showsTab }),
      grid: false,
      toggleGrid: () => set((s) => ({ grid: !s.grid })),
    }),
    { name: 'tvtime-ui', partialize: (s) => ({ themePref: s.themePref, titleLang: s.titleLang }) },
  ),
);
