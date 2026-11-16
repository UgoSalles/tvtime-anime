import { cachedFetch, TTL } from './cache';
import { fetchJsonWithRetry, RateLimitedQueue } from './queue';
import type { AiringEntry, Anime, AnimeDetail, FuzzyDate, MediaSeason, Titles } from './types';

const ENDPOINT = 'https://graphql.anilist.co';
// 30 req/min constatées (mode dégradé d'AniList), rafale de 6 : prudent et suffisant avec le cache.
export const anilistQueue = new RateLimitedQueue(30, 15);

// ── Normalisation ──────────────────────────────────────────────────────────
interface RawMedia {
  id: number;
  idMal: number | null;
  format: Anime['format'];
  status: Anime['status'];
  title: Anime['title'];
  episodes: number | null;
  duration?: number | null;
  season: Anime['season'];
  seasonYear: number | null;
  startDate?: FuzzyDate | null;
  coverImage?: { large?: string | null; extraLarge?: string | null; color?: string | null } | null;
  bannerImage?: string | null;
  averageScore?: number | null;
  genres?: string[] | null;
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  description?: string | null;
  relations?: { edges: { relationType: string; node: { id: number; format: string | null; type: string } }[] };
}

export function normalize(m: RawMedia): Anime {
  return {
    id: m.id,
    idMal: m.idMal ?? null,
    format: m.format ?? null,
    status: m.status ?? null,
    title: m.title,
    episodes: m.episodes ?? null,
    duration: m.duration ?? null,
    season: m.season ?? null,
    seasonYear: m.seasonYear ?? null,
    startDate: m.startDate ?? null,
    cover: m.coverImage?.large ?? null,
    coverLarge: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    color: m.coverImage?.color ?? null,
    banner: m.bannerImage ?? null,
    averageScore: m.averageScore ?? null,
    genres: m.genres ?? [],
    nextAiring: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt } : null,
    ...(m.description !== undefined ? { description: m.description } : {}),
  };
}

const FIELDS = `
  id idMal format status episodes duration season seasonYear averageScore genres bannerImage
  title { romaji english native }
  coverImage { large extraLarge color }
  startDate { year month day }
  nextAiringEpisode { episode airingAt }
`;

// ── Transport ──────────────────────────────────────────────────────────────
export async function gql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const json = await fetchJsonWithRetry<{ data?: T; errors?: { message: string }[] }>(
    anilistQueue,
    ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    { signal, retries: 3, networkBackoffMs: 12_000 },
  );
  if (!json.data) throw new Error(json.errors?.[0]?.message ?? 'AniList: réponse vide');
  return json.data;
}

const cached = <T>(key: string, ttl: number, query: string, vars: Record<string, unknown>, pick: (d: any) => T, signal?: AbortSignal) =>
  cachedFetch<T>(key, ttl, async () => pick(await gql(query, vars, signal)));

// ── Découvrir ──────────────────────────────────────────────────────────────
/** Formats « séries » pour les rangées de découverte (pas de films/OVA qui pollueraient les tendances). */
const BROWSE_FORMATS = '[TV, TV_SHORT, ONA]';

export function currentSeason(d = new Date()): { season: MediaSeason; year: number } {
  const m = d.getMonth();
  return { season: (['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const)[Math.floor(m / 3)]!, year: d.getFullYear() };
}

export interface DiscoverData {
  trending: Anime[];
  season: Anime[];
  popular: Anime[];
  /** Annoncés, pas encore sortis. */
  upcoming: Anime[];
  genres: string[];
}

/** Trois rangées + liste des genres en UNE seule requête (économise le quota). */
export function fetchDiscover(signal?: AbortSignal): Promise<DiscoverData> {
  const { season, year } = currentSeason();
  const q = `query($season:MediaSeason,$year:Int){
    trending: Page(perPage:20){ media(type:ANIME,sort:TRENDING_DESC,isAdult:false,format_in:${BROWSE_FORMATS}){ ${FIELDS} } }
    season: Page(perPage:20){ media(type:ANIME,season:$season,seasonYear:$year,sort:POPULARITY_DESC,isAdult:false,format_in:${BROWSE_FORMATS}){ ${FIELDS} } }
    popular: Page(perPage:20){ media(type:ANIME,sort:POPULARITY_DESC,isAdult:false,format_in:${BROWSE_FORMATS}){ ${FIELDS} } }
    upcoming: Page(perPage:20){ media(type:ANIME,status:NOT_YET_RELEASED,sort:POPULARITY_DESC,isAdult:false,format_in:${BROWSE_FORMATS}){ ${FIELDS} } }
    GenreCollection
  }`;
  return cached(
    `discover2:${season}:${year}`,
    TTL.list,
    q,
    { season, year },
    (d) => ({
      trending: d.trending.media.map(normalize),
      season: d.season.media.map(normalize),
      popular: d.popular.media.map(normalize),
      upcoming: d.upcoming.media.map(normalize),
      genres: (d.GenreCollection as string[]).filter((g) => g !== 'Hentai'),
    }),
    signal,
  );
}

export interface PagedAnime {
  items: Anime[];
  hasNext: boolean;
}

export function searchAnime(term: string, page = 1, signal?: AbortSignal): Promise<PagedAnime> {
  const q = `query($s:String,$p:Int){ Page(page:$p,perPage:25){ pageInfo{hasNextPage} media(type:ANIME,search:$s,isAdult:false,sort:SEARCH_MATCH){ ${FIELDS} } } }`;
  return cached(
    `search:${term.toLowerCase()}:${page}`,
    TTL.list,
    q,
    { s: term, p: page },
    (d) => ({ items: d.Page.media.map(normalize), hasNext: d.Page.pageInfo.hasNextPage }),
    signal,
  );
}

export function browseByGenre(genre: string | null, page = 1, signal?: AbortSignal): Promise<PagedAnime> {
  const filter = genre ? 'genre:$g,' : '';
  const q = `query(${genre ? '$g:String,' : ''}$p:Int){ Page(page:$p,perPage:30){ pageInfo{hasNextPage} media(type:ANIME,${filter}sort:POPULARITY_DESC,isAdult:false,format_in:${BROWSE_FORMATS}){ ${FIELDS} } } }`;
  return cached(
    `genre:${genre ?? '*'}:${page}`,
    TTL.list,
    q,
    genre ? { g: genre, p: page } : { p: page },
    (d) => ({ items: d.Page.media.map(normalize), hasNext: d.Page.pageInfo.hasNextPage }),
    signal,
  );
}

// ── Fiche ──────────────────────────────────────────────────────────────────
export function fetchAnimeDetail(id: number, signal?: AbortSignal): Promise<AnimeDetail> {
  const q = `query($id:Int){ Media(id:$id,type:ANIME){
    ${FIELDS}
    description(asHtml:false) popularity siteUrl endDate{year month day}
    studios(isMain:true){ nodes{ name } }
    characters(sort:[ROLE,FAVOURITES_DESC],perPage:12){ edges{ role node{ id name{ full } image{ large } } } }
    recommendations(sort:RATING_DESC,perPage:12){ nodes{ mediaRecommendation{ ${FIELDS} } } }
  } }`;
  return cached(
    `detail:${id}`,
    TTL.detail,
    q,
    { id },
    (d): AnimeDetail => {
      const m = d.Media;
      return {
        ...normalize(m),
        description: m.description ?? null,
        popularity: m.popularity ?? null,
        siteUrl: m.siteUrl ?? null,
        endDate: m.endDate ?? null,
        studios: (m.studios?.nodes ?? []).map((n: { name: string }) => n.name),
        characters: (m.characters?.edges ?? []).map((e: any) => ({
          id: e.node.id,
          name: e.node.name.full,
          image: e.node.image?.large ?? null,
          role: e.role,
        })),
        recommendations: (m.recommendations?.nodes ?? [])
          .map((n: any) => n.mediaRecommendation)
          .filter(Boolean)
          .map(normalize),
      };
    },
    signal,
  );
}

// ── Franchise : nœuds avec relations (batch par id_in) ─────────────────────
export interface FranchiseNode {
  anime: Anime;
  /** Ids reliés par PREQUEL / SEQUEL (type ANIME), sur plusieurs générations : sert à parcourir la franchise. */
  links: number[];
  /** Préquelles DIRECTES (type ANIME) : sert à rattacher un « Part 2 » à sa saison. */
  prequels: number[];
  /** Suites DIRECTES (type ANIME) : sert à vérifier qu'une franchise est fermée (aucun voisin inconnu). */
  sequels: number[];
}

interface RelEdge {
  relationType: string;
  node: { id: number; type: string; relations?: { edges: RelEdge[] } };
}
const isSeqPre = (e: RelEdge) => (e.relationType === 'PREQUEL' || e.relationType === 'SEQUEL') && e.node.type === 'ANIME';
/** Ids PREQUEL/SEQUEL atteignables, en suivant uniquement ces relations à travers les niveaux imbriqués. */
function collectLinks(edges: RelEdge[] | undefined, out: Set<number>) {
  for (const e of edges ?? []) {
    if (!isSeqPre(e)) continue;
    out.add(e.node.id);
    collectLinks(e.node.relations?.edges, out);
  }
}

/**
 * Détails de `ids` + leurs relations PREQUEL/SEQUEL. Les relations sont demandées sur 3 niveaux imbriqués
 * (ids seulement) : une requête fait ainsi avancer le parcours de 3 saisons d'un coup au lieu d'une.
 * Si AniList refuse la requête imbriquée (complexité), on retombe sur la version à un seul niveau.
 */
export async function fetchFranchiseNodes(ids: number[], signal?: AbortSignal): Promise<FranchiseNode[]> {
  const leaf = 'relations{ edges{ relationType node{ id type } } }';
  const nest = (inner: string) => `relations{ edges{ relationType node{ id type ${inner} } } }`;
  const build = (rel: string) => `query($ids:[Int]){ Page(perPage:50){ media(id_in:$ids,type:ANIME){
    ${FIELDS}
    description(asHtml:false)
    ${rel}
  } } }`;
  type Raw = RawMedia & { relations?: { edges: RelEdge[] } };
  let raw: Raw[];
  try {
    raw = (await gql<{ Page: { media: Raw[] } }>(build(nest(nest(leaf))), { ids }, signal)).Page.media;
  } catch (e) {
    if (signal?.aborted) throw e;
    raw = (await gql<{ Page: { media: Raw[] } }>(build(leaf), { ids }, signal)).Page.media;
  }
  return raw.map((m) => {
    const links = new Set<number>();
    collectLinks(m.relations?.edges, links);
    links.delete(m.id);
    const prequels = (m.relations?.edges ?? []).filter((e) => e.relationType === 'PREQUEL' && e.node.type === 'ANIME').map((e) => e.node.id);
    const sequels = (m.relations?.edges ?? []).filter((e) => e.relationType === 'SEQUEL' && e.node.type === 'ANIME').map((e) => e.node.id);
    return { anime: normalize(m), links: [...links], prequels, sequels };
  });
}

// ── Calendrier ─────────────────────────────────────────────────────────────
/**
 * Dates des derniers épisodes DÉJÀ diffusés (50 au plus récent) : sert de date de repli quand Jikan et Kitsu
 * n'en donnent pas, pour rapprocher les images des sorties récentes.
 */
export function fetchAiredRecent(mediaId: number, signal?: AbortSignal): Promise<AiringEntry[]> {
  const q = `query($id:Int){ Page(perPage:50){ airingSchedules(mediaId:$id,notYetAired:false,sort:EPISODE_DESC){ mediaId episode airingAt } } }`;
  return cachedFetch(`aired:${mediaId}`, TTL.airing, async () => (await gql<{ Page: { airingSchedules: AiringEntry[] } }>(q, { id: mediaId }, signal)).Page.airingSchedules);
}

/**
 * TOUS les épisodes programmés (pas encore diffusés) des médias donnés, jusqu'à la fin de ce qu'AniList
 * a planifié — plus de fenêtre de 30 jours. Paginé par 50.
 */
export function fetchAiringSchedule(mediaIds: number[], signal?: AbortSignal): Promise<AiringEntry[]> {
  const q = `query($ids:[Int],$p:Int){ Page(page:$p,perPage:50){ pageInfo{ hasNextPage } airingSchedules(mediaId_in:$ids,notYetAired:true,sort:TIME){ mediaId episode airingAt } } }`;
  // La clé arrondit l'heure courante pour que le cache serve vraiment pendant l'heure.
  const key = `airing2:${[...mediaIds].sort((a, b) => a - b).join(',')}:${Math.floor(Date.now() / 3_600_000)}`;
  return cachedFetch(key, TTL.airing, async () => {
    const out: AiringEntry[] = [];
    for (let page = 1; page <= 8; page++) {
      const d = await gql<{ Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: AiringEntry[] } }>(q, { ids: mediaIds, p: page }, signal);
      out.push(...d.Page.airingSchedules);
      if (!d.Page.pageInfo.hasNextPage) break;
    }
    return out;
  });
}

// ── Import ─────────────────────────────────────────────────────────────────
/** MAL → AniList (50 ids par requête). Renvoie idMal → id AniList. */
export async function fetchAnilistIdsByMal(malIds: number[], signal?: AbortSignal): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  for (let i = 0; i < malIds.length; i += 50) {
    const chunk = malIds.slice(i, i + 50);
    const d = await gql<{ Page: { media: { id: number; idMal: number }[] } }>(
      `query($ids:[Int]){ Page(perPage:50){ media(idMal_in:$ids,type:ANIME){ id idMal } } }`,
      { ids: chunk },
      signal,
    );
    d.Page.media.forEach((m) => out.set(m.idMal, m.id));
  }
  return out;
}

export interface AniListUserEntry {
  mediaId: number;
  status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING';
  progress: number;
  title: string;
}

/** Liste ANIME publique d'un utilisateur AniList (sans clé d'API). */
export async function fetchAniListUserList(userName: string, signal?: AbortSignal): Promise<AniListUserEntry[]> {
  const d = await gql<{ MediaListCollection: { lists: { entries: { status: AniListUserEntry['status']; progress: number; media: { id: number; title: Titles } }[] }[] } }>(
    `query($n:String){ MediaListCollection(userName:$n,type:ANIME){ lists{ entries{ status progress media{ id title{ romaji english } } } } } }`,
    { n: userName },
    signal,
  );
  const seen = new Map<number, AniListUserEntry>();
  for (const l of d.MediaListCollection.lists)
    for (const e of l.entries)
      seen.set(e.media.id, { mediaId: e.media.id, status: e.status, progress: e.progress ?? 0, title: e.media.title.english || e.media.title.romaji || String(e.media.id) });
  return [...seen.values()];
}
