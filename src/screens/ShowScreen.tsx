import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckButton } from '../components/CheckButton';
import { IconChevronDown, IconMore, IconShare } from '../components/Icons';
import { Poster } from '../components/Poster';
import { TopTabs } from '../components/TopTabs';
import { fairyTailSeasons, shows, type MockShow } from '../data/mock';
import { layout } from '../theme';

type Tab = 'about' | 'episodes';

const allShows = Object.values(shows);

/**
 * Fiche série. Structure d'après q.jpeg / c.jpeg / m.jpeg (versions ANCIENNES) :
 * bannière, onglets ABOUT | EPISODES, « WATCH NEXT », « ALL EPISODES », saisons + progression.
 * L'onglet À PROPOS et la liste d'épisodes dépliée ne sont couverts par aucune capture.
 */
export function ShowScreen({ showId, onBack, onOpenEpisode }: { showId: string; onBack: () => void; onOpenEpisode: (epId: string) => void }) {
  const show: MockShow = allShows.find((s) => s.id === showId) ?? shows.fairyTail;
  const [tab, setTab] = useState<Tab>('episodes');
  const [seasonsDone, setSeasonsDone] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [followed] = useState(true);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="scroll-y min-h-0 flex-1">
        <div className="relative" style={{ height: layout.bannerHeight + 60 }}>
          <Poster title="" hue={show.hue} className="absolute inset-0" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0) 40%, rgba(0,0,0,0.6))' }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 text-white" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
            <button aria-label="Retour" onClick={onBack} className="grid h-9 w-9 place-items-center">
              <IconChevronDown size={26} />
            </button>
            <div className="flex items-center gap-1">
              <button aria-label="Partager" className="grid h-9 w-9 place-items-center">
                <IconShare size={22} />
              </button>
              <button aria-label="Plus" className="grid h-9 w-9 place-items-center">
                <IconMore size={22} />
              </button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-page pb-4 text-white">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-7">{show.title}</h1>
              <p className="mt-0.5 text-[13px] font-medium text-white/85">S04 | E01 · Sabertooth</p>
            </div>
            <span className="inline-flex h-[30px] shrink-0 items-center rounded-card bg-green px-3 text-[12px] font-bold text-white">
              {followed ? '✓ Suivi' : '+ Suivre'}
            </span>
          </div>
        </div>

        <TopTabs
          tabs={[
            { id: 'about' as Tab, label: 'À propos' },
            { id: 'episodes' as Tab, label: 'Épisodes' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'about' ? (
          <p className="px-page py-8 text-center text-[13px] text-ink-3">
            Onglet « À propos » : non couvert par les captures (SPEC §4.5).
          </p>
        ) : (
          <div className="pb-10">
            <div className="py-4 text-center text-section-chip uppercase text-ink-2">Watch next</div>
            <div className="px-page">
              <button onClick={() => onOpenEpisode('a1')} className="block w-full text-left">
                <Poster title={`S04 | E01 · Sabertooth`} hue={show.hue + 20} className="h-[88px] w-full rounded-card" />
              </button>
            </div>
            <div className="flex items-center justify-between px-page py-4">
              <span className="text-section-chip uppercase text-ink-2">Tous les épisodes</span>
              <CheckButton checked={false} onToggle={() => undefined} size={26} />
            </div>
            <div className="flex flex-col gap-2.5 px-page">
              {fairyTailSeasons.map((s) => {
                const done = seasonsDone[s.number] ?? false;
                const ratio = done ? 1 : s.watched / s.total;
                return (
                  <div key={s.number} className="shadow-card relative overflow-hidden rounded-card bg-surface">
                    <div className="flex h-[62px] items-center px-4">
                      <span className="text-[20px] font-bold text-ink">Saison {s.number}</span>
                      <IconChevronDown size={16} className="ml-2 text-ink-3" />
                      <span className="ml-auto mr-3 text-[14px] font-medium text-ink-3">
                        {done ? s.total : s.watched}/{s.total}
                      </span>
                      <CheckButton
                        checked={done}
                        onToggle={() => setSeasonsDone((d) => ({ ...d, [s.number]: !done }))}
                        size={34}
                      />
                    </div>
                    <div className="h-1 w-full bg-progress-track">
                      <motion.div className="h-full bg-green" animate={{ width: `${ratio * 100}%` }} initial={false} transition={{ duration: 0.3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
