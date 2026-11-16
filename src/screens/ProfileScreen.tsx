import { lazy, Suspense, useMemo } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { IconPlus } from '../components/Icons';
import { Poster } from '../components/Poster';
const SettingsView = lazy(() => import('./SettingsView').then((m) => ({ default: m.SettingsView })));
const LibraryView = lazy(() => import('./ProfileViews').then((m) => ({ default: m.LibraryView })));
const ListView = lazy(() => import('./ProfileViews').then((m) => ({ default: m.ListView })));
const ImportView = lazy(() => import('./ImportView').then((m) => ({ default: m.ImportView })));
import { useLists } from '../db/hooks';
import { createList, toggleFavorite } from '../db/repo';
import { computeStats, useLibrary } from '../lib/library';
import { useTitle } from '../lib/titles';
import { openActions, useSheet } from '../store/sheet';

function StatCard({ label, children, width }: { label: string; children: React.ReactNode; width: number }) {
  return (
    <div className="shadow-card shrink-0 rounded-card bg-surface p-4" style={{ width }}>
      <div className="text-section-chip uppercase text-ink-2" style={{ letterSpacing: 0.4 }}>{label}</div>
      <div className="mt-2 flex gap-5">{children}</div>
    </div>
  );
}
const Stat = ({ n, unit }: { n: string; unit: string }) => (
  <div className="text-center">
    <div className="text-stat-number text-ink">{n}</div>
    <div className="text-stat-label text-ink-2">{unit}</div>
  </div>
);
const two = (n: number) => String(n).padStart(2, '0');

/**
 * Profil. Seule la partie visible sur s.jpeg (stats, « Séries », « Séries préférées ») suit une
 * capture ; l'en-tête, « Listes » et les sous-écrans sont construits à partir des composants
 * existants (SPEC §4.7).
 */
export function ProfileScreen({ onOpenShow }: { onOpenShow: (id: number) => void }) {
  const t = useTitle();
  const navigate = useNavigate();
  const settings = useMatch('/profil/reglages');
  const library = useMatch('/profil/series');
  const listMatch = useMatch('/profil/listes/:id');
  const importing = useMatch('/profil/import');
  const lib = useLibrary();
  const lists = useLists();
  const stats = useMemo(() => computeStats(lib), [lib]);

  const series = useMemo(() => [...lib.shows].sort((a, b) => (b.follow.lastWatchedAt ?? b.follow.addedAt) - (a.follow.lastWatchedAt ?? a.follow.addedAt)).slice(0, 12), [lib.shows]);
  const favorites = lib.shows.filter((s) => s.follow.favorite);

  if (settings || importing || library || listMatch?.params.id)
    return (
      <Suspense fallback={<div className="h-full bg-surface" />}>
        {settings ? <SettingsView onBack={() => navigate(-1)} /> : importing ? <ImportView onBack={() => navigate(-1)} /> : library ? <LibraryView onBack={() => navigate(-1)} onOpenShow={onOpenShow} /> : <ListView listId={Number(listMatch!.params.id)} onBack={() => navigate(-1)} onOpenShow={onOpenShow} />}
      </Suspense>
    );

  const pickFavorite = () => {
    const candidates = lib.shows.filter((s) => !s.follow.favorite).slice(0, 12);
    if (!candidates.length) return openActions('Séries préférées', [], 'Suis d’abord des animes depuis Découvrir.');
    openActions('Ajouter aux préférées', candidates.map((s) => ({ label: t(s.follow.title), onClick: () => toggleFavorite(s.follow.showId) })));
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="scroll-y min-h-0 flex-1" style={{ paddingTop: 'calc(var(--safe-top) + 16px)', paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        {/* Accès aux réglages : emplacement provisoire (l'en-tête du profil n'est pas sur les captures). */}
        <div className="flex justify-end px-page">
          <button onClick={() => navigate('/profil/reglages')} className="h-8 text-[12px] font-bold uppercase text-blue">Réglages</button>
        </div>
        <div className="scroll-x flex gap-3 px-page pb-3 pt-1">
          <StatCard label="Temps passé à regarder" width={258}>
            <Stat n={two(stats.months)} unit="Mois" />
            <Stat n={two(stats.days)} unit="Jours" />
            <Stat n={two(stats.hours)} unit="Heures" />
          </StatCard>
          <StatCard label="Épisodes vus" width={258}>
            <Stat n={String(stats.episodes)} unit="Épisodes" />
            <Stat n={String(stats.last30Days)} unit="30 derniers jours" />
          </StatCard>
          <StatCard label="Animes" width={200}>
            <Stat n={String(stats.shows)} unit="Suivis" />
          </StatCard>
        </div>

        <section className="mt-5">
          <div className="flex items-baseline justify-between px-page">
            <h2 className="text-section-title text-ink">Séries</h2>
            <button onClick={() => navigate('/profil/series')} className="text-link uppercase text-blue">Voir tout</button>
          </div>
          {series.length === 0 ? (
            <p className="px-page pt-3 text-[13px] text-ink-3">Tu ne suis encore aucun anime. Ajoute-en depuis Découvrir.</p>
          ) : (
            <div className="scroll-x mt-3 flex gap-3 px-page">
              {series.map((s) => (
                <button key={s.follow.showId} onClick={() => onOpenShow(s.follow.showId)} className="shrink-0">
                  <Poster title={t(s.follow.title)} src={s.follow.cover} color={s.follow.color} showTitle={false} className="rounded-poster" style={{ width: 158, height: 236 }} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 px-page">
          <h3 className="text-[16px] font-semibold text-ink-2">Séries préférées</h3>
          <div className="scroll-x -mx-page mt-3 flex gap-3 px-page">
            {favorites.map((s) => (
              <button key={s.follow.showId} onClick={() => onOpenShow(s.follow.showId)} className="shrink-0">
                <Poster title={t(s.follow.title)} src={s.follow.cover} color={s.follow.color} showTitle={false} className="rounded-poster" style={{ width: 158, height: 236 }} />
              </button>
            ))}
            <button aria-label="Ajouter une série préférée" onClick={pickFavorite} className="grid shrink-0 place-items-center rounded-poster bg-chip text-ink-3" style={{ width: 158, height: 236 }}>
              <IconPlus size={44} strokeWidth={1.6} />
            </button>
          </div>
        </section>

        <section className="mt-8 px-page">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[16px] font-semibold text-ink-2">Mes listes</h3>
            <button
              onClick={() => useSheet.getState().open({ kind: 'prompt', title: 'Nouvelle liste', placeholder: 'Nom de la liste', submitLabel: 'Créer', onSubmit: async (n) => void (await createList(n)) })}
              className="text-link uppercase text-blue"
            >
              Nouvelle
            </button>
          </div>
          <div className="mt-2 divide-y divide-divider rounded-card bg-background">
            {(lists ?? []).map((l) => (
              <button key={l.id} onClick={() => navigate(`/profil/listes/${l.id}`)} className="flex h-12 w-full items-center px-4 text-left text-[15px] font-semibold text-ink">{l.name}</button>
            ))}
            {!(lists ?? []).length && <p className="px-4 py-3 text-[13px] text-ink-3">Aucune liste.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
