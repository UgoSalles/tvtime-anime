import { CheckButton } from '../components/CheckButton';
import { IconCalendar, IconChevronDown, IconShare, IconStar } from '../components/Icons';
import { ShowPill } from '../components/Chips';
import { Poster } from '../components/Poster';
import { useAnimeDetail, useFranchise, useSeasonEpisodes } from '../api/hooks';
import { useFollowOf, useReaction, useWatchedMap } from '../db/hooks';
import { epKey, setReaction } from '../db/repo';
import { toggleEpisode } from '../db/actions';
import { stripSeasonSuffix, useTitle } from '../lib/titles';

/**
 * Fiche épisode, d'après a.jpeg (166 px de large : libellés à confirmer, SPEC §4.6).
 * Note, émotion et personnage préféré sont enregistrés localement. Les pourcentages communautaires
 * de a.jpeg n'ont pas de source : ils reviendront avec le social (phase 6). Commentaires : phase 6.
 */
const RATINGS = ['Bad', 'Ok', 'Good', 'Great', 'Wow'];
const EMOTIONS = [
  { id: 'shocked', emoji: '😱', label: 'Shocked' },
  { id: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { id: 'sad', emoji: '😭', label: 'Sad' },
  { id: 'reflective', emoji: '🤔', label: 'Reflective' },
  { id: 'funny', emoji: '😂', label: 'Funny' },
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
  const follow = useFollowOf(showId);
  const watchedMap = useWatchedMap(follow?.showId ?? franchise.data?.rootId ?? showId);
  const watchedAt = watchedMap?.get(epKey(seasonId, episode));
  const watched = watchedAt !== undefined;
  const reaction = useReaction(seasonId, episode);
  const detail = useAnimeDetail(seasonId);
  const unaired = !!season && episode > (season.aired ?? 0);
  const react = (patch: Parameters<typeof setReaction>[3]) => franchise.data && setReaction(franchise.data, seasonId, episode, patch);

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
            {watchedAt !== undefined && <span className="flex items-center gap-1.5"><IconCalendar size={16} /> Vu le {new Date(watchedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          </div>
          <div className={unaired ? 'opacity-40' : ''}>
            <CheckButton checked={watched} onToggle={() => franchise.data && !unaired && toggleEpisode(franchise.data, seasonId, episode, watchedMap ?? new Map())} size={38} />
          </div>
        </div>

        <section className="px-page pt-6 text-center">
          <h3 className="text-section-chip uppercase text-ink-2">Noter cet épisode</h3>
          <div className="mt-4 flex justify-between">
            {RATINGS.map((label, i) => (
              <button key={label} onClick={() => react({ rating: reaction?.rating === i + 1 ? null : i + 1 })} className="flex w-[56px] flex-col items-center gap-1">
                <IconStar size={34} className={(reaction?.rating ?? 0) > i ? 'text-yellow' : 'text-chip'} />
                <span className="text-[10px] font-bold uppercase text-ink-3">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="pt-8 text-center">
          <h3 className="text-section-chip uppercase text-ink-2">Qu’as-tu ressenti ?</h3>
          <div className="scroll-x mt-4 flex gap-2 px-page">
            {EMOTIONS.map((e) => (
              <button key={e.id} onClick={() => react({ emotion: reaction?.emotion === e.id ? null : e.id })} className={`flex h-[84px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-card ${reaction?.emotion === e.id ? 'bg-yellow text-black' : 'bg-chip text-ink-2'}`}>
                <span className="text-[28px] leading-none">{e.emoji}</span>
                <span className="text-[10px] font-bold uppercase">{e.label}</span>
              </button>
            ))}
          </div>
        </section>

        {detail.data && detail.data.characters.length > 0 && (
          <section className="pt-8 text-center">
            <h3 className="text-section-chip uppercase text-ink-2">Personnage préféré</h3>
            <div className="scroll-x mt-4 flex gap-3 px-page">
              {detail.data.characters.map((c) => (
                <button key={c.id} onClick={() => react({ characterId: reaction?.characterId === c.id ? null : c.id })} className="w-[72px] shrink-0">
                  <span className={`block rounded-full p-0.5 ${reaction?.characterId === c.id ? 'bg-yellow' : 'bg-transparent'}`}>
                    <Poster title={c.name} src={c.image} color="#888" showTitle={false} className="h-[68px] w-[68px] rounded-full" />
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[10px] font-semibold leading-tight text-ink">{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
