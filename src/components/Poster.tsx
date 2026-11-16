import { useLayoutEffect, useRef, useState } from 'react';

/** URLs déjà chargées : un poster qui se remonte (navigation, retour) s'affiche aussitôt, sans fondu ni clignotement. */
const loadedSrcs = new Set<string>();

/**
 * Poster : image AniList chargée en lazy, avec la couleur dominante de la jaquette (`color`) ou un
 * dégradé déterministe (`hue`) comme fond pendant le chargement / hors-ligne.
 */
export function Poster({
  title,
  hue = 220,
  color,
  src,
  showTitle,
  className = '',
  style,
  children,
}: {
  title: string;
  hue?: number;
  color?: string | null;
  src?: string | null;
  /** Écrit le titre sur le fond tant qu'aucune image n'est affichée. */
  showTitle?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [loaded, setLoaded] = useState(() => !!src && loadedSrcs.has(src));
  const [failed, setFailed] = useState(false);
  const fresh = useRef(!(src && loadedSrcs.has(src))); // fondu seulement pour un premier chargement
  const img = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    // Image déjà en cache HTTP : complete dès le montage, on évite l'état « invisible ».
    if (img.current?.complete && img.current.naturalWidth > 0) {
      if (src) loadedSrcs.add(src);
      fresh.current = false;
      setLoaded(true);
    }
  }, [src]);
  const bg = color ?? `linear-gradient(155deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 22%))`;
  const hasImg = !!src && !failed;
  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} overflow-hidden ${className}`}
      style={{ ...style, background: bg }}
    >
      {hasImg && (
        <img
          ref={img}
          src={src!}
          alt={title}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => {
            if (src) loadedSrcs.add(src);
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover ${fresh.current ? 'transition-opacity duration-300' : ''} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {(!hasImg || !loaded) && showTitle !== false && (
        <span className="absolute inset-x-0 bottom-0 p-2 text-left text-[11px] font-extrabold leading-tight text-white/90">
          {!hasImg || !loaded ? title : null}
        </span>
      )}
      {children}
    </div>
  );
}
