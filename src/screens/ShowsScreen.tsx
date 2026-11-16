import { Fragment } from 'react';
import { TopTabs } from '../components/TopTabs';
import { SectionChip } from '../components/Chips';
import { EpisodeCard } from '../components/EpisodeCard';
import { IconGrid } from '../components/Icons';
import { notStarted, upcoming, watchNext } from '../data/mock';
import { useUi, type ShowsTab } from '../store/ui';
import { layout } from '../theme';

const TABS: { id: ShowsTab; label: string }[] = [
  { id: 'watchlist', label: 'Épisodes à voir' },
  { id: 'upcoming', label: 'À venir' },
];

interface Nav {
  onOpenShow: (id: string) => void;
  onOpenEpisode: (showId: string, epId: string) => void;
}

function ChipRow({ label, withGrid }: { label: string; withGrid?: boolean }) {
  const toggle = useUi((s) => s.toggleGrid);
  return (
    <div className="relative flex h-[44px] items-center justify-center">
      <SectionChip>{label}</SectionChip>
      {withGrid && (
        <button aria-label="Changer d'affichage" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink">
          <IconGrid size={24} />
        </button>
      )}
    </div>
  );
}

function Watchlist(nav: Nav) {
  return (
    <div className="pb-4">
      <ChipRow label="A voir" withGrid />
      <div className="flex flex-col px-page" style={{ gap: layout.episodeCardGap }}>
        {watchNext.map((ep) => (
          <EpisodeCard key={ep.id} ep={ep} {...nav} />
        ))}
      </div>
      <div className="mt-2">
        <ChipRow label="Pas commencé" />
      </div>
      <div className="flex flex-col px-page" style={{ gap: layout.episodeCardGap }}>
        {notStarted.map((ep) => (
          <EpisodeCard key={ep.id} ep={ep} {...nav} />
        ))}
      </div>
    </div>
  );
}

function Upcoming(nav: Nav) {
  return (
    <div className="pb-4">
      <div className="flex h-[44px] items-center justify-end px-page">
        <IconGrid size={24} />
      </div>
      {upcoming.map((g) => (
        <Fragment key={g.date}>
          <div className="flex h-[44px] items-center justify-center">
            <SectionChip>{g.date}</SectionChip>
          </div>
          <div className="flex flex-col px-page" style={{ gap: 12 }}>
            {g.items.map((ep) => (
              <EpisodeCard key={ep.id} ep={ep} compact {...nav} />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function ShowsScreen(nav: Nav) {
  const tab = useUi((s) => s.showsTab);
  const setTab = useUi((s) => s.setShowsTab);
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="bg-header" style={{ paddingTop: 'var(--safe-top)' }}>
        <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>
      <div className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 8px)' }}>
        {tab === 'watchlist' ? <Watchlist {...nav} /> : <Upcoming {...nav} />}
      </div>
    </div>
  );
}
