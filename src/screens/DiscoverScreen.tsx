import { IconChevronRight, IconPlus, IconTv } from '../components/Icons';
import { Poster } from '../components/Poster';
import { forYouShows, trendingShows, type MockShow } from '../data/mock';

function Row({ title, shows, onOpenShow }: { title: string; shows: MockShow[]; onOpenShow: (id: string) => void }) {
  return (
    <section className="mt-6">
      <button className="flex items-center gap-1 px-page text-[20px] font-bold leading-6 text-ink">
        {title}
        <IconChevronRight size={16} />
      </button>
      <div className="scroll-x mt-3 flex gap-2 px-page">
        {shows.map((s) => (
          <button key={s.id} onClick={() => onOpenShow(s.id)} className="shrink-0 text-left">
            <Poster title={s.title} hue={s.hue} className="h-[168px] w-[112px] rounded-poster">
              <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-[4px] border-2 border-white/90 bg-black/30 text-white">
                <IconPlus size={14} />
              </span>
            </Poster>
          </button>
        ))}
      </div>
    </section>
  );
}

export function DiscoverScreen({ onOpenShow }: { onOpenShow: (id: string) => void }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="bg-header px-page pb-3" style={{ paddingTop: 'calc(var(--safe-top) + 14px)' }}>
        <label className="flex items-center text-ink-3">
          <input
            type="search"
            placeholder="Rechercher un anime"
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
        </label>
      </div>
      <div className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}>
        <Row title="Animes pour vous" shows={forYouShows} onOpenShow={onOpenShow} />
        <Row title="Animes tendance" shows={trendingShows} onOpenShow={onOpenShow} />
        <div className="px-page pt-6">
          <button className="flex h-[54px] w-full items-center gap-3 rounded-card bg-yellow px-3 text-black">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-yellow">
              <IconTv size={20} />
            </span>
            <span className="flex-1 text-left text-[14px] font-extrabold uppercase tracking-wider">Parcourir tous les animes</span>
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
