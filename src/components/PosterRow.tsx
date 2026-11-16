import { useState } from 'react';
import { IconCheck, IconChevronRight, IconPlus } from './Icons';
import { Poster } from './Poster';
import type { Anime } from '../api/types';
import { followAnime, unfollow } from '../db/repo';
import { useFollowOf } from '../db/hooks';
import { useTitle } from '../lib/titles';

/** Bouton « + » (ajout rapide) → coche verte une fois suivi. */
export function QuickFollow({ animeId, className = '' }: { animeId: number; className?: string }) {
  const follow = useFollowOf(animeId);
  const [busy, setBusy] = useState(false);
  const followed = !!follow;
  return (
    <button
      type="button"
      aria-label={followed ? 'Ne plus suivre' : 'Suivre'}
      disabled={busy || follow === undefined}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          if (follow) await unfollow(follow.showId);
          else await followAnime(animeId);
        } finally {
          setBusy(false);
        }
      }}
      className={`grid h-6 w-6 place-items-center rounded-[4px] border-2 text-white ${followed ? 'border-green bg-green' : 'border-white/90 bg-black/30'} ${busy ? 'animate-pulse' : ''} ${className}`}
    >
      {followed ? <IconCheck size={14} /> : <IconPlus size={14} />}
    </button>
  );
}

export function PosterTile({ anime, onOpen, width = 112, height = 168 }: { anime: Anime; onOpen: (id: number) => void; width?: number; height?: number }) {
  const t = useTitle();
  const name = t(anime.title);
  return (
    <div className="relative shrink-0" style={{ width, height }}>
      <button onClick={() => onOpen(anime.id)} className="block text-left" aria-label={name}>
        <Poster title={name} src={anime.coverLarge} color={anime.color} className="rounded-poster" style={{ width, height }} />
      </button>
      <QuickFollow animeId={anime.id} className="absolute right-1.5 top-1.5" />
    </div>
  );
}

export function PosterRow({
  title,
  items,
  onOpen,
  onTitleClick,
  loading,
}: {
  title: string;
  items: Anime[] | undefined;
  onOpen: (id: number) => void;
  onTitleClick?: () => void;
  loading?: boolean;
}) {
  return (
    <section className="mt-6">
      <button onClick={onTitleClick} className="flex items-center gap-1 px-page text-[20px] font-bold leading-6 text-ink">
        {title}
        <IconChevronRight size={16} />
      </button>
      <div className="scroll-x mt-3 flex gap-2 px-page">
        {items
          ? items.map((a) => <PosterTile key={a.id} anime={a} onOpen={onOpen} />)
          : loading !== false &&
            Array.from({ length: 5 }, (_, i) => <div key={i} className="shrink-0 animate-pulse rounded-poster bg-chip" style={{ width: 112, height: 168 }} />)}
      </div>
    </section>
  );
}
