import { Fragment, useMemo } from 'react';
import { TopTabs } from '../components/TopTabs';
import { SectionChip } from '../components/Chips';
import { EpisodeCard, type EpisodeCardModel } from '../components/EpisodeCard';
import { IconGrid } from '../components/Icons';
import { useAiring, useSeasonEpisodes } from '../api/hooks';
import { stripSeasonSuffix, useTitle } from '../lib/titles';
import { computeEntry, useFollowFranchises, type WatchEntry } from '../lib/watchlist';
import { demoFollows } from '../data/demoFollows';
import { useUi, type ShowsTab } from '../store/ui';
import { layout } from '../theme';
import type { Franchise } from '../api/types';

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

function WatchRow({ entry, ...nav }: { entry: WatchEntry } & Nav) {
  const showTitle = useShowTitle();
  const { next, franchise } = entry;
  const eps = useSeasonEpisodes(next.season, Math.ceil(next.episode / 100));
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
    behind: entry.behind || undefined,
    premiere: next.season.number === 1 && next.episode === 1,
    title,
  };
  return <EpisodeCard ep={model} {...nav} />;
}

function Watchlist(nav: Nav) {
  const results = useFollowFranchises(demoFollows);
  const entries = useMemo(
    () =>
      results.map((r, i) => (r.data ? computeEntry(demoFollows[i]!, r.data) : undefined)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((r) => r.dataUpdatedAt).join()],
  );
  const pending = results.filter((r) => r.isLoading).length;
  const started = entries.filter((e): e is WatchEntry => !!e && e.started);
  const notStarted = entries.filter((e): e is WatchEntry => !!e && !e.started);

  return (
    <div className="pb-4">
      <ChipRow label="A voir" withGrid />
      <div className="flex flex-col px-page" style={{ gap: layout.episodeCardGap }}>
        {started.map((e) => (
          <WatchRow key={e.follow.id} entry={e} {...nav} />
        ))}
        {pending > 0 && Array.from({ length: Math.min(pending, 3) }, (_, i) => <Skeleton key={i} />)}
      </div>
      {notStarted.length > 0 && (
        <>
          <div className="mt-2">
            <ChipRow label="Pas commencé" />
          </div>
          <div className="flex flex-col px-page" style={{ gap: layout.episodeCardGap }}>
            {notStarted.map((e) => (
              <WatchRow key={e.follow.id} entry={e} {...nav} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const dayKey = (ts: number) => new Date(ts * 1000).toDateString();
const dayLabel = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

function Upcoming(nav: Nav) {
  const showTitle = useShowTitle();
  const results = useFollowFranchises(demoFollows);
  const franchises = results.map((r) => r.data).filter((f): f is Franchise => !!f);
  // mediaId → (franchise, saison) pour les entrées encore en diffusion / annoncées.
  const lookup = useMemo(() => {
    const m = new Map<number, { f: Franchise; seasonIdx: number }>();
    franchises.forEach((f) => f.seasons.forEach((s, i) => (s.anime.status === 'RELEASING' || s.anime.status === 'NOT_YET_RELEASED') && m.set(s.anime.id, { f, seasonIdx: i })));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((r) => r.dataUpdatedAt).join()]);
  const ids = useMemo(() => [...lookup.keys()], [lookup]);
  const airing = useAiring(ids, 30);

  const groups = useMemo(() => {
    const g = new Map<string, { label: string; items: EpisodeCardModel[] }>();
    for (const a of airing.data ?? []) {
      const hit = lookup.get(a.mediaId);
      if (!hit) continue;
      const season = hit.f.seasons[hit.seasonIdx]!;
      const k = dayKey(a.airingAt);
      const grp = g.get(k) ?? { label: dayLabel(a.airingAt), items: [] };
      grp.items.push({
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
      });
      g.set(k, grp);
    }
    return [...g.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airing.data, lookup]);

  const loading = results.some((r) => r.isLoading) || airing.isLoading;
  return (
    <div className="pb-4">
      <div className="flex h-[44px] items-center justify-end px-page">
        <IconGrid size={24} />
      </div>
      {groups.map((g) => (
        <Fragment key={g.label}>
          <div className="flex h-[44px] items-center justify-center">
            <SectionChip>{g.label}</SectionChip>
          </div>
          <div className="flex flex-col px-page" style={{ gap: 12 }}>
            {g.items.map((ep) => (
              <EpisodeCard key={ep.key} ep={ep} compact {...nav} />
            ))}
          </div>
        </Fragment>
      ))}
      {loading && (
        <div className="flex flex-col px-page pt-3" style={{ gap: 12 }}>
          <Skeleton compact />
          <Skeleton compact />
        </div>
      )}
      {!loading && groups.length === 0 && <p className="px-page py-10 text-center text-[13px] text-ink-3">Aucun épisode à venir dans les 30 prochains jours.</p>}
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
