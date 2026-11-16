/**
 * Design tokens — extraits des captures de `reference/` (voir SPEC.md §2).
 *
 * Niveaux de confiance :
 *  [M] mesuré au pixel sur une capture (JPEG compressé : ±4 par canal RGB)
 *  [E] estimé visuellement / déduit des proportions (±2 pt)
 *  [?] non couvert par les captures : valeur provisoire, à confirmer
 *
 * Unités : pt CSS pour un viewport iPhone de 393 pt de large.
 * Les captures iOS FR (v.jpeg, s.jpeg) font 416 px de large ≈ 1 px / pt sur un
 * iPhone 414 pt ; les mesures ont été ramenées à 393 (× 0.95).
 */

// ─── Couleurs ───────────────────────────────────────────────────────────────

/** Couleurs de marque, identiques dans les deux thèmes. */
export const brand = {
  /** Jaune d'accent : fond a.jpeg [M #FFD200], soulignement d'onglet, badges, bouton « BROWSE ALL ». */
  yellow: '#FFD200',
  /** Vert « vu » : coche validée, barres de progression de saison. [M] relevés #87C94B … #90D23C. */
  green: '#8CCD40',
  /** Bleu des liens (« VOIR TOUT »). [E] pixels anti-crénelés : #2772AB … #2A7BC9. */
  blue: '#2A7BC9',
} as const;

export interface ThemeColors {
  /** Fond d'écran derrière les cartes. */
  background: string;
  /** Cartes, feuilles, fond de la page Profil (clair). */
  surface: string;
  /** Fond de la zone des onglets supérieurs. Clair : blanc ; sombre : gris de page [M #232323]. */
  header: string;
  /** Pastilles de section (« A VOIR », date), tuile vide « + ». */
  chip: string;
  chipText: string;
  /** Titre, code d'épisode, labels actifs. */
  textPrimary: string;
  /** Titre d'épisode, sous-titres. */
  textSecondary: string;
  /** Compteurs « +15 », labels inactifs, placeholders. */
  textTertiary: string;
  /** Filet sous les onglets supérieurs, séparateurs de liste. */
  divider: string;
  /** Fond de la barre d'onglets basse. */
  tabBar: string;
  tabIconActive: string;
  tabIconInactive: string;
  /** Soulignement de l'onglet supérieur actif. */
  tabUnderline: string;
  /** Badge gris « PREMIERE ». */
  badge: string;
  badgeText: string;
  /** Bouton de coche non coché (cercle). */
  checkIdleBg: string;
  checkIdleIcon: string;
  /** Bouton de coche coché. */
  checkDoneBg: string;
  checkDoneIcon: string;
  /** Piste vide des barres de progression de saison. */
  progressTrack: string;
  /** Contour de la pastille « NOM DE SÉRIE > ». */
  pillBorder: string;
}

/** Thème clair — v.jpeg, s.jpeg (iOS FR), h.jpeg, c.jpeg, q.jpeg. */
export const light: ThemeColors = {
  background: '#F4F4F4', // [M] v.jpeg
  surface: '#FFFFFF', // [M]
  header: '#FFFFFF', // [M]
  chip: '#EEEEEE', // [M] pastille « A VOIR » ; tuile vide #EEEEEC
  chipText: '#7A7A7A', // [E] texte le plus sombre mesuré #646464 (anti-crénelé)
  textPrimary: '#000000', // [M] noir pur
  textSecondary: '#646464', // [E]
  textTertiary: '#A6A6A6', // [E]
  divider: '#D8D8D8', // [M]
  tabBar: '#F5F5F5', // [M]
  tabIconActive: '#000000', // [M]
  tabIconInactive: '#656565', // [M]
  tabUnderline: brand.yellow, // [M] #F6D24E…#FCD227
  badge: '#DADADA', // [M]
  badgeText: '#000000', // [E]
  checkIdleBg: '#ECECEA', // [M]
  checkIdleIcon: '#646464', // [E]
  checkDoneBg: brand.green,
  checkDoneIcon: '#FFFFFF',
  progressTrack: '#CFCFCF', // [E] barres grises c.jpeg (0/24)
  pillBorder: '#000000', // [E]
};

/**
 * Thème sombre — qx.jpeg (Android, animes).
 * ATTENTION : fond de page GRIS (#202020) et cartes NOIRES (#000000),
 * l'inverse de la plupart des apps sombres. f.jpeg (« Suite TV », autre app) fait
 * l'inverse et n'est PAS utilisé pour ces valeurs.
 */
export const dark: ThemeColors = {
  background: '#202020', // [M]
  surface: '#000000', // [M] cartes + tab bar
  header: '#202020', // [M] #232323 sur qx.jpeg
  chip: '#7E7E7E', // [M] pastille de date « JAN 13, 2024 »
  chipText: '#FFFFFF', // [E]
  textPrimary: '#FFFFFF', // [M]
  textSecondary: '#FFFFFF', // [E] titre d'épisode blanc dans qx.jpeg
  textTertiary: '#A6A6A6', // [M] icône d'onglet inactive
  divider: '#3A3A3A', // [?]
  tabBar: '#000000', // [M]
  tabIconActive: '#FFFFFF', // [M]
  tabIconInactive: '#A6A6A6', // [M]
  tabUnderline: '#FFFFFF', // [M] qx.jpeg : soulignement blanc (pas jaune) en sombre
  badge: '#DADADA', // [?] « PREMIERE » en sombre non visible ; le badge « NEW » jaune [M #FFD533] utilise brand.yellow
  badgeText: '#000000', // [E]
  checkIdleBg: '#F4F4F4', // [M] cercle blanc cassé
  checkIdleIcon: '#4A4A4A', // [E]
  checkDoneBg: brand.green,
  checkDoneIcon: '#FFFFFF',
  progressTrack: '#4A4A4A', // [?]
  pillBorder: '#FFFFFF', // [E]
};

// ─── Typographie ────────────────────────────────────────────────────────────

/**
 * La police de l'app est une géométrique à ronds parfaits (famille Gotham).
 * Substitut libre le plus proche : Montserrat (auto-hébergée via @fontsource pour
 * le hors-ligne). [?] à valider avec l'utilisateur.
 */
export const fontFamily = {
  sans: "'Montserrat', -apple-system, 'SF Pro Text', system-ui, sans-serif",
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/** Échelle typographique [E] relevée sur v.jpeg / s.jpeg (ramenée à 393 pt). */
export const typography = {
  /** Onglets supérieurs « ÉPISODES À VOIR » — MAJUSCULES, bold, interlettrage léger. */
  topTab: { size: 16, weight: 700, lineHeight: 20, letterSpacing: 0.2, uppercase: true },
  /** Pastille de section « A VOIR » / « WATCH NEXT » / date — MAJUSCULES, bold. */
  sectionChip: { size: 13, weight: 700, lineHeight: 16, letterSpacing: 0.8, uppercase: true },
  /** Nom de série dans la pastille contour « HIS DARK MAT… > ». */
  showPill: { size: 12, weight: 600, lineHeight: 14, letterSpacing: 0.6, uppercase: true },
  /** « S01 | E01 » — bold. */
  episodeCode: { size: 17, weight: 700, lineHeight: 22, letterSpacing: 0 },
  /** « +15 », « (E151) » à côté du code. */
  episodeCount: { size: 12, weight: 500, lineHeight: 14, letterSpacing: 0 },
  /** Titre d'épisode. */
  episodeTitle: { size: 15, weight: 400, lineHeight: 20, letterSpacing: 0 },
  /** Titre de section de page (« Séries », « Séries préférées »). */
  sectionTitle: { size: 24, weight: 700, lineHeight: 30, letterSpacing: 0 },
  /** Lien « VOIR TOUT ». */
  link: { size: 14, weight: 600, lineHeight: 18, letterSpacing: 0.3, uppercase: true },
  /** Gros chiffres des stats « 01 / 22 / 17 ». */
  statNumber: { size: 36, weight: 700, lineHeight: 40, letterSpacing: 0 },
  statLabel: { size: 13, weight: 500, lineHeight: 16, letterSpacing: 0 },
  /** Libellé de l'onglet de la barre basse. */
  tabBarLabel: { size: 11, weight: 500, lineHeight: 13, letterSpacing: 0 },
  /** « 3 days » — grand chiffre gris clair + unité (liste À venir clair). */
  countdownNumber: { size: 28, weight: 300, lineHeight: 32, letterSpacing: 0 },
  countdownUnit: { size: 12, weight: 400, lineHeight: 14, letterSpacing: 0 },
} as const;

// ─── Espacements, rayons, hauteurs ─────────────────────────────────────────

/** Échelle de base 4 pt. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  /** Cartes d'épisode [E] ~6 pt. */
  card: 6,
  /** Pastilles, badges. */
  pill: 999,
  badge: 4,
  /** Posters en carrousel. */
  poster: 4,
  /** Bannière fiche. */
  banner: 0,
} as const;

export const shadow = {
  /** Ombre très diffuse des cartes en thème clair [E] ; aucune en thème sombre. */
  cardLight: '0 1px 3px rgba(0, 0, 0, 0.12)',
  cardDark: 'none',
} as const;

export const layout = {
  /** Largeur / hauteur de référence de l'écran (iPhone 15). */
  viewport: { width: 393, height: 852 },
  /** Marge horizontale de page. [M] 16 px sur v.jpeg. */
  pageMargin: 16,
  /** Zone des onglets supérieurs (hors status bar), soulignement inclus. [E] */
  topTabsHeight: 52,
  topTabUnderline: 3, // [M]
  topTabDivider: 1, // [M]
  /** Carte d'épisode de la Watchlist. [E] 117 px → 111 pt */
  episodeCardHeight: 112,
  episodeCardPosterWidth: 124,
  episodeCardGap: 14,
  /** Variante compacte (À venir, qx.jpeg) : 75 px ≈ 80 pt, poster carré. [E] */
  upcomingCardHeight: 80,
  upcomingCardPosterWidth: 80,
  /** Bouton de coche (cercle). [E] ~38 px */
  checkButtonSize: 36,
  /** Pastille de section (« A VOIR »). [E] 70 × 26 px */
  sectionChipHeight: 26,
  /** Hauteur utile de la barre d'onglets basse, hors safe-area. [E] 49 comme iOS. */
  tabBarHeight: 49,
  tabBarIconSize: 34, // [E] glyphe ~36 px de large sur v.jpeg
  /** Poster de carrousel (Profil). [E] 166 px de large sur 416 → ~158 pt */
  carouselPosterWidth: 158,
  carouselPosterHeight: 236,
  carouselGap: 12,
  /** Bannière de fiche. [?] */
  bannerHeight: 200,
} as const;

/** Safe areas — à utiliser dans le CSS, jamais en pt codés en dur. */
export const safeArea = {
  top: 'env(safe-area-inset-top)',
  right: 'env(safe-area-inset-right)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
} as const;

// ─── Mouvement (valeurs provisoires : aucune vidéo fournie) ─────────────────

export const motion = {
  /** [?] à valider : courbe de la transition push iOS (cubic-bezier 0.32, 0.72, 0, 1). */
  push: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.38 },
  /** [?] coche d'épisode : léger « pop » puis remplissage vert. */
  check: { type: 'spring', stiffness: 500, damping: 22 },
  fast: { duration: 0.15 },
} as const;

export const theme = { brand, light, dark, fontFamily, fontWeight, typography, space, radius, shadow, layout, safeArea, motion } as const;
export type Theme = typeof theme;
