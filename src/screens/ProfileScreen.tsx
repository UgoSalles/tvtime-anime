import { useMatch, useNavigate } from 'react-router-dom';
import { IconPlus } from '../components/Icons';
import { SettingsView } from './SettingsView';
import { Poster } from '../components/Poster';
import { useDiscover } from '../api/hooks';
import { useTitle } from '../lib/titles';

function StatCard({ label, children, width }: { label: string; children: React.ReactNode; width: number }) {
  return (
    <div className="shadow-card shrink-0 rounded-card bg-surface p-4" style={{ width }}>
      <div className="text-section-chip uppercase text-ink-2" style={{ letterSpacing: 0.4 }}>
        {label}
      </div>
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

/**
 * Seule la partie visible sur s.jpeg est reproduite. L'en-tête du profil (avatar, pseudo,
 * réglages) et les sections suivantes ne sont pas couverts par les captures (SPEC §4.7).
 */
export function ProfileScreen({ onOpenShow }: { onOpenShow: (id: number) => void }) {
  const t = useTitle();
  const navigate = useNavigate();
  const settings = useMatch('/profil/reglages');
  // Démo (phase 3) : les « séries » du profil viennent des tendances ; phase 4 : les suivis réels.
  const profileShows = (useDiscover().data?.trending ?? []).slice(0, 6);
  if (settings) return <SettingsView onBack={() => navigate(-1)} />;
  return (
    <div className="flex h-full flex-col bg-surface">
      <div
        className="scroll-y min-h-0 flex-1"
        style={{ paddingTop: 'calc(var(--safe-top) + 16px)', paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        {/* Accès aux réglages : emplacement provisoire (l'en-tête du profil n'est pas sur les captures). */}
        <div className="flex justify-end px-page">
          <button onClick={() => navigate('/profil/reglages')} className="h-8 text-[12px] font-bold uppercase text-blue">Réglages</button>
        </div>
        <div className="scroll-x flex gap-3 px-page pb-3 pt-1">
          <StatCard label="Temps passé à regarder" width={258}>
            <Stat n="01" unit="Mois" />
            <Stat n="22" unit="Jours" />
            <Stat n="17" unit="Heures" />
          </StatCard>
          <StatCard label="Épisodes vus" width={258}>
            <Stat n="1 248" unit="Épisodes" />
            <Stat n="18" unit="Ce mois-ci" />
          </StatCard>
        </div>

        <section className="mt-5">
          <div className="flex items-baseline justify-between px-page">
            <h2 className="text-section-title text-ink">Séries</h2>
            <button className="text-link uppercase text-blue">Voir tout</button>
          </div>
          <div className="scroll-x mt-3 flex gap-3 px-page">
            {profileShows.map((s) => (
              <button key={s.id} onClick={() => onOpenShow(s.id)} className="shrink-0">
                <Poster title={t(s.title)} src={s.coverLarge} color={s.color} showTitle={false} className="rounded-poster" style={{ width: 158, height: 236 }} />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 px-page">
          <h3 className="text-[16px] font-semibold text-ink-2">Séries préférées</h3>
          <button
            aria-label="Ajouter une série préférée"
            className="mt-3 grid place-items-center rounded-poster bg-chip text-ink-3"
            style={{ width: 158, height: 236 }}
          >
            <IconPlus size={44} strokeWidth={1.6} />
          </button>
        </section>
      </div>
    </div>
  );
}
