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

  // Onglet visible derrière une fiche : le dernier onglet réel (la TabBar ne saute pas).
  const tabRef = useRef<'shows' | 'discover' | 'profile'>('shows');
  if (!showMatch) {
    tabRef.current = pathname.startsWith('/decouvrir') ? 'discover' : pathname.startsWith('/profil') ? 'profile' : 'shows';
  }
  const tab = tabRef.current;
  const openShow = (id: string) => navigate(`/serie/${id}`);
  const openEpisode = (showId: string, epId: string) => navigate(`/serie/${showId}/episode/${epId}`);
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
        {showMatch?.params.showId && (
          <StackLayer key="show" onBack={back} z={30}>
            <ShowScreen
              showId={showMatch.params.showId}
              onBack={back}
              onOpenEpisode={(epId) => openEpisode(showMatch.params.showId!, epId)}
            />
          </StackLayer>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {epMatch?.params.showId && (
          <StackLayer key="episode" onBack={back} z={40}>
            <EpisodeScreen showId={epMatch.params.showId} onBack={back} />
          </StackLayer>
        )}
      </AnimatePresence>
    </div>
  );
}
