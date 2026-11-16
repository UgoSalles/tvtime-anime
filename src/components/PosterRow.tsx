import { IconChevronRight, IconPlus } from './Icons';
import { Poster } from './Poster';
import type { Anime } from '../api/types';
import { useTitle } from '../lib/titles';

export function PosterTile({ anime, onOpen, width = 112, height = 168 }: { anime: Anime; onOpen: (id: number) => void; width?: number; height?: number }) {
  const t = useTitle();
  const name = t(anime.title);
  return (
    <button onClick={() => onOpen(anime.id)} className="shrink-0 text-left" aria-label={name}>
      <Poster title={name} src={anime.coverLarge} color={anime.color} className="rounded-poster" style={{ width, height }}>
        <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-[4px] border-2 border-white/90 bg-black/30 text-white">
          <IconPlus size={14} />
        </span>
      </Poster>
    </button>
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
