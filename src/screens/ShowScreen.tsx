import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckButton } from '../components/CheckButton';
import { IconChevronDown, IconMore, IconShare } from '../components/Icons';
import { Poster } from '../components/Poster';
import { PosterRow } from '../components/PosterRow';
import { TopTabs } from '../components/TopTabs';
import { useAnimeDetail, useFranchise, useSeasonEpisodes } from '../api/hooks';
import { EPISODES_PER_PAGE } from '../api/episodes';
import type { AnimeDetail, Franchise, FranchiseSeason } from '../api/types';
import { stripSeasonSuffix, useTitle } from '../lib/titles';
import { layout } from '../theme';

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
const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

function SeasonEpisodes({ season, onOpenEpisode, watched, onToggle }: {
  season: FranchiseSeason;
  onOpenEpisode: (seasonId: number, ep: number) => void;
  watched: Set<number>;
  onToggle: (n: number) => void;
}) {
  const [page, setPage] = useState(1);
  const q = useSeasonEpisodes(season, page);
  if (q.isLoading) return <div className="space-y-px px-4 py-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded bg-chip" />)}</div>;
  const data = q.data;
  if (!data) return <p className="px-4 py-4 text-[13px] text-ink-3">Épisodes indisponibles (hors-ligne ?).</p>;
  return (
    <div className="border-t border-divider">
      {data.degraded && (
        <p className="bg-chip px-4 py-2 text-[11px] text-ink-3">Dates des épisodes indisponibles pour le moment ; titres issus d’AniList quand ils existent.</p>
      )}
      {data.pageCount > 1 && (
        <div className="scroll-x flex gap-2 px-4 py-2">
          {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`h-7 shrink-0 rounded-full px-3 text-[11px] font-bold ${p === page ? 'bg-yellow text-black' : 'bg-chip text-chip-text'}`}>
              {(p - 1) * EPISODES_PER_PAGE + 1}–{Math.min(data.total, p * EPISODES_PER_PAGE)}
            </button>
          ))}
        </div>
      )}
      {data.episodes.map((e) => (
        <div key={e.number} role="button" tabIndex={0} onClick={() => onOpenEpisode(season.anime.id, e.number)} onKeyDown={(k) => k.key === 'Enter' && onOpenEpisode(season.anime.id, e.number)} className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
          <span className="w-8 shrink-0 text-[13px] font-bold text-ink-3">{e.number}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">{e.title ?? `Épisode ${e.number}`}</span>
            <span className="block text-[11px] text-ink-3">
              {[fmtDate(e.aired), season.offset > 0 ? `E${season.offset + e.number}` : null, e.filler ? 'Filler' : null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <CheckButton checked={watched.has(e.number)} onToggle={() => onToggle(e.number)} size={30} />
        </div>
      ))}
    </div>
  );
}

function EpisodesTab({ franchise, onOpenEpisode }: { franchise: Franchise; onOpenEpisode: (seasonId: number, ep: number) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  // Cases cochées : état local jusqu'à la phase 4 (Dexie).
  const [watched, setWatched] = useState<Record<number, Set<number>>>({});
  const toggle = (sid: number, n: number) =>
    setWatched((w) => {
      const s = new Set(w[sid] ?? []);
      s.has(n) ? s.delete(n) : s.add(n);
      return { ...w, [sid]: s };
    });
  const first = franchise.seasons[0];
  const t = useTitle();
  const next = useSeasonEpisodes(first, 1);

  return (
    <div className="pb-10">
      {first && (
        <>
          <div className="py-4 text-center text-section-chip uppercase text-ink-2">Watch next</div>
          <div className="px-page">
            <button onClick={() => onOpenEpisode(first.anime.id, 1)} className="block w-full text-left">
              <Poster title="" src={next.data?.episodes[0]?.thumbnail ?? first.anime.banner} color={first.anime.color} showTitle={false} className="h-[88px] w-full rounded-card">
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[12px] font-bold text-white">
                  S01 | E01 · {next.data?.episodes[0]?.title ?? 'Épisode 1'}
                </span>
              </Poster>
            </button>
          </div>
        </>
      )}
      <div className="flex items-center justify-between px-page py-4">
        <span className="text-section-chip uppercase text-ink-2">Tous les épisodes</span>
        <CheckButton checked={false} onToggle={() => undefined} size={26} />
      </div>
      <div className="flex flex-col gap-2.5 px-page">
        {franchise.seasons.map((s) => {
          const total = s.anime.episodes ?? s.aired ?? 0;
          const done = watched[s.anime.id]?.size ?? 0;
          const ratio = total ? done / total : 0;
          const isOpen = open === s.anime.id;
          return (
            <div key={s.anime.id} className="shadow-card overflow-hidden rounded-card bg-surface">
              <div className="flex h-[62px] items-center px-4" role="button" tabIndex={0} onClick={() => setOpen(isOpen ? null : s.anime.id)}>
                <span className="text-[20px] font-bold text-ink">Saison {s.number}</span>
                <IconChevronDown size={16} className={`ml-2 text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <span className="ml-auto mr-3 text-[14px] font-medium text-ink-3">
                  {done}/{total || '?'}
                </span>
                <CheckButton checked={total > 0 && done === total} onToggle={() => undefined} size={34} />
              </div>
              <div className="h-1 w-full bg-progress-track">
                <motion.div className="h-full bg-green" initial={false} animate={{ width: `${ratio * 100}%` }} transition={{ duration: 0.3 }} />
              </div>
              {isOpen && (
                <SeasonEpisodes
                  season={s}
                  onOpenEpisode={onOpenEpisode}
                  watched={watched[s.anime.id] ?? new Set()}
                  onToggle={(n) => toggle(s.anime.id, n)}
                />
              )}
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
  const desc = detail.description ? stripHtml(detail.description) : null;
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
          {detail.genres.map((g) => <span key={g} className="rounded-full bg-chip px-3 py-1 text-[11px] font-bold uppercase text-chip-text">{g}</span>)}
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
              <button aria-label="Plus" className="grid h-9 w-9 place-items-center"><IconMore size={22} /></button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-page pb-4 text-white">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-7">{title || ' '}</h1>
              {franchise.data && (
                <p className="mt-0.5 text-[13px] font-medium text-white/85">
                  {franchise.data.seasons.length} saison{franchise.data.seasons.length > 1 ? 's' : ''}
                  {franchise.data.seasons.at(-1)?.anime.status ? ` · ${STATUS[franchise.data.seasons.at(-1)!.anime.status!]}` : ''}
                </p>
              )}
            </div>
            <span className="inline-flex h-[30px] shrink-0 items-center rounded-card bg-yellow px-3 text-[12px] font-bold text-black">+ Suivre</span>
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
          <EpisodesTab franchise={franchise.data} onOpenEpisode={onOpenEpisode} />
        ) : (
          <div className="space-y-2.5 px-page py-6">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[66px] animate-pulse rounded-card bg-surface" />)}</div>
        )}
      </div>
    </div>
  );
}
