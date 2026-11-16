import { motion } from 'framer-motion';
import { layout } from '../theme';
import { motion as m } from '../theme';

/**
 * Onglets supérieurs plein-largeur : soulignement de 3 pt sous l'onglet actif
 * (moitié de la largeur pour 2 onglets) + filet de 1 pt sur toute la largeur.
 * `activeText` : couleur du texte actif (noir en clair, jaune sur les anciennes versions).
 */
export function TopTabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`relative flex bg-header ${className}`}
      style={{ height: layout.topTabsHeight, boxShadow: 'inset 0 -1px 0 var(--c-divider)' }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
          className={`relative flex-1 text-top-tab uppercase ${'text-ink'}`}
        >
          {t.label}
          {t.id === active && (
            <motion.span
              layoutId={`tab-underline-${tabs.map((x) => x.id).join('-')}`}
              transition={m.push}
              className="absolute inset-x-0 bottom-0 bg-tab-underline"
              style={{ height: layout.topTabUnderline }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
