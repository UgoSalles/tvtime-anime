import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { StackLayer } from './components/StackLayer';
import { ShowsScreen } from './screens/ShowsScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ShowScreen } from './screens/ShowScreen';
import { EpisodeScreen } from './screens/EpisodeScreen';
import { SheetHost } from './components/Sheet';

/**
 * Navigation : les 3 onglets sont montés en permanence (scroll conservé) ; fiche série
 * et fiche épisode s'empilent par-dessus (/serie/:id, /serie/:id/episode/:epId).
 */
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => (window.removeEventListener('online', on), window.removeEventListener('offline', off));
  }, []);
  return online;
}

/**
 * Onglet gardé monté : masqué par `visibility` (et non `display:none`) pour que le défilement et les listes
 * virtualisées conservent leur position au retour — `display:none` les remet à zéro (saut visible).
 */
function TabLayer({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0" style={{ visibility: active ? 'visible' : 'hidden', pointerEvents: active ? 'auto' : 'none' }} inert={!active}>
      {children}
    </div>
  );
}

export function App() {
  const online = useOnline();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showMatch = matchPath({ path: '/serie/:showId', end: false }, pathname);
  const epMatch = matchPath('/serie/:showId/episode/:epId', pathname);
  const showId = Number(showMatch?.params.showId);
  const [epSeason, epNum] = (epMatch?.params.epId ?? '').split('-').map(Number);

  // Onglet visible derrière une fiche : le dernier onglet réel (la TabBar ne saute pas).
  const tabRef = useRef<'shows' | 'discover' | 'profile'>('shows');
  if (!showMatch) {
    tabRef.current = pathname.startsWith('/decouvrir') ? 'discover' : pathname.startsWith('/profil') ? 'profile' : 'shows';
  }
  const tab = tabRef.current;
  // Un onglet n'est monté qu'à sa première visite (pas de requêtes inutiles au démarrage), puis reste monté.
  const [visited, setVisited] = useState<Record<string, boolean>>({ [tab]: true });
  useEffect(() => setVisited((v) => (v[tab] ? v : { ...v, [tab]: true })), [tab]);
  const openShow = (id: number) => navigate(`/serie/${id}`);
  const openEpisode = (sid: number, seasonId: number, ep: number) => navigate(`/serie/${sid}/episode/${seasonId}-${ep}`);
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {visited.shows && <TabLayer active={tab === 'shows'}><ShowsScreen onOpenShow={openShow} onOpenEpisode={openEpisode} /></TabLayer>}
      {visited.discover && <TabLayer active={tab === 'discover'}><DiscoverScreen onOpenShow={openShow} /></TabLayer>}
      {visited.profile && <TabLayer active={tab === 'profile'}><ProfileScreen onOpenShow={openShow} /></TabLayer>}
      <TabBar />

      <AnimatePresence>
        {showMatch && Number.isFinite(showId) && (
          <StackLayer key="show" onBack={back} z={30}>
            <ShowScreen showId={showId} onBack={back} onOpenShow={openShow} onOpenEpisode={(seasonId, ep) => openEpisode(showId, seasonId, ep)} />
          </StackLayer>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {epMatch && Number.isFinite(showId) && epSeason && epNum && (
          <StackLayer key="episode" onBack={back} z={40}>
            <EpisodeScreen showId={showId} seasonId={epSeason} episode={epNum} onBack={back} onOpenShow={openShow} />
          </StackLayer>
        )}
      </AnimatePresence>
      {!online && (
        <div className="pointer-events-none absolute inset-x-0 z-[70] flex justify-center" style={{ top: 'calc(var(--safe-top) + 4px)' }}>
          <span className="rounded-full bg-black/80 px-3 py-1 text-[11px] font-bold text-white">Hors-ligne · données en cache</span>
        </div>
      )}
      <SheetHost />
    </div>
  );
}
