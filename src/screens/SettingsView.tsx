import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronDown } from '../components/Icons';
import { exportBackup, parseBackup, restoreBackup } from '../io/backup';
import { openActions } from '../store/sheet';
import { useUi, type ThemePref, type TitleLangPref } from '../store/ui';

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-card bg-chip p-0.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={`h-9 flex-1 rounded-[5px] text-[13px] font-bold ${value === o.id ? 'bg-surface text-ink shadow-card' : 'text-ink-3'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Réglages : écran absent des captures (SPEC Q5), construit à partir des composants existants. */
export function SettingsView({ onBack }: { onBack: () => void }) {
  const { titleLang, setTitleLang, themePref, setThemePref } = useUi();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const last = Number(localStorage.getItem('tvtime-last-backup') ?? 0);

  const onRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const b = parseBackup(await file.text());
      openActions(
        'Restaurer la sauvegarde',
        [
          { label: 'Fusionner avec mes données', onClick: async () => { const r = await restoreBackup(b, 'merge'); setMsg(`Fusionné : ${r.shows} séries, ${r.episodes} épisodes dans le fichier.`); } },
          { label: 'Remplacer toutes mes données', destructive: true, onClick: async () => { const r = await restoreBackup(b, 'replace'); setMsg(`Restauré : ${r.shows} séries, ${r.episodes} épisodes.`); } },
        ],
        `Sauvegarde du ${new Date(b.exportedAt).toLocaleDateString('fr-FR')} : ${b.follows.length} séries, ${b.watched.length} épisodes vus.`,
      );
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="bg-header" style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
        <div className="flex h-11 items-center px-2">
          <button aria-label="Retour" onClick={onBack} className="grid h-9 w-9 rotate-90 place-items-center text-ink"><IconChevronDown size={24} /></button>
          <h1 className="ml-1 text-[18px] font-bold text-ink">Réglages</h1>
        </div>
      </div>
      <div className="scroll-y min-h-0 flex-1 space-y-6 px-page pt-6" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        <section>
          <h2 className="mb-2 text-section-chip uppercase text-ink-2">Titres des animes</h2>
          <Segmented<TitleLangPref> value={titleLang} onChange={setTitleLang} options={[{ id: 'english', label: 'Anglais' }, { id: 'romaji', label: 'Romaji' }]} />
        </section>
        <section>
          <h2 className="mb-2 text-section-chip uppercase text-ink-2">Données</h2>
          <p className="mb-3 text-[12px] leading-[17px] text-ink-3">
            Tes suivis sont stockés sur cet appareil uniquement. Fais une sauvegarde de temps en temps (et avant de supprimer l’app de l’écran d’accueil).
            {last ? ` Dernière sauvegarde : ${new Date(last).toLocaleDateString('fr-FR')}.` : ' Aucune sauvegarde pour l’instant.'}
          </p>
          <div className="space-y-2">
            <button onClick={async () => { const r = await exportBackup(); setMsg(`Sauvegarde prête : ${r.shows} séries, ${r.episodes} épisodes.`); }} className="h-11 w-full rounded-card bg-yellow text-[13px] font-extrabold uppercase tracking-wider text-black">Exporter une sauvegarde</button>
            <button onClick={() => fileRef.current?.click()} className="h-11 w-full rounded-card bg-chip text-[13px] font-extrabold uppercase tracking-wider text-ink-2">Restaurer une sauvegarde</button>
            <button onClick={() => navigate('/profil/import')} className="h-11 w-full rounded-card bg-chip text-[13px] font-extrabold uppercase tracking-wider text-ink-2">Importer (TV Time, AniList, MAL)</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void onRestoreFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {msg && <p className="mt-3 rounded-card bg-chip px-3 py-2 text-[12px] text-ink">{msg}</p>}
        </section>
        <section>
          <h2 className="mb-2 text-section-chip uppercase text-ink-2">Thème</h2>
          <Segmented<ThemePref> value={themePref} onChange={setThemePref} options={[{ id: 'system', label: 'Système' }, { id: 'light', label: 'Clair' }, { id: 'dark', label: 'Sombre' }]} />
        </section>
      </div>
    </div>
  );
}
