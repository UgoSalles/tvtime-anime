import { Fragment, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TopTabs } from '../components/TopTabs';
import { SectionChip } from '../components/Chips';
import { EpisodeCard, type EpisodeCardModel } from '../components/EpisodeCard';
import { IconGrid } from '../components/Icons';
import { useAiring, useSeasonEpisodes } from '../api/hooks';
import type { Franchise } from '../api/types';
import { markEpisodes, epKey } from '../db/repo';
import { toggleEpisode } from '../db/actions';
import { stripSeasonSuffix, useTitle } from '../lib/titles';
import { useLibrary, type ShowState } from '../lib/library';
import { useUi, type ShowsTab } from '../store/ui';
import { layout } from '../theme';

const TABS: { id: ShowsTab; label: string }[] = [
  { id: 'watchlist', label: 'Épisodes à voir' },
  { id: 'upcoming', label: 'À venir' },
];

interface Nav {
  onOpenShow: (id: number) => void;
  onOpenEpisode: (showId: number, seasonId: number, episode: number) => void;
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

const Skeleton = ({ compact }: { compact?: boolean }) => (
  <div className="animate-pulse rounded-card bg-surface" style={{ height: compact ? layout.upcomingCardHeight : layout.episodeCardHeight }} />
);

function useShowTitle() {
  const t = useTitle();
  return (f: Franchise) => stripSeasonSuffix(t(f.seasons[0]?.anime.title ?? { romaji: '—', english: null }));
}

function WatchRow({ state, ...nav }: { state: ShowState } & Nav) {
  const showTitle = useShowTitle();
  const { next, franchise } = state;
  const eps = useSeasonEpisodes(next?.season, Math.ceil((next?.episode ?? 1) / 100));
  if (!next || !franchise) return null;
  const title = eps.data?.episodes.find((e) => e.number === next.episode)?.title ?? null;
  const model: EpisodeCardModel = {
    key: `${next.season.anime.id}-${next.episode}`,
    showId: franchise.rootId,
    seasonId: next.season.anime.id,
    showTitle: showTitle(franchise),
    poster: next.season.anime.coverLarge,
    color: next.season.anime.color,
    season: next.season.number,
    episode: next.episode,
    absolute: next.absolute !== next.episode ? next.absolute : undefined,
    behind: state.behind || undefined,
    premiere: next.season.number === 1 && next.episode === 1 && !state.started,
    title,
  };
  return <EpisodeCard ep={model} {...nav} onCheck={() => markEpisodes(franchise, [{ seasonId: next.season.anime.id, episode: next.episode }], true)} />;
}

type Item = { type: 'chip'; label: string; grid?: boolean } | { type: 'card'; state: ShowState };

function Watchlist({ scrollRef, ...nav }: { scrollRef: React.RefObject<HTMLDivElement | null> } & Nav) {
  const lib = useLibrary();
  const navigate = useNavigate();
  const items = useMemo<Item[]>(() => {
    const open = lib.shows.filter((s) => s.follow.status === 'active' && s.next);
    const started = open.filter((s) => s.started).sort((a, b) => (b.follow.lastWatchedAt ?? 0) - (a.follow.lastWatchedAt ?? 0));
    const fresh = open.filter((s) => !s.started).sort((a, b) => b.follow.addedAt - a.follow.addedAt);
    const out: Item[] = [];
    if (started.length) out.push({ type: 'chip', label: 'A voir', grid: true }, ...started.map((state): Item => ({ type: 'card', state })));
    if (fresh.length) out.push({ type: 'chip', label: 'Pas commencé', grid: !started.length }, ...fresh.map((state): Item => ({ type: 'card', state })));
    return out;
  }, [lib.shows]);

  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (items[i]?.type === 'chip' ? 44 : layout.episodeCardHeight + layout.episodeCardGap),
    getItemKey: (i) => {
      const it = items[i]!;
      return it.type === 'chip' ? `chip-${it.label}` : `show-${it.state.follow.showId}`;
    },
    overscan: 6,
  });

  if (lib.ready && lib.shows.length === 0)
    return (
      <div className="px-8 pt-24 text-center">
        <p className="text-[16px] font-bold text-ink">Aucun anime suivi</p>
        <p className="mt-2 text-[13px] text-ink-3">Ajoute des animes depuis l’onglet Découvrir pour voir ici le prochain épisode à regarder.</p>
        <button onClick={() => navigate('/decouvrir')} className="mt-5 h-11 rounded-card bg-yellow px-6 text-[13px] font-extrabold uppercase tracking-wider text-black">Découvrir</button>
      </div>
    );

  return (
    <div className="pb-4">
      <div className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((vi) => {
          const it = items[vi.index]!;
          return (
            <div key={vi.key} className="absolute inset-x-0 top-0 px-page" style={{ transform: `translateY(${vi.start}px)`, height: vi.size }}>
              {it.type === 'chip' ? <ChipRow label={it.label} withGrid={it.grid} /> : <WatchRow state={it.state} {...nav} />}
            </div>
          );
        })}
      </div>
      {lib.pending > 0 && (
        <div className="flex flex-col px-page" style={{ gap: layout.episodeCardGap }}>
          {Array.from({ length: Math.min(lib.pending, 3) }, (_, i) => <Skeleton key={i} />)}
        </div>
      )}
      {lib.ready && lib.pending === 0 && lib.shows.length > 0 && items.length === 0 && (
        <p className="px-8 pt-24 text-center text-[13px] text-ink-3">Tout est à jour. Les prochains épisodes sont dans « À venir ».</p>
      )}
    </div>
  );
}

const dayKey = (ts: number) => new Date(ts * 1000).toDateString();
const dayLabel = (ts: number) => new Date(ts * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

function Upcoming(nav: Nav) {
  const showTitle = useShowTitle();
  const lib = useLibrary();
  const watched = useMemo(() => new Set(lib.watched.map((w) => epKey(w.seasonId, w.episode))), [lib.watched]);

  // mediaId → (franchise, saison) des séries actives encore en diffusion / annoncées.
  const lookup = useMemo(() => {
    const m = new Map<number, { f: Franchise; seasonIdx: number }>();
    lib.shows.forEach((s) => {
      if (s.follow.status !== 'active' || !s.franchise) return;
      s.franchise.seasons.forEach((se, i) => (se.anime.status === 'RELEASING' || se.anime.status === 'NOT_YET_RELEASED') && m.set(se.anime.id, { f: s.franchise!, seasonIdx: i }));
    });
    return m;
  }, [lib.shows]);
  const ids = useMemo(() => [...lookup.keys()], [lookup]);
  const airing = useAiring(ids, 30);

  const groups = useMemo(() => {
    const g = new Map<string, { label: string; items: { model: EpisodeCardModel; f: Franchise; airingAt: number }[] }>();
    for (const a of airing.data ?? []) {
      const hit = lookup.get(a.mediaId);
      if (!hit) continue;
      const season = hit.f.seasons[hit.seasonIdx]!;
      const k = dayKey(a.airingAt);
      const grp = g.get(k) ?? { label: dayLabel(a.airingAt), items: [] };
      grp.items.push({
        f: hit.f,
        airingAt: a.airingAt,
        model: {
          key: `${a.mediaId}-${a.episode}`,
          showId: hit.f.rootId,
          seasonId: a.mediaId,
          showTitle: showTitle(hit.f),
          poster: season.anime.coverLarge,
          color: season.anime.color,
          season: season.number,
          episode: a.episode,
          isNew: a.episode === 1,
          title: null,
        },
      });
      g.set(k, grp);
    }
    return [...g.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airing.data, lookup]);

  const loading = !lib.ready || lib.pending > 0 || (ids.length > 0 && airing.isLoading);
  return (
    <div className="pb-4">
      <div className="flex h-[44px] items-center justify-end px-page"><IconGrid size={24} /></div>
      {groups.map((g) => (
        <Fragment key={g.label}>
          <div className="flex h-[44px] items-center justify-center"><SectionChip>{g.label}</SectionChip></div>
          <div className="flex flex-col px-page" style={{ gap: 12 }}>
            {g.items.map(({ model, f, airingAt }) => (
              <EpisodeCard
                key={model.key}
                ep={model}
                compact
                {...nav}
                locked={airingAt * 1000 > Date.now()}
                checked={watched.has(epKey(model.seasonId, model.episode))}
                onCheck={() => toggleEpisode(f, model.seasonId, model.episode, watched)}
              />
            ))}
          </div>
        </Fragment>
      ))}
      {loading && (
        <div className="flex flex-col px-page pt-3" style={{ gap: 12 }}><Skeleton compact /><Skeleton compact /></div>
      )}
      {!loading && groups.length === 0 && <p className="px-8 py-24 text-center text-[13px] text-ink-3">Aucun épisode à venir dans les 30 prochains jours pour les animes que tu suis.</p>}
    </div>
  );
}

export function ShowsScreen(nav: Nav) {
  const tab = useUi((s) => s.showsTab);
  const setTab = useUi((s) => s.setShowsTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="bg-header" style={{ paddingTop: 'var(--safe-top)' }}>
        <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>
      <div ref={scrollRef} className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 8px)' }}>
        {tab === 'watchlist' ? <Watchlist scrollRef={scrollRef} {...nav} /> : <Upcoming {...nav} />}
      </div>
    </div>
  );
}
