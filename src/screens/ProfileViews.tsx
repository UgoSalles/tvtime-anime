import { useMemo, useState } from 'react';
import { IconChevronDown, IconMore } from '../components/Icons';
import { Poster } from '../components/Poster';
import { useListItems, useLists } from '../db/hooks';
import { deleteList, removeFromList, renameList } from '../db/repo';
import { useTitle } from '../lib/titles';
import { bucketOf, useLibrary, type ShowState } from '../lib/library';
import { openActions, useSheet } from '../store/sheet';

export function ViewHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="bg-header" style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
      <div className="flex h-11 items-center px-2">
        <button aria-label="Retour" onClick={onBack} className="grid h-9 w-9 rotate-90 place-items-center text-ink"><IconChevronDown size={24} /></button>
        <h1 className="ml-1 min-w-0 flex-1 truncate text-[18px] font-bold text-ink">{title}</h1>
        {right}
      </div>
    </div>
  );
}

type Filter = 'watching' | 'notstarted' | 'stale' | 'later' | 'completed' | 'dropped' | 'favorites' | 'all';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'watching', label: 'En cours' },
  { id: 'notstarted', label: 'Pas commencé' },
  { id: 'stale', label: 'Pas regardé depuis un moment' },
  { id: 'later', label: 'À regarder plus tard' },
  { id: 'completed', label: 'Terminés' },
  { id: 'dropped', label: 'Arrêtés' },
  { id: 'favorites', label: 'Favoris' },
  { id: 'all', label: 'Tous' },
];

const matches = (s: ShowState, f: Filter, now: number) => (f === 'all' ? true : f === 'favorites' ? s.follow.favorite : bucketOf(s, now) === f);

function ShowGrid({ shows, onOpenShow, empty }: { shows: ShowState[]; onOpenShow: (id: number) => void; empty: string }) {
  const t = useTitle();
  if (!shows.length) return <p className="px-8 py-16 text-center text-[13px] text-ink-3">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-3 px-page pt-3">
      {shows.map((s) => {
        const pct = s.airedCount ? Math.round((s.watchedCount / s.airedCount) * 100) : 0;
        return (
          <button key={s.follow.showId} onClick={() => onOpenShow(s.follow.showId)} className="text-left" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 210px' }}>
            <Poster title={t(s.follow.title)} src={s.follow.cover} color={s.follow.color} className="aspect-[2/3] w-full rounded-poster" />
            <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-progress-track">
              <div className="h-full bg-green" style={{ width: `${pct}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** « Voir tout » du profil : en cours / pas commencé / pas regardé depuis un moment / à regarder plus tard / terminés / arrêtés / favoris. Absent des captures (SPEC §4.7). */
export function LibraryView({ onBack, onOpenShow, initial = 'watching' }: { onBack: () => void; onOpenShow: (id: number) => void; initial?: Filter }) {
  const lib = useLibrary();
  const [filter, setFilter] = useState<Filter>(initial);
  const now = useMemo(() => Date.now(), []);
  const list = useMemo(
    () => lib.shows.filter((s) => matches(s, filter, now)).sort((a, b) => (b.follow.lastWatchedAt ?? b.follow.addedAt) - (a.follow.lastWatchedAt ?? a.follow.addedAt)),
    [lib.shows, filter, now],
  );
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="bg-header">
        <ViewHeader title="Mes animes" onBack={onBack} />
        <div className="scroll-x flex gap-2 px-page pb-3">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-bold uppercase tracking-wide ${filter === f.id ? 'bg-yellow text-black' : 'bg-chip text-chip-text'}`}>
              {f.label} <span className="opacity-60">{lib.shows.filter((s) => matches(s, f.id, now)).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        <ShowGrid shows={list} onOpenShow={onOpenShow} empty="Rien ici pour l’instant." />
      </div>
    </div>
  );
}

/** Contenu d'une liste perso. */
export function ListView({ listId, onBack, onOpenShow }: { listId: number; onBack: () => void; onOpenShow: (id: number) => void }) {
  const lists = useLists();
  const items = useListItems(listId);
  const lib = useLibrary();
  const list = lists?.find((l) => l.id === listId);
  const shows = useMemo(() => {
    const ids = new Set((items ?? []).map((i) => i.showId));
    return lib.shows.filter((s) => ids.has(s.follow.showId));
  }, [items, lib.shows]);
  const t = useTitle();

  const menu = () =>
    openActions(list?.name, [
      { label: 'Renommer', onClick: () => useSheet.getState().open({ kind: 'prompt', title: 'Renommer la liste', initial: list?.name, onSubmit: async (n) => void (await renameList(listId, n)) }) },
      ...shows.map((s) => ({ label: `Retirer « ${t(s.follow.title)} »`, onClick: () => removeFromList(listId, s.follow.showId) })),
      { label: 'Supprimer la liste', destructive: true, onClick: async () => { await deleteList(listId); onBack(); } },
    ]);

  return (
    <div className="flex h-full flex-col bg-surface">
      <ViewHeader title={list?.name ?? 'Liste'} onBack={onBack} right={<button aria-label="Options" onClick={menu} className="grid h-9 w-9 place-items-center text-ink"><IconMore size={22} /></button>} />
      <div className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        <ShowGrid shows={shows} onOpenShow={onOpenShow} empty="Liste vide. Ajoute des animes depuis leur fiche (menu ⋮)." />
      </div>
    </div>
  );
}
