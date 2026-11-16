import { NavLink } from 'react-router-dom';
import { IconPerson, IconSearch, IconTv } from './Icons';
import { layout } from '../theme';

/**
 * Barre d'onglets basse fixe. 3 onglets : l'onglet « Films » est retiré
 * (SPEC Q3, défaut retenu : app animes-only, comme la version 3 onglets de q.jpeg).
 */
const items = [
  { to: '/', label: 'Séries', Icon: IconTv, end: true },
  { to: '/decouvrir', label: 'Découvrir', Icon: IconSearch, end: false },
  { to: '/profil', label: 'Profil', Icon: IconPerson, end: false },
] as const;

export function TabBar() {
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-20 flex bg-tab-bar"
      style={{
        height: `calc(${layout.tabBarHeight}px + var(--safe-bottom))`,
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: 'inset 0 1px 0 var(--c-divider)',
      }}
    >
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 ${isActive ? 'text-tab-icon-active' : 'text-tab-icon-inactive'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={layout.tabBarIconSize} strokeWidth={isActive ? 1.9 : 1.5} className="-my-1" />
              <span className={`text-tab-bar-label ${isActive ? '!font-bold' : ''}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
