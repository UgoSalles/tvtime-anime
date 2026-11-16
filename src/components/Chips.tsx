import { IconChevronRight } from './Icons';

/** Pastille de section centrée (« A VOIR », « JAN 13, 2024 »). */
export function SectionChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[26px] items-center rounded-full bg-chip px-3 text-section-chip uppercase text-chip-text">
      {children}
    </span>
  );
}

/** Pastille contour « NOM DE LA SÉRIE > » — tronquée par « … ». */
export function ShowPill({ name, onClick }: { name: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="inline-flex h-6 max-w-[150px] items-center gap-0.5 rounded-full border border-pill-border px-2 text-show-pill uppercase text-ink"
    >
      <span className="truncate">{name}</span>
      <IconChevronRight size={9} className="shrink-0" />
    </button>
  );
}

/** Badge « PREMIERE » (gris) ou « NOUVEAU » (jaune). */
export function Badge({ kind, children }: { kind: 'premiere' | 'new'; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-[18px] shrink-0 items-center rounded-badge px-1.5 text-[10px] font-bold uppercase tracking-wide text-black ${
        kind === 'new' ? 'bg-yellow' : 'bg-badge'
      }`}
    >
      {children}
    </span>
  );
}
