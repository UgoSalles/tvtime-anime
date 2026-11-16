import { useRef, useState } from 'react';
import { ViewHeader } from './ProfileViews';
import { fetchAniListUserList } from '../api/anilist';
import { readTextFile } from '../io/files';
import { runImport, type ImportEntry, type ImportProgress, type ImportReport } from '../io/importer';
import { parseMalXml } from '../io/mal';
import { parseTvTime } from '../io/tvtime';

type Source = 'tvtime' | 'anilist' | 'mal';
const SOURCES: { id: Source; label: string }[] = [
  { id: 'tvtime', label: 'TV Time' },
  { id: 'anilist', label: 'AniList' },
  { id: 'mal', label: 'MyAnimeList' },
];

const HELP: Record<Source, string> = {
  tvtime:
    'Demande l’export de tes données à TV Time (demande d’accès RGPD), décompresse l’archive et choisis ici les fichiers CSV de séries (épisodes vus, séries suivies). Les films sont ignorés. Si la numérotation de saison de TV Time ne correspond pas à celle d’AniList, les épisodes sont rangés dans l’ordre.',
  anilist: 'Saisis ton pseudo AniList. Ta liste d’animes doit être publique. La progression de chaque saison est reprise.',
  mal: 'Exporte ta liste depuis MyAnimeList (Profil → Export), puis choisis ici le fichier .xml (ou .xml.gz).',
};

const Btn = ({ children, onClick, disabled, kind = 'primary' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'primary' | 'ghost' }) => (
  <button disabled={disabled} onClick={onClick} className={`h-11 w-full rounded-card text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-40 ${kind === 'primary' ? 'bg-yellow text-black' : 'bg-chip text-ink-2'}`}>
    {children}
  </button>
);

function Detail({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <details className="mt-3 rounded-card bg-chip px-3 py-2 text-[12px] text-ink-2">
      <summary className="cursor-pointer font-bold">{title} ({items.length})</summary>
      <ul className="mt-2 list-disc space-y-0.5 pl-4">{items.slice(0, 200).map((i, k) => <li key={k}>{i}</li>)}</ul>
    </details>
  );
}

/** Import depuis TV Time (CSV), AniList (compte) ou MyAnimeList (XML) — SPEC §4.8, absent des captures. */
export function ImportView({ onBack }: { onBack: () => void }) {
  const [source, setSource] = useState<Source>('tvtime');
  const [user, setUser] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const ready = source === 'anilist' ? user.trim().length > 0 : files.length > 0;

  async function start() {
    setBusy(true);
    setError(null);
    setReport(null);
    setProgress(null);
    abort.current = new AbortController();
    const signal = abort.current.signal;
    try {
      let entries: ImportEntry[];
      let ignored: string[] = [];
      if (source === 'tvtime') {
        const parsed = parseTvTime(await Promise.all(files.map(async (f) => ({ name: f.name, text: await readTextFile(f) }))));
        entries = parsed.entries;
        ignored = parsed.ignoredFiles;
        if (!entries.length) throw new Error('Aucune série reconnue dans ces fichiers (colonne « nom de la série » introuvable).');
      } else if (source === 'mal') {
        entries = parseMalXml(await readTextFile(files[0]!));
      } else {
        const list = await fetchAniListUserList(user.trim().replace(/^@/, ''), signal);
        if (!list.length) throw new Error('Liste vide ou privée.');
        entries = list.map((e) => ({
          label: e.title,
          anilistId: e.mediaId,
          status: e.status === 'CURRENT' || e.status === 'REPEATING' ? 'current' : e.status === 'PLANNING' ? 'planning' : e.status === 'COMPLETED' ? 'completed' : e.status === 'DROPPED' ? 'dropped' : 'paused',
          progress: e.progress,
        }));
      }
      const r = await runImport(entries, { signal, onProgress: setProgress });
      r.skipped.push(...ignored.map((n) => `Fichier ignoré : ${n}`));
      setReport(r);
    } catch (e) {
      setError((e as DOMException).name === 'AbortError' ? 'Import annulé : ce qui a déjà été importé est conservé.' : (e as Error).message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
  return (
    <div className="flex h-full flex-col bg-surface">
      <ViewHeader title="Importer" onBack={onBack} />
      <div className="scroll-y min-h-0 flex-1 px-page pt-5" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 24px)' }}>
        <div className="flex gap-2">
          {SOURCES.map((s) => (
            <button key={s.id} disabled={busy} onClick={() => { setSource(s.id); setFiles([]); setReport(null); setError(null); }} className={`h-9 flex-1 rounded-full text-[12px] font-bold uppercase ${source === s.id ? 'bg-yellow text-black' : 'bg-chip text-chip-text'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-[19px] text-ink-2">{HELP[source]}</p>

        <div className="mt-4 space-y-3">
          {source === 'anilist' ? (
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Pseudo AniList" autoCapitalize="off" autoCorrect="off" className="h-11 w-full rounded-card bg-chip px-3 text-[15px] text-ink outline-none" />
          ) : (
            <label className="flex h-11 cursor-pointer items-center justify-center rounded-card bg-chip px-3 text-[13px] font-bold text-ink-2">
              {files.length ? files.map((f) => f.name).join(', ') : source === 'tvtime' ? 'Choisir les fichiers CSV' : 'Choisir le fichier XML'}
              <input type="file" className="hidden" multiple={source === 'tvtime'} accept={source === 'tvtime' ? '.csv,text/csv' : '.xml,.gz,text/xml'} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </label>
          )}
          {busy ? <Btn kind="ghost" onClick={() => abort.current?.abort()}>Annuler</Btn> : <Btn disabled={!ready} onClick={start}>Lancer l’import</Btn>}
        </div>

        {busy && (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-progress-track"><div className="h-full bg-green transition-all" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-[12px] text-ink-3">{progress ? `${progress.done}/${progress.total} · ${progress.label}` : 'Lecture du fichier…'}</p>
            <p className="mt-1 text-[11px] text-ink-3">AniList limite le débit (~30 requêtes/min) : une grosse liste peut prendre plusieurs minutes. Garde l’app ouverte ; tu peux annuler et relancer, les séries déjà traitées sont conservées.</p>
          </div>
        )}

        {error && <p className="mt-5 rounded-card bg-chip px-3 py-3 text-[13px] text-ink">{error}</p>}
        {report && (
          <div className="mt-5">
            <div className="rounded-card bg-chip px-4 py-3 text-[14px] text-ink">
              <b>{report.shows}</b> série{report.shows > 1 ? 's' : ''} suivie{report.shows > 1 ? 's' : ''}, <b>{report.episodes}</b> épisode{report.episodes > 1 ? 's' : ''} ajouté{report.episodes > 1 ? 's' : ''}.
            </div>
            <Detail title="Non retrouvées sur AniList" items={report.unmatched} />
            <Detail title="Numérotation approximative (ordre supposé)" items={report.approximate} />
            <Detail title="Ignorées (films, OVA, fichiers)" items={report.skipped} />
          </div>
        )}
      </div>
    </div>
  );
}
