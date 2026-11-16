/** Enregistre un fichier : feuille de partage (iOS : « Enregistrer dans Fichiers ») sinon téléchargement. */
export async function saveFile(name: string, blob: Blob) {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // l'utilisateur a fermé la feuille
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Lit un fichier texte ; décompresse les .gz (export MAL) si le navigateur sait le faire. */
export async function readTextFile(file: File): Promise<string> {
  if (/\.gz$/i.test(file.name) && 'DecompressionStream' in window) {
    const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }
  return file.text();
}
