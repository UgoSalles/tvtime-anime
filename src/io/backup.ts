import { db } from '../lib/db';
import { useUi } from '../store/ui';
import { saveFile } from './files';

export const BACKUP_APP = 'tvtime-anime';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  settings: { themePref: string; titleLang: string };
  follows: unknown[];
  watched: unknown[];
  reactions: unknown[];
  lists: { id: number; name: string; createdAt: number }[];
  listItems: { listId: number; showId: number; addedAt: number }[];
}

export async function buildBackup(): Promise<Backup> {
  const ui = useUi.getState();
  const [follows, watched, reactions, lists, listItems] = await Promise.all([
    db.follows.toArray(),
    db.watched.toArray(),
    db.reactions.toArray(),
    db.lists.toArray(),
    db.listItems.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { themePref: ui.themePref, titleLang: ui.titleLang },
    follows,
    watched,
    reactions,
    lists: lists as Backup['lists'],
    listItems,
  };
}

export async function exportBackup() {
  const b = await buildBackup();
  const day = b.exportedAt.slice(0, 10);
  await saveFile(`tvtime-sauvegarde-${day}.json`, new Blob([JSON.stringify(b)], { type: 'application/json' }));
  localStorage.setItem('tvtime-last-backup', String(Date.now()));
  return { episodes: b.watched.length, shows: b.follows.length };
}

export function parseBackup(text: string): Backup {
  let b: Backup;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error('Fichier illisible (ce n’est pas du JSON).');
  }
  if (b?.app !== BACKUP_APP || !Array.isArray(b.follows) || !Array.isArray(b.watched)) throw new Error('Ce fichier n’est pas une sauvegarde de cette application.');
  if (b.version > BACKUP_VERSION) throw new Error('Sauvegarde créée par une version plus récente : mets l’application à jour.');
  return b;
}

/**
 * Restaure une sauvegarde.
 * « merge » : ajoute sans rien écraser (les listes de même nom sont fusionnées).
 * « replace » : efface d'abord toutes les données utilisateur.
 */
export async function restoreBackup(b: Backup, mode: 'merge' | 'replace') {
  await db.transaction('rw', [db.follows, db.watched, db.reactions, db.lists, db.listItems], async () => {
    if (mode === 'replace') await Promise.all([db.follows.clear(), db.watched.clear(), db.reactions.clear(), db.lists.clear(), db.listItems.clear()]);

    const existingFollows = new Set((await db.follows.toArray()).map((f) => f.showId));
    const existingWatched = new Set((await db.watched.toArray()).map((w) => `${w.seasonId}-${w.episode}`));
    const existingReactions = new Set((await db.reactions.toArray()).map((r) => `${r.seasonId}-${r.episode}`));

    await db.follows.bulkPut((b.follows as { showId: number }[]).filter((f) => !existingFollows.has(f.showId)) as never[]);
    await db.watched.bulkPut((b.watched as { seasonId: number; episode: number }[]).filter((w) => !existingWatched.has(`${w.seasonId}-${w.episode}`)) as never[]);
    await db.reactions.bulkPut((b.reactions as { seasonId: number; episode: number }[]).filter((r) => !existingReactions.has(`${r.seasonId}-${r.episode}`)) as never[]);

    // Listes : on remappe les ids pour ne pas écraser celles de l'appareil.
    const idMap = new Map<number, number>();
    const current = await db.lists.toArray();
    for (const l of b.lists) {
      const same = mode === 'merge' ? current.find((c) => c.name === l.name) : undefined;
      idMap.set(l.id, same?.id ?? ((await db.lists.add({ name: l.name, createdAt: l.createdAt })) as number));
    }
    await db.listItems.bulkPut(b.listItems.map((i) => ({ ...i, listId: idMap.get(i.listId) ?? i.listId })));
  });
  if (mode === 'replace') {
    const ui = useUi.getState();
    if (b.settings?.titleLang === 'romaji' || b.settings?.titleLang === 'english') ui.setTitleLang(b.settings.titleLang);
    if (['system', 'light', 'dark'].includes(b.settings?.themePref)) ui.setThemePref(b.settings.themePref as 'system' | 'light' | 'dark');
  }
  return { shows: b.follows.length, episodes: b.watched.length };
}
