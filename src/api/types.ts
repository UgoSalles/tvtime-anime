export type MediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
export type MediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface Titles {
  romaji: string | null;
  english: string | null;
  native?: string | null;
}

/** Entrée AniList = une saison (ou un film, OVA…). */
export interface Anime {
  id: number;
  idMal: number | null;
  format: MediaFormat | null;
  status: MediaStatus | null;
  title: Titles;
  episodes: number | null;
  /** Durée d'un épisode en minutes. */
  duration: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  startDate: FuzzyDate | null;
  cover: string | null;
  coverLarge: string | null;
  color: string | null;
  banner: string | null;
  averageScore: number | null;
  genres: string[];
  nextAiring: { episode: number; airingAt: number } | null;
  /** Synopsis (renseigné pour les entrées de franchise). */
  description?: string | null;
}

export interface AnimeDetail extends Anime {
  description: string | null;
  popularity: number | null;
  siteUrl: string | null;
  endDate: FuzzyDate | null;
  studios: string[];
  streamingEpisodes: { title: string; thumbnail: string | null }[];
  characters: { id: number; name: string; image: string | null; role: string }[];
  recommendations: Anime[];
}

export interface FranchiseSeason {
  /** Numéro de saison dans la franchise (1, 2, …) — ordre chronologique. */
  number: number;
  anime: Anime;
  /** Épisodes déjà diffusés (ou total si terminée), ou null si inconnu. */
  aired: number | null;
  /** Nombre d'épisodes cumulés des saisons précédentes (pour le numéro absolu). */
  offset: number;
}

export interface Franchise {
  rootId: number;
  /** Tous les ids AniList de la franchise (saisons + extras). */
  ids: number[];
  seasons: FranchiseSeason[];
  /** Films, OVA, spéciaux liés par PREQUEL/SEQUEL. */
  extras: Anime[];
}

export interface EpisodeInfo {
  number: number;
  title: string | null;
  aired: string | null;
  filler?: boolean;
  recap?: boolean;
  thumbnail?: string | null;
  /** Version plus grande (en-tête de la fiche épisode). */
  thumbnailLarge?: string | null;
}

export type StreamingMap = Record<number, { title: string; thumbnail: string | null }[]>;

export interface AiringEntry {
  mediaId: number;
  episode: number;
  airingAt: number;
}
