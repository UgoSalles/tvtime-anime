import { useState } from 'react';
import { CheckButton } from '../components/CheckButton';
import { IconCalendar, IconChevronDown, IconShare, IconStar } from '../components/Icons';
import { ShowPill } from '../components/Chips';
import { Poster } from '../components/Poster';
import { shows } from '../data/mock';

/**
 * Fiche épisode, d'après a.jpeg (166 px de large : libellés à confirmer, SPEC §4.6).
 * Personnage préféré et commentaires : non couverts.
 */
const RATINGS = [
  { label: 'Bad', pct: '5%' },
  { label: 'Ok', pct: '8%' },
  { label: 'Good', pct: '19%' },
  { label: 'Great', pct: '35%' },
  { label: 'Wow', pct: '33%' },
];
const EMOTIONS = [
  { emoji: '😱', label: 'Shocked' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😭', label: 'Sad' },
  { emoji: '🤔', label: 'Reflective' },
  { emoji: '😂', label: 'Funny' },
];

export function EpisodeScreen({ showId, onBack }: { showId: string; onBack: () => void }) {
  const show = Object.values(shows).find((s) => s.id === showId) ?? shows.fairyTail;
  const [watched, setWatched] = useState(false);
  const [stars, setStars] = useState(4);
  const [emotion, setEmotion] = useState(0);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="scroll-y min-h-0 flex-1 pb-10">
        <div className="relative h-[240px]">
          <Poster title="" hue={show.hue} className="absolute inset-0" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0) 35%, rgba(0,0,0,0.7))' }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 text-white" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
            <button aria-label="Fermer" onClick={onBack} className="grid h-9 w-9 place-items-center">
              <IconChevronDown size={26} />
            </button>
            <button aria-label="Partager" className="grid h-9 w-9 place-items-center">
              <IconShare size={22} />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-page pb-4 text-white">
            <div className="mb-2">
              <ShowPill name={show.title} />
            </div>
            <div className="text-[20px] font-extrabold leading-6">S04 | E01</div>
            <div className="mt-0.5 text-[14px] font-medium text-white/90">Sabertooth</div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-divider px-page py-3 text-[12px] text-ink-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <IconCalendar size={16} /> 12 oct. 2014
            </span>
            {watched && (
              <span className="flex items-center gap-1.5">
                <IconCalendar size={16} /> Aujourd’hui
              </span>
            )}
          </div>
          <CheckButton checked={watched} onToggle={() => setWatched((w) => !w)} size={38} />
        </div>

        <section className="px-page pt-6 text-center">
          <h3 className="text-section-chip uppercase text-ink-2">Noter cet épisode</h3>
          <div className="mt-4 flex justify-between">
            {RATINGS.map((r, i) => (
              <button key={r.label} onClick={() => setStars(i + 1)} className="flex w-[56px] flex-col items-center gap-1">
                <IconStar size={34} className={i < stars ? 'text-yellow' : 'text-chip'} />
                <span className="text-[10px] font-bold uppercase text-ink-3">{r.label}</span>
                <span className="text-[10px] text-ink-3">{r.pct}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="pt-8 text-center">
          <h3 className="text-section-chip uppercase text-ink-2">Qu’as-tu ressenti ?</h3>
          <div className="scroll-x mt-4 flex gap-2 px-page">
            {EMOTIONS.map((e, i) => (
              <button
                key={e.label}
                onClick={() => setEmotion(i)}
                className={`flex h-[84px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-card ${
                  i === emotion ? 'bg-yellow text-black' : 'bg-chip text-ink-2'
                }`}
              >
                <span className="text-[28px] leading-none">{e.emoji}</span>
                <span className="text-[10px] font-bold uppercase">{e.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
