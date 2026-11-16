import { Fragment, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TopTabs } from '../components/TopTabs';
import { SectionChip } from '../components/Chips';
import { EpisodeCard, type EpisodeCardModel } from '../components/EpisodeCard';
import { IconGrid, IconRefresh } from '../components/Icons';
import { useAiring, useSeasonEpisodes } from '../api/hooks';
import type { Franchise } from '../api/types';
import { markEpisodes, epKey } from '../db/repo';
import { toggleEpisode } from '../db/actions';
import type { WatchMap } from '../db/hooks';
import { stripSeasonSuffix, useTitle } from '../lib/titles';
import { shownEpisode } from '../lib/seasons';
import { bucketOf, useLibrary, type Bucket, type ShowState } from '../lib/library';
import { buildUpcoming, upcomingSeasons, type UpcomingKind } from '../lib/upcoming';
import { db } from '../lib/db';
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
    shown: shownEpisode(next.season, next.episode),
    absolute: next.absolute !== next.episode ? next.absolute : undefined,
    behind: state.behind || undefined,
    premiere: next.absolute === 1 && !state.started,
    title,
  };
  return <EpisodeCard ep={model} {...nav} onCheck={() => markEpisodes(franchise, [{ seasonId: next.season.anime.id, episode: next.episode }], true)} />;
}

type Item = { type: 'chip'; label: string; grid?: boolean } | { type: 'card'; state: ShowState };

function Watchlist({ scrollRef, ...nav }: { scrollRef: React.RefObject<HTMLDivElement | null> } & Nav) {
  const lib = useLibrary();
  const navigate = useNavigate();
  const items = useMemo<Item[]>(() => {
    const now = Date.now();
    const byBucket = new Map<Bucket, ShowState[]>();
    for (const s of lib.shows) {
      if (!s.next) continue;
      const b = bucketOf(s, now);
      if (b === 'dropped' || b === 'completed') continue;
      byBucket.set(b, [...(byBucket.get(b) ?? []), s]);
    }
    const recent = (a: ShowState, b: ShowState) => (b.follow.lastWatchedAt ?? b.follow.addedAt) - (a.follow.lastWatchedAt ?? a.follow.addedAt);
    const SECTIONS: { id: Bucket; label: string }[] = [
      { id: 'watching', label: 'En cours' },
      { id: 'notstarted', label: 'Pas commencé' },
      { id: 'stale', label: 'Pas regardé depuis un moment' },
      { id: 'later', label: 'À regarder plus tard' },
    ];
    const out: Item[] = [];
    for (const sec of SECTIONS) {
      const list = (byBucket.get(sec.id) ?? []).sort(sec.id === 'notstarted' ? (a, b) => b.follow.addedAt - a.follow.addedAt : recent);
      if (!list.length) continue;
      out.push({ type: 'chip', label: sec.label, grid: !out.length }, ...list.map((state): Item => ({ type: 'card', state })));
    }
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
      {lib.error && (
        <div className="px-8 pt-24 text-center">
          <p className="text-[14px] font-bold text-ink">Chargement impossible</p>
          <p className="mt-2 text-[12px] text-ink-3">AniList limite le nombre de requêtes ou le réseau est coupé. Réessaie dans une minute.</p>
          <button onClick={lib.retry} className="mt-4 h-10 rounded-card bg-yellow px-5 text-[12px] font-extrabold uppercase tracking-wider text-black">Réessayer</button>
        </div>
      )}
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

const dayKey = (ms: number) => new Date(ms).toDateString();
const dayLabel = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
const HINT: Record<UpcomingKind, string | null> = { scheduled: null, estimated: 'Sortie estimée', announced: 'Nouvelle saison · date annoncée' };

function Upcoming(nav: Nav) {
  const showTitle = useShowTitle();
  const lib = useLibrary();
  const qc = useQueryClient();
  const watched = useMemo<WatchMap>(() => new Map(lib.watched.map((w) => [epKey(w.seasonId, w.episode), { at: w.watchedAt, count: w.count ?? 1 }])), [lib.watched]);

  const lookup = useMemo(() => upcomingSeasons(lib.shows), [lib.shows]);
  const ids = useMemo(() => [...lookup.keys()], [lookup]);
  const airing = useAiring(ids);

  const { groups, undated } = useMemo(() => {
    const { dated, undated } = buildUpcoming(lookup, airing.data ?? []);
    const g = new Map<string, { label: string; items: { model: EpisodeCardModel; f: Franchise; at: number }[] }>();
    for (const it of dated) {
      const k = dayKey(it.at);
      const grp = g.get(k) ?? { label: dayLabel(it.at), items: [] };
      grp.items.push({
        f: it.f,
        at: it.at,
        model: {
          key: it.key,
          showId: it.f.rootId,
          seasonId: it.season.anime.id,
          showTitle: showTitle(it.f),
          poster: it.season.anime.coverLarge,
          color: it.season.anime.color,
          season: it.season.number,
          episode: it.episode,
          shown: shownEpisode(it.season, it.episode),
          isNew: shownEpisode(it.season, it.episode) === 1,
          title: HINT[it.kind],
        },
      });
      g.set(k, grp);
    }
    return { groups: [...g.values()], undated };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airing.data, lookup]);

  const loading = !lib.ready || lib.pending > 0 || (ids.length > 0 && airing.isLoading);
  const refreshing = airing.isFetching || qc.isFetching({ queryKey: ['franchise'] }) > 0;
  // Actualiser = jeter le cache du calendrier et des franchises suivies (nouvelles saisons annoncées) puis recharger.
  const refresh = async () => {
    const keys = (await db.apiCache.toCollection().primaryKeys()).filter((k) => /^(airing2|franchise6):/.test(String(k)));
    await db.apiCache.bulkDelete(keys);
    await qc.invalidateQueries({ queryKey: ['franchise'] });
    await qc.invalidateQueries({ queryKey: ['airing'] });
  };

  return (
    <div className="pb-4">
      <div className="flex h-[44px] items-center justify-between px-page">
        <button aria-label="Actualiser le calendrier" onClick={refresh} className={`grid h-8 w-8 place-items-center text-ink ${refreshing ? 'animate-spin' : ''}`}>
          <IconRefresh size={22} />
        </button>
        <IconGrid size={24} />
      </div>
      {groups.map((g) => (
        <Fragment key={g.label}>
          <div className="flex h-[44px] items-center justify-center"><SectionChip>{g.label}</SectionChip></div>
          <div className="flex flex-col px-page" style={{ gap: 12 }}>
            {g.items.map(({ model, f, at }) => (
              <EpisodeCard
                key={model.key}
                ep={model}
                compact
                {...nav}
                locked={at > Date.now()}
                checked={watched.has(epKey(model.seasonId, model.episode))}
                onCheck={() => toggleEpisode(f, model.seasonId, model.episode, watched)}
              />
            ))}
          </div>
        </Fragment>
      ))}
      {undated.length > 0 && (
        <>
          <div className="mt-2 flex h-[44px] items-center justify-center"><SectionChip>Prochainement</SectionChip></div>
          <div className="flex flex-col px-page" style={{ gap: 12 }}>
            {undated.map((u) => (
              <EpisodeCard
                key={u.key}
                compact
                {...nav}
                locked
                checked={false}
                onCheck={() => undefined}
                ep={{
                  key: u.key,
                  showId: u.f.rootId,
                  seasonId: u.season.anime.id,
                  showTitle: showTitle(u.f),
                  poster: u.season.anime.coverLarge,
                  color: u.season.anime.color,
                  season: u.season.number,
                  episode: 1,
                  shown: shownEpisode(u.season, 1),
                  isNew: !u.season.partOffset,
                  title: `${u.season.partOffset ? `Suite de la saison ${u.season.number}` : 'Nouvelle saison'} · ${u.label}`,
                }}
              />
            ))}
          </div>
        </>
      )}
      {loading && (
        <div className="flex flex-col px-page pt-3" style={{ gap: 12 }}><Skeleton compact /><Skeleton compact /></div>
      )}
      {!loading && groups.length === 0 && undated.length === 0 && (
        <p className="px-8 py-24 text-center text-[13px] text-ink-3">Aucun épisode programmé pour les animes que tu suis.</p>
      )}
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
