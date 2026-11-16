import { useEffect, useRef, useState } from 'react';
import { m as motion } from 'framer-motion';
import { CheckButton } from './CheckButton';
import { Badge, ShowPill } from './Chips';
import { Poster } from './Poster';
import { layout } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');

/** Modèle d'affichage d'une carte d'épisode (indépendant de la source de données). */
export interface EpisodeCardModel {
  key: string;
  /** Id AniList de la série (n'importe quelle saison de la franchise). */
  showId: number;
  /** Id AniList de la saison de l'épisode. */
  seasonId: number;
  showTitle: string;
  poster: string | null;
  color: string | null;
  season: number;
  episode: number;
  /** « (E151) » — affiché seulement si la franchise a plusieurs saisons. */
  absolute?: number;
  behind?: number;
  premiere?: boolean;
  isNew?: boolean;
  title: string | null;
}

/**
 * Carte d'épisode. `compact` = variante « À venir » (qx.jpeg, 80 pt) ;
 * sinon variante Watchlist (v.jpeg, 112 pt).
 */
export function EpisodeCard({
  ep,
  compact = false,
  onOpenShow,
  onOpenEpisode,
  onCheck,
  checked,
  locked = false,
}: {
  ep: EpisodeCardModel;
  compact?: boolean;
  /** Appelé quand l'utilisateur coche (Watchlist : après l'animation de coche). */
  onCheck: () => void;
  /** Mode contrôlé (À venir) : état coché issu de la base ; décocher est alors possible. */
  checked?: boolean;
  /** Épisode pas encore diffusé : la coche « tremble » au lieu de valider. */
  locked?: boolean;
  onOpenShow: (id: number) => void;
  onOpenEpisode: (showId: number, seasonId: number, episode: number) => void;
}) {
  const controlled = checked !== undefined;
  const [done, setDone] = useState(checked ?? false);
  const [shake, setShake] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => setDone(checked ?? false), [checked, ep.key]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const toggle = () => {
    if (locked) return setShake((n) => n + 1);
    if (controlled) return onCheck();
    if (done) return;
    setDone(true); // vert d'abord, puis la carte passe à l'épisode suivant
    timer.current = setTimeout(onCheck, 480);
  };
  const h = compact ? layout.upcomingCardHeight : layout.episodeCardHeight;
  const pw = compact ? layout.upcomingCardPosterWidth : layout.episodeCardPosterWidth;
  const open = () => onOpenEpisode(ep.showId, ep.seasonId, ep.episode);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className="shadow-card relative flex overflow-hidden rounded-card bg-surface"
      style={{ height: h }}
    >
      <Poster title={ep.showTitle} src={ep.poster} color={ep.color} showTitle={false} className="shrink-0" style={{ width: pw }} />
      <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pl-3.5" style={{ gap: compact ? 3 : 6 }}>
        <div>
          <ShowPill name={ep.showTitle} onClick={() => onOpenShow(ep.showId)} />
        </div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-episode-code text-ink" style={compact ? { fontSize: 15 } : undefined}>
            S{pad(ep.season)} | E{pad(ep.episode)}
            {ep.absolute ? ` (E${ep.absolute})` : ''}
          </span>
          {ep.behind ? <span className="text-episode-count text-ink-3">+{ep.behind}</span> : null}
          {ep.premiere ? <Badge kind="premiere">Premiere</Badge> : null}
          {ep.isNew ? <Badge kind="new">Nouveau</Badge> : null}
        </div>
        <div
          className={`truncate pr-[60px] text-episode-title text-ink ${compact ? '!font-semibold' : ''}`}
          style={compact ? { fontSize: 14 } : undefined}
        >
          {ep.title ?? `Épisode ${ep.episode}`}
        </div>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <motion.div key={shake} animate={shake ? { x: [0, -5, 5, -3, 3, 0] } : undefined} transition={{ duration: 0.3 }}>
          <CheckButton checked={done} onToggle={toggle} size={compact ? 34 : layout.checkButtonSize} />
        </motion.div>
      </div>
    </div>
  );
}
