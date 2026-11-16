/**
 * Poster provisoire : dégradé déterministe + titre. Les vraies images AniList
 * arrivent en phase 3 (la prop `src` prendra le relais, chargée en lazy).
 */
export function Poster({
  title,
  hue,
  src,
  className = '',
  style,
  children,
}: {
  title: string;
  hue: number;
  src?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} overflow-hidden ${className}`}
      style={{
        ...style,
        background: `linear-gradient(155deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 22%))`,
      }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-x-0 bottom-0 p-2 text-left text-[11px] font-extrabold leading-tight text-white/90">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}
