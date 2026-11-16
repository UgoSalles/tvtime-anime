import { useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { StackLayer } from './components/StackLayer';
import { ShowsScreen } from './screens/ShowsScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ShowScreen } from './screens/ShowScreen';
import { EpisodeScreen } from './screens/EpisodeScreen';

/**
 * Navigation : les 3 onglets sont montés en permanence (scroll conservé) ; fiche série
 * et fiche épisode s'empilent par-dessus (/serie/:id, /serie/:id/episode/:epId).
 */
export function App() {
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
  const openShow = (id: number) => navigate(`/serie/${id}`);
  const openEpisode = (sid: number, seasonId: number, ep: number) => navigate(`/serie/${sid}/episode/${seasonId}-${ep}`);
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0" style={{ display: tab === 'shows' ? 'block' : 'none' }}>
        <ShowsScreen onOpenShow={openShow} onOpenEpisode={openEpisode} />
      </div>
      <div className="absolute inset-0" style={{ display: tab === 'discover' ? 'block' : 'none' }}>
        <DiscoverScreen onOpenShow={openShow} />
      </div>
      <div className="absolute inset-0" style={{ display: tab === 'profile' ? 'block' : 'none' }}>
        <ProfileScreen onOpenShow={openShow} />
      </div>
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
    </div>
  );
}
