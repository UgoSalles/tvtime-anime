/**
 * Suivis de DÉMO (phase 3) : de vrais ids AniList avec une progression fictive (nombre d'épisodes
 * « vus » en numérotation absolue), pour exercer la Watchlist et À venir avec de vraies données.
 * Phase 4 : remplacé par les suivis Dexie de l'utilisateur.
 */
export interface Follow {
  /** Id AniList (n'importe quelle saison de la franchise). */
  id: number;
  /** Épisodes vus, en numérotation absolue sur la franchise. */
  watched: number;
}

export const demoFollows: Follow[] = [
  { id: 6702, watched: 150 }, // Fairy Tail
  { id: 21, watched: 1168 }, // One Piece
  { id: 113415, watched: 30 }, // Jujutsu Kaisen
  { id: 9919, watched: 20 }, // Blue Exorcist
  { id: 11061, watched: 140 }, // Hunter x Hunter (2011)
  { id: 212888, watched: 6 }, // Overgeared (en cours de diffusion)
  { id: 154587, watched: 0 }, // Frieren
  { id: 140960, watched: 0 }, // Spy x Family
];
