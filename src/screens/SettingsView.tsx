import { IconChevronDown } from '../components/Icons';
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
          <h2 className="mb-2 text-section-chip uppercase text-ink-2">Thème</h2>
          <Segmented<ThemePref> value={themePref} onChange={setThemePref} options={[{ id: 'system', label: 'Système' }, { id: 'light', label: 'Clair' }, { id: 'dark', label: 'Sombre' }]} />
        </section>
      </div>
    </div>
  );
}
