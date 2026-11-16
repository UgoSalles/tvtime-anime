import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type ShowsTab = 'watchlist' | 'upcoming';

interface UiState {
  themePref: ThemePref;
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
      showsTab: 'watchlist',
      setShowsTab: (showsTab) => set({ showsTab }),
      grid: false,
      toggleGrid: () => set((s) => ({ grid: !s.grid })),
    }),
    { name: 'tvtime-ui', partialize: (s) => ({ themePref: s.themePref }) },
  ),
);
