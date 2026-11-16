/**
 * Données statiques de la phase 2 (écrans fidèles, sans réseau).
 * Remplacées par AniList / Jikan en phase 3, puis par Dexie en phase 4.
 */
export interface MockShow {
  id: string;
  title: string;
  hue: number;
}

export interface MockEpisode {
  id: string;
  show: MockShow;
  season: number;
  episode: number;
  /** Numéro absolu « (E151) », propre aux animes. */
  absolute?: number;
  /** Épisodes en retard « +177 ». */
  behind?: number;
  premiere?: boolean;
  isNew?: boolean;
  title: string;
  /** Date de diffusion (À venir). */
  date?: string;
}

const show = (id: string, title: string, hue: number): MockShow => ({ id, title, hue });

export const shows = {
  fairyTail: show('fairy-tail', 'Fairy Tail', 20),
  onePiece: show('one-piece', 'One Piece', 205),
  blueExorcist: show('blue-exorcist', 'Blue Exorcist', 215),
  shamanKing: show('shaman-king', 'Shaman King (2021)', 35),
  jujutsu: show('jujutsu-kaisen', 'Jujutsu Kaisen', 265),
  frieren: show('frieren', 'Frieren', 150),
  mha: show('mha', 'My Hero Academia', 100),
  demonSlayer: show('demon-slayer', 'Demon Slayer', 350),
  aot: show('aot', 'Attack on Titan', 0),
  spyFamily: show('spy-family', 'Spy x Family', 330),
  dungeon: show('dungeon-meshi', 'Dungeon Meshi', 45),
  hxh: show('hxh', 'Hunter x Hunter', 125),
};

export const watchNext: MockEpisode[] = [
  { id: 'a1', show: shows.fairyTail, season: 4, episode: 1, absolute: 151, behind: 177, title: 'Sabertooth' },
  { id: 'a2', show: shows.onePiece, season: 22, episode: 6, behind: 12, isNew: true, title: 'Brimming with the Future! An Adventure' },
  { id: 'a3', show: shows.jujutsu, season: 2, episode: 5, behind: 3, title: 'Fluctuation' },
  { id: 'a4', show: shows.blueExorcist, season: 3, episode: 2, title: 'Where Secrets Are' },
  { id: 'a5', show: shows.mha, season: 7, episode: 4, behind: 7, title: 'Deku vs. Shigaraki' },
  { id: 'a6', show: shows.hxh, season: 1, episode: 38, absolute: 38, behind: 4, title: 'Hunter × Hunter' },
];

export const notStarted: MockEpisode[] = [
  { id: 'b1', show: shows.frieren, season: 1, episode: 1, premiere: true, title: 'The Journey’s End' },
  { id: 'b2', show: shows.dungeon, season: 1, episode: 1, premiere: true, isNew: true, title: 'Hot Pot' },
  { id: 'b3', show: shows.spyFamily, season: 2, episode: 1, premiere: true, title: 'Operation Strix' },
  { id: 'b4', show: shows.aot, season: 1, episode: 1, premiere: true, behind: 24, title: 'To You, in 2000 Years' },
];

export const upcoming: { date: string; items: MockEpisode[] }[] = [
  {
    date: 'JAN 13, 2024',
    items: [{ id: 'u1', show: shows.blueExorcist, season: 3, episode: 2, title: 'Where Secrets Are' }],
  },
  {
    date: 'JAN 16, 2024',
    items: [{ id: 'u2', show: shows.shamanKing, season: 2, episode: 2, isNew: true, title: 'West Tokyo Sound Effect Festival' }],
  },
  {
    date: 'JAN 20, 2024',
    items: [
      { id: 'u3', show: shows.blueExorcist, season: 3, episode: 3, isNew: true, title: 'True Cross Academy Festival' },
      { id: 'u4', show: shows.onePiece, season: 22, episode: 6, isNew: true, title: 'Brimming with the Future! An Adventure' },
    ],
  },
  {
    date: 'JAN 27, 2024',
    items: [{ id: 'u5', show: shows.jujutsu, season: 2, episode: 6, title: 'Fluctuation, Part 2' }],
  },
];

export const trendingShows: MockShow[] = [shows.frieren, shows.jujutsu, shows.demonSlayer, shows.aot, shows.spyFamily];
export const forYouShows: MockShow[] = [shows.mha, shows.hxh, shows.dungeon, shows.onePiece, shows.fairyTail];
export const profileShows: MockShow[] = [shows.blueExorcist, shows.fairyTail, shows.shamanKing, shows.onePiece];

export interface MockSeason {
  number: number;
  watched: number;
  total: number;
}
export const fairyTailSeasons: MockSeason[] = [
  { number: 1, watched: 48, total: 48 },
  { number: 2, watched: 48, total: 48 },
  { number: 3, watched: 24, total: 24 },
  { number: 4, watched: 0, total: 25 },
  { number: 5, watched: 0, total: 25 },
];
