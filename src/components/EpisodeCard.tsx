import { useState } from 'react';
import { CheckButton } from './CheckButton';
import { Badge, ShowPill } from './Chips';
import { Poster } from './Poster';
import type { MockEpisode } from '../data/mock';
import { layout } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Carte d'épisode. `compact` = variante « À venir » (qx.jpeg, 80 pt) ;
 * sinon variante Watchlist (v.jpeg, 112 pt).
 */
export function EpisodeCard({
  ep,
  compact = false,
  onOpenShow,
  onOpenEpisode,
}: {
  ep: MockEpisode;
  compact?: boolean;
  onOpenShow: (id: string) => void;
  onOpenEpisode: (showId: string, epId: string) => void;
}) {
  const [done, setDone] = useState(false);
  const h = compact ? layout.upcomingCardHeight : layout.episodeCardHeight;
  const pw = compact ? layout.upcomingCardPosterWidth : layout.episodeCardPosterWidth;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenEpisode(ep.show.id, ep.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpenEpisode(ep.show.id, ep.id)}
      className="shadow-card relative flex overflow-hidden rounded-card bg-surface"
      style={{ height: h }}
    >
      <Poster title={ep.show.title} hue={ep.show.hue} className="shrink-0" style={{ width: pw }} />
      <div
        className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pl-3.5"
        style={{ gap: compact ? 3 : 6 }}
      >
        <div>
          <ShowPill name={ep.show.title} onClick={() => onOpenShow(ep.show.id)} />
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
          {ep.title}
        </div>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <CheckButton checked={done} onToggle={() => setDone((d) => !d)} size={compact ? 34 : layout.checkButtonSize} />
      </div>
    </div>
  );
}
