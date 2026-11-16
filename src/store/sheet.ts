import { create } from 'zustand';

export interface SheetAction {
  label: string;
  onClick: () => void | Promise<void>;
  destructive?: boolean;
}

export type SheetSpec =
  | { kind: 'actions'; title?: string; message?: string; actions: SheetAction[] }
  | { kind: 'prompt'; title: string; placeholder?: string; initial?: string; submitLabel?: string; onSubmit: (value: string) => void | Promise<void> };

interface SheetState {
  spec: SheetSpec | null;
  open: (spec: SheetSpec) => void;
  close: () => void;
}

export const useSheet = create<SheetState>((set) => ({
  spec: null,
  open: (spec) => set({ spec }),
  close: () => set({ spec: null }),
}));

/** Feuille d'actions iOS (annuler ajouté automatiquement). */
export const openActions = (title: string | undefined, actions: SheetAction[], message?: string) =>
  useSheet.getState().open({ kind: 'actions', title, message, actions });
