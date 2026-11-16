import { useEffect, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { IconChevronDown, IconChevronRight, IconTv } from '../components/Icons';
import { Poster } from '../components/Poster';
import { PosterRow, QuickFollow } from '../components/PosterRow';
import { useBrowse, useDiscover, useSearch } from '../api/hooks';
import type { Anime } from '../api/types';
import { useDebounced } from '../lib/useDebounced';
import { useTitle } from '../lib/titles';
import { genreFr } from '../lib/genres';

const FORMAT_LABEL: Record<string, string> = { TV: 'Série', TV_SHORT: 'Série courte', ONA: 'ONA', MOVIE: 'Film', OVA: 'OVA', SPECIAL: 'Spécial', MUSIC: 'Clip' };

function SearchResults({ term, onOpen }: { term: string; onOpen: (id: number) => void }) {
  const t = useTitle();
  const q = useSearch(term);
  if (q.isLoading) return <p className="px-page py-8 text-center text-[13px] text-ink-3">Recherche…</p>;
  if (q.isError) return <p className="px-page py-8 text-center text-[13px] text-ink-3">Recherche impossible (hors-ligne ?).</p>;
  const items = q.data?.items ?? [];
  if (!items.length) return <p className="px-page py-8 text-center text-[13px] text-ink-3">Aucun résultat pour « {term} ».</p>;
  return (
    <ul className="px-page pt-2">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 border-b border-divider">
          <button onClick={() => onOpen(a.id)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
            <Poster title={t(a.title)} src={a.cover} color={a.color} showTitle={false} className="shrink-0 rounded-poster" style={{ width: 56, height: 84 }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold text-ink">{t(a.title)}</span>
              <span className="mt-0.5 block text-[12px] text-ink-3">
                {[FORMAT_LABEL[a.format ?? ''] ?? a.format, a.seasonYear ?? a.startDate?.year, a.episodes ? `${a.episodes} ép.` : null].filter(Boolean).join(' · ')}
              </span>
            </span>
            {a.averageScore ? <span className="text-[13px] font-bold text-ink-2">{(a.averageScore / 10).toFixed(1)}</span> : null}
          </button>
          <QuickFollow animeId={a.id} />
        </li>
      ))}
    </ul>
  );
}

/**
 * « Parcourir tous les animes » : genres + grille infinie. Cet écran n'apparaît sur aucune capture
 * (SPEC Q5) : construit à partir des composants existants.
 */
function BrowseView({ onOpen, onBack }: { onOpen: (id: number) => void; onBack: () => void }) {
  const t = useTitle();
  const discover = useDiscover();
  const [genre, setGenre] = useState<string | null>(null);
  const q = useBrowse(genre);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage(), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items: Anime[] = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="bg-header" style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
        <div className="flex h-11 items-center px-2">
          <button aria-label="Retour" onClick={onBack} className="grid h-9 w-9 place-items-center rotate-90 text-ink">
            <IconChevronDown size={24} />
          </button>
          <h1 className="ml-1 text-[18px] font-bold text-ink">Tous les animes</h1>
        </div>
        <div className="scroll-x flex gap-2 px-page pb-3">
          {[null, ...(discover.data?.genres ?? [])].map((g) => (
            <button
              key={g ?? 'all'}
              onClick={() => setGenre(g)}
              className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-bold uppercase tracking-wide ${genre === g ? 'bg-yellow text-black' : 'bg-chip text-chip-text'}`}
            >
              {g ? genreFr(g) : 'Tous'}
            </button>
          ))}
        </div>
      </div>
      <div className="scroll-y min-h-0 flex-1 px-page pt-3" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        <div className="grid grid-cols-3 gap-2">
          {items.map((a) => (
            <div key={a.id} className="relative">
              <button onClick={() => onOpen(a.id)} aria-label={t(a.title)} className="block w-full">
                <Poster title={t(a.title)} src={a.cover} color={a.color} className="aspect-[2/3] w-full rounded-poster" />
              </button>
              <QuickFollow animeId={a.id} className="absolute right-1.5 top-1.5" />
            </div>
          ))}
          {q.isLoading && Array.from({ length: 9 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-poster bg-chip" />)}
        </div>
        <div ref={sentinel} className="h-10" />
      </div>
    </div>
  );
}

export function DiscoverScreen({ onOpenShow }: { onOpenShow: (id: number) => void }) {
  const navigate = useNavigate();
  const browsing = useMatch('/decouvrir/tout');
  const [text, setText] = useState('');
  const term = useDebounced(text.trim());
  const discover = useDiscover();
  const searching = term.length >= 2;

  if (browsing) return <BrowseView onOpen={onOpenShow} onBack={() => navigate(-1)} />;
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="bg-header px-page pb-3" style={{ paddingTop: 'calc(var(--safe-top) + 14px)' }}>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rechercher un anime"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <div className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        {searching ? (
          <SearchResults term={term} onOpen={onOpenShow} />
        ) : (
          <>
            <PosterRow title="Animes tendance" items={discover.data?.trending} onOpen={onOpenShow} onTitleClick={() => navigate('/decouvrir/tout')} />
            <PosterRow title="Cette saison" items={discover.data?.season} onOpen={onOpenShow} onTitleClick={() => navigate('/decouvrir/tout')} />
            <PosterRow title="Prochainement" items={discover.data?.upcoming} onOpen={onOpenShow} onTitleClick={() => navigate('/decouvrir/tout')} />
            <PosterRow title="Les plus populaires" items={discover.data?.popular} onOpen={onOpenShow} onTitleClick={() => navigate('/decouvrir/tout')} />
            {discover.isError && <p className="px-page pt-6 text-center text-[13px] text-ink-3">Impossible de charger la découverte (hors-ligne ?).</p>}
            <div className="px-page pt-6">
              <button onClick={() => navigate('/decouvrir/tout')} className="flex h-[54px] w-full items-center gap-3 rounded-card bg-yellow px-3 text-black">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-yellow">
                  <IconTv size={20} />
                </span>
                <span className="flex-1 text-left text-[14px] font-extrabold uppercase tracking-wider">Parcourir tous les animes</span>
                <IconChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
