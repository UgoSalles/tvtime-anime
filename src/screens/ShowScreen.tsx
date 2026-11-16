import { useMemo, useState } from 'react';
import { m as motion } from 'framer-motion';
import { CheckButton } from '../components/CheckButton';
import { IconChevronDown, IconMore, IconShare } from '../components/Icons';
import { Poster } from '../components/Poster';
import { PosterRow } from '../components/PosterRow';
import { TopTabs } from '../components/TopTabs';
import { useAnimeDetail, useEpisodeList, useFranchise } from '../api/hooks';
import { EPISODES_PER_PAGE } from '../api/episodes';
import type { AnimeDetail, Franchise, FranchiseSeason } from '../api/types';
import { stripSeasonSuffix, useTitle } from '../lib/titles';
import { useFrench } from '../api/translate';
import { genreFr } from '../lib/genres';
import { seasonCount, seasonGroups, shownEpisode } from '../lib/seasons';
import { layout } from '../theme';
import { useFollowOf, useListsOfShow, useLists, useWatchedMap, type WatchMap } from '../db/hooks';
import { addToList, allAired, airedOf, createList, ensureFollow, epKey, markEpisodes, removeFromList, setDropped, setLater, toggleFavorite, unfollow } from '../db/repo';
import { toggleAll, toggleEpisode, toggleSeason } from '../db/actions';
import { openActions, useSheet } from '../store/sheet';

type Tab = 'about' | 'episodes';

const STATUS: Record<string, string> = {
  FINISHED: 'Terminé',
  RELEASING: 'En cours de diffusion',
  NOT_YET_RELEASED: 'Pas encore diffusé',
  CANCELLED: 'Annulé',
  HIATUS: 'En pause',
};
const SEASON: Record<string, string> = { WINTER: 'Hiver', SPRING: 'Printemps', SUMMER: 'Été', FALL: 'Automne' };
const FORMAT: Record<string, string> = { TV: 'Série TV', TV_SHORT: 'Série courte', ONA: 'ONA', MOVIE: 'Film', OVA: 'OVA', SPECIAL: 'Spécial', MUSIC: 'Clip' };

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
const stripHtml = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s*\((?:Source|Written by)[^)]*\)\s*$/i, '')
    .trim();

function SeasonEpisodes({ season, franchise, onOpenEpisode, watched }: {
  season: FranchiseSeason;
  franchise: Franchise;
  onOpenEpisode: (seasonId: number, ep: number) => void;
  watched: WatchMap;
}) {
  const [page, setPage] = useState(1);
  const q = useEpisodeList(franchise, season, page);
  const data = q.data;
  // Images d'épisode réelles uniquement : pas d'image de remplacement. Si aucun épisode n'en a, on n'affiche que le numéro.
  const withImages = !!data?.episodes.some((e) => e.thumbnail) || q.thumbsLoading;
  if (!data) return <p className="px-4 py-4 text-[13px] text-ink-3">Épisodes indisponibles (hors-ligne ?).</p>;
  return (
    <div className="border-t border-divider">
      {season.part && <p className="bg-chip px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-chip-text">Partie {season.part}</p>}
      {q.isPlaceholder && <p className="px-4 py-1.5 text-[11px] text-ink-3">Chargement des titres…</p>}
      {data.degraded && !q.isPlaceholder && <p className="bg-chip px-4 py-2 text-[11px] text-ink-3">Titres et dates indisponibles pour le moment (numérotation seule).</p>}
      {data.pageCount > 1 && (
        <div className="scroll-x flex gap-2 px-4 py-2">
          {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`h-7 shrink-0 rounded-full px-3 text-[11px] font-bold ${p === page ? 'bg-yellow text-black' : 'bg-chip text-chip-text'}`}>
              {(p - 1) * EPISODES_PER_PAGE + 1}–{Math.min(data.total, p * EPISODES_PER_PAGE)}
            </button>
          ))}
        </div>
      )}
      {data.episodes.map((e) => {
        const info = watched.get(epKey(season.anime.id, e.number));
        const unaired = e.number > (season.aired ?? 0);
        return (
          <div
            key={e.number}
            role="button"
            tabIndex={0}
            onClick={() => onOpenEpisode(season.anime.id, e.number)}
            onKeyDown={(k) => k.key === 'Enter' && onOpenEpisode(season.anime.id, e.number)}
            className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 74px' }}
          >
            {withImages ? (
              e.thumbnail ? (
                <Poster title="" src={e.thumbnail} color={season.anime.color} showTitle={false} className="h-[54px] w-24 shrink-0 rounded-[4px]">
                  <span className="absolute bottom-0 left-0 rounded-tr-[4px] bg-black/70 px-1.5 text-[11px] font-bold leading-[16px] text-white">{shownEpisode(season, e.number)}</span>
                </Poster>
              ) : (
                <span className="grid h-[54px] w-24 shrink-0 place-items-center rounded-[4px] bg-chip text-[15px] font-bold text-chip-text">{shownEpisode(season, e.number)}</span>
              )
            ) : (
              <span className="w-8 shrink-0 text-center text-[15px] font-bold text-ink-3">{shownEpisode(season, e.number)}</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-ink">{e.title ?? `Épisode ${shownEpisode(season, e.number)}`}</span>
              <span className="block truncate text-[11px] text-ink-3">
                {[fmtDate(e.aired), season.offset > 0 ? `E${season.offset + e.number}` : null, e.filler ? 'Filler' : null, (info?.count ?? 1) > 1 ? `Vu ×${info!.count}` : null].filter(Boolean).join(' · ')}
              </span>
            </span>
            <div className={unaired ? 'opacity-40' : ''}>
              <CheckButton checked={!!info} onToggle={() => !unaired && toggleEpisode(franchise, season.anime.id, e.number, watched)} size={30} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeasonSynopsis({ text: source }: { text: string }) {
  const [more, setMore] = useState(false);
  const text = useFrench(source) ?? source;
  return (
    <div className="border-t border-divider px-4 py-3">
      <p className={`whitespace-pre-line text-[13px] leading-[19px] text-ink-2 ${more ? '' : 'line-clamp-3'}`}>{text}</p>
      {text.length > 160 && <button onClick={() => setMore((m) => !m)} className="mt-1 text-[11px] font-bold uppercase text-blue">{more ? 'Réduire' : 'Lire la suite'}</button>}
    </div>
  );
}

function EpisodesTab({ franchise, watched, onOpenEpisode }: { franchise: Franchise; watched: WatchMap; onOpenEpisode: (seasonId: number, ep: number) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const t = useTitle();

  // Prochain épisode : premier diffusé et non vu.
  const next = useMemo(() => {
    for (const s of franchise.seasons) for (const e of airedOf(s)) if (!watched.has(epKey(e.seasonId, e.episode))) return { season: s, episode: e.episode };
    return null;
  }, [franchise, watched]);
  const nextEps = useEpisodeList(franchise, next?.season, Math.ceil((next?.episode ?? 1) / 100), !!next);
  const nextInfo = nextEps.data?.episodes.find((e) => e.number === next?.episode);

  const everything = allAired(franchise);
  const allDone = everything.length > 0 && everything.every((e) => watched.has(epKey(e.seasonId, e.episode)));

  return (
    <div className="pb-10">
      {next && (
        <>
          <div className="py-4 text-center text-section-chip uppercase text-ink-2">À voir ensuite</div>
          <div className="px-page">
            <button onClick={() => onOpenEpisode(next.season.anime.id, next.episode)} className="block w-full text-left">
              <Poster title="" src={nextInfo?.thumbnailLarge ?? nextInfo?.thumbnail} color={next.season.anime.color} showTitle={false} className="h-[88px] w-full rounded-card">
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[12px] font-bold text-white">
                  S{String(next.season.number).padStart(2, '0')} | E{String(shownEpisode(next.season, next.episode)).padStart(2, '0')} · {nextInfo?.title ?? `Épisode ${shownEpisode(next.season, next.episode)}`}
                </span>
              </Poster>
            </button>
          </div>
        </>
      )}
      <div className="flex items-center justify-between px-page py-4">
        <span className="text-section-chip uppercase text-ink-2">Tous les épisodes</span>
        <CheckButton checked={allDone} onToggle={() => toggleAll(franchise, watched)} size={26} />
      </div>
      <div className="flex flex-col gap-2.5 px-page">
        {seasonGroups(franchise).map(({ number, parts }) => {
          const s = parts[0]!;
          const aired = parts.reduce((n, p) => n + (p.aired ?? 0), 0);
          const total = parts.reduce((n, p) => n + (p.anime.episodes ?? p.aired ?? 0), 0);
          const done = parts.flatMap(airedOf).filter((e) => watched.has(epKey(e.seasonId, e.episode))).length;
          const ratio = total ? done / total : 0;
          const complete = aired > 0 && done === aired;
          const isOpen = open === number;
          return (
            <div key={number} className="shadow-card overflow-hidden rounded-card bg-surface">
              <div className="flex min-h-[62px] items-center px-4 py-2.5" role="button" tabIndex={0} onClick={() => setOpen(isOpen ? null : number)}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center">
                    <span className="text-[20px] font-bold leading-6 text-ink">Saison {number}</span>
                    <IconChevronDown size={16} className={`ml-2 shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                  <span className="block truncate text-[12px] font-medium text-ink-3">
                    {t(s.anime.title)}
                    {(s.anime.seasonYear ?? s.anime.startDate?.year) ? ` (${s.anime.seasonYear ?? s.anime.startDate?.year})` : ''}
                    {parts.length > 1 ? ` · ${parts.length} parties` : ''}
                  </span>
                </span>
                <span className="ml-3 mr-3 text-[14px] font-medium text-ink-3">{done}/{total || '?'}</span>
                <CheckButton checked={complete} onToggle={() => toggleSeason(franchise, parts, watched)} size={34} />
              </div>
              <div className="h-1 w-full bg-progress-track">
                <motion.div className="h-full bg-green" initial={false} animate={{ width: `${ratio * 100}%` }} transition={{ duration: 0.3 }} />
              </div>
              {isOpen && s.anime.description && <SeasonSynopsis text={stripHtml(s.anime.description)} />}
              {isOpen && parts.map((p) => <SeasonEpisodes key={p.anime.id} season={p} franchise={franchise} onOpenEpisode={onOpenEpisode} watched={watched} />)}
            </div>
          );
        })}
      </div>
      {franchise.extras.length > 0 && (
        <div className="px-page pt-6">
          <h3 className="mb-2 text-section-chip uppercase text-ink-2">Films, OVA et spéciaux</h3>
          <ul className="divide-y divide-divider rounded-card bg-surface shadow-card">
            {franchise.extras.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-[13px] text-ink">
                <span className="truncate pr-3">{t(a.title)}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{FORMAT[a.format ?? ''] ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AboutTab({ detail, onOpenShow }: { detail: AnimeDetail; onOpenShow: (id: number) => void }) {
  const [more, setMore] = useState(false);
  const desc = useFrench(detail.description ? stripHtml(detail.description) : null);
  const rows: [string, string | null][] = [
    ['Format', FORMAT[detail.format ?? ''] ?? null],
    ['Statut', STATUS[detail.status ?? ''] ?? null],
    ['Épisodes', detail.episodes ? `${detail.episodes}${detail.duration ? ` × ${detail.duration} min` : ''}` : null],
    ['Diffusion', detail.season && detail.seasonYear ? `${SEASON[detail.season]} ${detail.seasonYear}` : detail.startDate?.year ? String(detail.startDate.year) : null],
    ['Studio', detail.studios.join(', ') || null],
    ['Note', detail.averageScore ? `${(detail.averageScore / 10).toFixed(1)} / 10` : null],
  ];
  return (
    <div className="pb-10">
      {desc && (
        <section className="px-page pt-5">
          <p className={`whitespace-pre-line text-[14px] leading-[21px] text-ink ${more ? '' : 'line-clamp-5'}`}>{desc}</p>
          <button onClick={() => setMore((m) => !m)} className="mt-1 text-[12px] font-bold uppercase text-blue">{more ? 'Réduire' : 'Lire la suite'}</button>
        </section>
      )}
      <section className="mt-5 px-page">
        <div className="divide-y divide-divider rounded-card bg-surface shadow-card">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3 text-[13px]">
              <span className="text-ink-3">{k}</span>
              <span className="text-right font-semibold text-ink">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.genres.map((g) => <span key={g} className="rounded-full bg-chip px-3 py-1 text-[11px] font-bold uppercase text-chip-text">{genreFr(g)}</span>)}
        </div>
      </section>
      {detail.characters.length > 0 && (
        <section className="mt-6">
          <h3 className="px-page text-[20px] font-bold text-ink">Personnages</h3>
          <div className="scroll-x mt-3 flex gap-3 px-page">
            {detail.characters.map((c) => (
              <div key={c.id} className="w-[84px] shrink-0 text-center">
                <Poster title={c.name} src={c.image} color="#888" showTitle={false} className="h-[84px] w-[84px] rounded-full" />
                <div className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-ink">{c.name}</div>
                <div className="text-[10px] uppercase text-ink-3">{c.role === 'MAIN' ? 'Principal' : 'Secondaire'}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      {detail.recommendations.length > 0 && <PosterRow title="Similaires" items={detail.recommendations} onOpen={onOpenShow} />}
    </div>
  );
}


/** Menu ⋮ de la fiche : favori, listes, tout marquer, arrêter, ne plus suivre. */
function openMenu(f: Franchise, follow: Awaited<ReturnType<typeof ensureFollow>> | null, lists: { id?: number; name: string }[], inLists: Set<number>) {
  const aired = allAired(f);
  const actions = [];
  if (follow) {
    actions.push({ label: follow.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris', onClick: () => toggleFavorite(f.rootId) });
  }
  actions.push({
    label: 'Ajouter à une liste…',
    onClick: () =>
      openActions('Listes', [
        ...lists.map((l) => ({
          label: `${inLists.has(l.id!) ? '✓ ' : ''}${l.name}`,
          onClick: async () => {
            await ensureFollow(f);
            return inLists.has(l.id!) ? removeFromList(l.id!, f.rootId) : addToList(l.id!, f.rootId);
          },
        })),
        {
          label: 'Nouvelle liste…',
          onClick: () =>
            useSheet.getState().open({
              kind: 'prompt',
              title: 'Nouvelle liste',
              placeholder: 'Nom de la liste',
              submitLabel: 'Créer',
              onSubmit: async (name) => {
                const id = (await createList(name)) as number;
                await ensureFollow(f);
                await addToList(id, f.rootId);
              },
            }),
        },
      ]),
  });
  actions.push({ label: 'Tout marquer comme vu', onClick: () => markEpisodes(f, aired, true) });
  actions.push({ label: 'Tout démarquer', onClick: () => markEpisodes(f, aired, false), destructive: true });
  if (follow) {
    if (follow.status !== 'dropped') actions.push({ label: follow.later ? 'Retirer de « À regarder plus tard »' : 'Mettre dans « À regarder plus tard »', onClick: () => setLater(f.rootId, !follow.later) });
    actions.push({ label: follow.status === 'dropped' ? 'Reprendre le suivi' : 'Arrêter de regarder', onClick: () => setDropped(f.rootId, follow.status !== 'dropped') });
    actions.push({ label: 'Ne plus suivre', onClick: () => unfollow(f.rootId), destructive: true });
  }
  openActions(undefined, actions);
}

/**
 * Fiche série (franchise = une série, plusieurs saisons). Structure d'après q.jpeg / c.jpeg / m.jpeg
 * (versions anciennes). L'onglet « À propos » n'est sur aucune capture (SPEC §4.5) : construit à
 * partir des composants existants. Les coches sont locales jusqu'à la phase 4.
 */
export function ShowScreen({ showId, onBack, onOpenShow, onOpenEpisode }: {
  showId: number;
  onBack: () => void;
  onOpenShow: (id: number) => void;
  onOpenEpisode: (seasonId: number, ep: number) => void;
}) {
  const t = useTitle();
  const [tab, setTab] = useState<Tab>('episodes');
  const franchise = useFranchise(showId);
  const follow = useFollowOf(showId);
  const watched = useWatchedMap(follow?.showId ?? franchise.data?.rootId ?? showId);
  const lists = useLists();
  const inLists = useListsOfShow(franchise.data?.rootId);
  const root = franchise.data?.seasons[0]?.anime;
  const detail = useAnimeDetail(root?.id ?? showId);
  const a = detail.data ?? root;
  const title = useMemo(() => (root ? stripSeasonSuffix(t(root.title)) : ''), [root, t]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="scroll-y min-h-0 flex-1">
        <div className="relative" style={{ height: layout.bannerHeight + 60 }}>
          <Poster title="" src={a?.banner ?? a?.coverLarge} color={a?.color ?? '#333'} showTitle={false} className="absolute inset-0" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0) 40%, rgba(0,0,0,0.65))' }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 text-white" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
            <button aria-label="Retour" onClick={onBack} className="grid h-9 w-9 place-items-center"><IconChevronDown size={26} /></button>
            <div className="flex items-center gap-1">
              <button aria-label="Partager" className="grid h-9 w-9 place-items-center"><IconShare size={22} /></button>
              <button aria-label="Plus" disabled={!franchise.data} onClick={() => franchise.data && openMenu(franchise.data, follow ?? null, lists ?? [], new Set((inLists ?? []).map((i) => i.listId)))} className="grid h-9 w-9 place-items-center"><IconMore size={22} /></button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-page pb-4 text-white">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-7">{title || ' '}</h1>
              {franchise.data && (
                <p className="mt-0.5 text-[13px] font-medium text-white/85">
                  {seasonCount(franchise.data)} saison{seasonCount(franchise.data) > 1 ? 's' : ''}
                  {franchise.data.seasons.at(-1)?.anime.status ? ` · ${STATUS[franchise.data.seasons.at(-1)!.anime.status!]}` : ''}
                </p>
              )}
            </div>
            <button
              disabled={!franchise.data}
              onClick={async () => (follow ? unfollow(follow.showId) : franchise.data && (await ensureFollow(franchise.data)))}
              className={`inline-flex h-[30px] shrink-0 items-center rounded-card px-3 text-[12px] font-bold ${follow ? 'bg-green text-white' : 'bg-yellow text-black'}`}
            >
              {follow ? '✓ Suivi' : '+ Suivre'}
            </button>
          </div>
        </div>

        <TopTabs
          tabs={[{ id: 'about' as Tab, label: 'À propos' }, { id: 'episodes' as Tab, label: 'Épisodes' }]}
          active={tab}
          onChange={setTab}
        />

        {franchise.isError ? (
          <p className="px-page py-10 text-center text-[13px] text-ink-3">Impossible de charger cette série (hors-ligne ?).</p>
        ) : tab === 'about' ? (
          detail.data ? <AboutTab detail={detail.data} onOpenShow={onOpenShow} /> : <p className="px-page py-10 text-center text-[13px] text-ink-3">Chargement…</p>
        ) : franchise.data ? (
          <EpisodesTab franchise={franchise.data} watched={watched ?? new Map()} onOpenEpisode={onOpenEpisode} />
        ) : (
          <div className="space-y-2.5 px-page py-6">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[66px] animate-pulse rounded-card bg-surface" />)}</div>
        )}
      </div>
    </div>
  );
}
