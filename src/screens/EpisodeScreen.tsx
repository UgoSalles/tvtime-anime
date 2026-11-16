import { useState } from 'react';
import { CheckButton } from '../components/CheckButton';
import { IconCalendar, IconChevronDown, IconShare, IconStar } from '../components/Icons';
import { ShowPill } from '../components/Chips';
import { Poster } from '../components/Poster';
import { useFranchise, useSeasonEpisodes } from '../api/hooks';
import { stripSeasonSuffix, useTitle } from '../lib/titles';

/**
 * Fiche épisode, d'après a.jpeg (166 px de large : libellés à confirmer, SPEC §4.6).
 * Personnage préféré et commentaires : non couverts. Les pourcentages de notes sont fictifs
 * (aucune source de données ; phase 6 si les notes deviennent sociales).
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

const pad = (n: number) => String(n).padStart(2, '0');

export function EpisodeScreen({ showId, seasonId, episode, onBack, onOpenShow }: {
  showId: number;
  seasonId: number;
  episode: number;
  onBack: () => void;
  onOpenShow: (id: number) => void;
}) {
  const t = useTitle();
  const franchise = useFranchise(showId);
  const season = franchise.data?.seasons.find((s) => s.anime.id === seasonId);
  const eps = useSeasonEpisodes(season, Math.ceil(episode / 100));
  const info = eps.data?.episodes.find((e) => e.number === episode);
  const root = franchise.data?.seasons[0]?.anime;
  const [watched, setWatched] = useState(false);
  const [stars, setStars] = useState(4);
  const [emotion, setEmotion] = useState(0);

  const code = season ? `S${pad(season.number)} | E${pad(episode)}${season.offset > 0 ? ` (E${season.offset + episode})` : ''}` : `E${pad(episode)}`;
  const aired = info?.aired ? new Date(info.aired).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="scroll-y min-h-0 flex-1 pb-10">
        <div className="relative h-[240px]">
          <Poster title="" src={info?.thumbnail ?? season?.anime.banner ?? season?.anime.coverLarge} color={season?.anime.color ?? '#333'} showTitle={false} className="absolute inset-0" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0) 35%, rgba(0,0,0,0.75))' }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 text-white" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
            <button aria-label="Fermer" onClick={onBack} className="grid h-9 w-9 place-items-center"><IconChevronDown size={26} /></button>
            <button aria-label="Partager" className="grid h-9 w-9 place-items-center"><IconShare size={22} /></button>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-page pb-4 text-white">
            <div className="mb-2">{root && <ShowPill name={stripSeasonSuffix(t(root.title))} onClick={() => onOpenShow(showId)} />}</div>
            <div className="text-[20px] font-extrabold leading-6">{code}</div>
            <div className="mt-0.5 min-h-[20px] text-[14px] font-medium text-white/90">{info?.title ?? `Épisode ${episode}`}</div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-divider px-page py-3 text-[12px] text-ink-3">
          <div className="flex items-center gap-4">
            {aired && <span className="flex items-center gap-1.5"><IconCalendar size={16} /> {aired}</span>}
            {watched && <span className="flex items-center gap-1.5"><IconCalendar size={16} /> Aujourd’hui</span>}
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
              <button key={e.label} onClick={() => setEmotion(i)} className={`flex h-[84px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-card ${i === emotion ? 'bg-yellow text-black' : 'bg-chip text-ink-2'}`}>
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
