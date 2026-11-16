# SPEC — Clone de TV Time dédié aux animes (PWA iPhone)

> Phase 1 — état au 2026-11-16. Source : les 10 captures de `reference/`.
> Légende de fiabilité : ✅ visible sur une capture · 🟡 partiellement visible / déduit · ❓ non couvert → **question posée, rien d'inventé**.

---

## 0. Ce que contient `reference/` (et ses limites)

**10 images JPEG, aucune vidéo.** Toutes sont des visuels marketing / captures du Play Store et de l'App Store, de **166 à 650 px de large**. Conséquences :

- Les couleurs sont mesurables (±4 par canal à cause de la compression JPEG), les **géométries sont estimées** à ±2 pt.
- **Aucune animation ni interaction n'est observable** (pas de vidéo) : les timings de `theme.ts` → `motion` sont provisoires.
- Les captures mélangent **deux générations de l'app**, **deux thèmes**, **trois plateformes** et **deux langues** (voir tableau). Il faut choisir une cible — Q1.

| Fichier | Taille | Contenu | Génération / thème / langue | Utilisable pour |
|---|---|---|---|---|
| `v.jpeg` | 416×737 | Watchlist « ÉPISODES À VOIR » | **Récente**, iOS, clair, FR | Watchlist, tab bar, cartes ✅ (référence principale) |
| `s.jpeg` | 416×737 | Profil (stats + carrousel « Séries ») | **Récente**, iOS, clair, FR | Profil ✅ |
| `qx.jpeg` | 371×742 | « UPCOMING » avec dates, **animes** | **Récente**, Android, **sombre**, EN | À venir, thème sombre ✅ |
| `images.jpeg` | 638×480 | Watch List + Découvrir (fond rouge) | Récente, iOS, clair, EN | Découvrir, état « coché » ✅ |
| `m.jpeg` | 651×471 | Idem `images.jpeg` (fond violet) | Récente, iOS, clair, EN | Doublon de `images.jpeg` |
| `a.jpeg` | 166×296 | Fiche épisode « Donnez votre avis » | Récente, iOS, clair, FR | Fiche épisode 🟡 (très petite) |
| `q.jpeg` | 586×522 | Watch list + fiche série « Six Feet Under » | **Ancienne**, Android, clair, EN | Fiche série / saisons 🟡 |
| `c.jpeg` | 554×554 | Upcoming + fiche série « Followed » | **Ancienne**, iOS/Android, clair, EN | À venir (compte à rebours), saisons 🟡 |
| `h.jpeg` | 466×657 | Liste « Upcoming » avec jours | **Ancienne**, clair, EN | À venir (compte à rebours) ✅ (le cadre violet est une annotation à ignorer) |
| `f.jpeg` | 376×749 | « Always know what to watch next » | ⚠️ **Autre application** (« Suite TV »), sombre, EN | Structure seulement — **voir Q2** |

> `f.jpeg` n'est pas TV Time (marque « Suite TV », tab bar flottante, fond noir/cartes grises = inverse de `qx.jpeg`). Je ne m'en sers pas pour les tokens.

---

## 1. Architecture de navigation

### 1.1 Barre d'onglets basse (fixe) ✅ `v`, `s`, `qx`, `q`
- 4 onglets (récent) : **Séries · Films · Découvrir · Profil** (EN : Shows · Movies · Discover · Profile). Ancienne version : 3 onglets Episodes · Discover · Profile.
- Icônes (28 pt) au trait : téléviseur, clap de cinéma, loupe, silhouette. Libellé 11–12 pt dessous.
- Actif : noir (clair) / blanc (sombre), icône épaissie ; inactif : gris (`#656565` clair, `#A6A6A6` sombre).
- Fond `#F5F5F5` (clair) / `#000` (sombre), filet supérieur fin en clair. Hauteur 49 pt + `env(safe-area-inset-bottom)`.
- ❓ **L'onglet « Films » n'a pas de sens pour une app animes-only** → Q3.

### 1.2 Onglets supérieurs (pages Séries) ✅ `v`, `qx`, `m`, `q`
- Deux onglets plein-largeur : **ÉPISODES À VOIR | À VENIR** (EN : WATCH LIST | UPCOMING).
- Actif : texte noir (clair, `v`) — ou **jaune** (ancienne, `q`) — avec **soulignement de 3 pt** occupant la moitié de la largeur ; en sombre (`qx`) le soulignement est **blanc**.
- Filet de 1 pt `#D8D8D8` sous toute la largeur.
- ❓ Le comportement au swipe horizontal entre les deux onglets n'est pas visible.

### 1.3 Pile de navigation (push) 🟡
Fiche série et fiche épisode s'empilent par-dessus les onglets (chevron de retour en haut à gauche sur `m`/`q`). Barre basse masquée ou non sur les fiches : ❓ non visible.
Transitions slide iOS + swipe retour depuis le bord gauche : exigées par le brief, **pas observables** dans les captures (`motion.push` provisoire).

### 1.4 Safe areas et plein-écran 📋 brief
Standalone, status-bar-style à choisir (clair = `default`, sombre = `black-translucent`) ; `env(safe-area-inset-*)` partout ; pas de zoom, pas de sélection, pas de rebond du body, scroll uniquement dans les conteneurs.

---

## 2. Design tokens

Voir **`src/theme.ts`** (source de vérité). Résumé des relevés :

| Token | Clair | Sombre | Source |
|---|---|---|---|
| Jaune de marque | `#FFD200` | idem | `a.jpeg` (aplat) ✅ |
| Vert « vu » | `#8CCD40` | idem | `q`, `c`, `m` ✅ |
| Bleu lien | `#2A7BC9` | idem | `s` 🟡 |
| Fond de page | `#F4F4F4` | **`#202020`** | `v`, `qx` ✅ |
| Cartes | `#FFFFFF` | **`#000000`** | `v`, `qx` ✅ |
| Texte principal | `#000000` | `#FFFFFF` | ✅ |
| Pastille de section | `#EEEEEE` | `#7E7E7E` | `v`, `qx` ✅ |
| Badge « PREMIERE » | `#DADADA` | jaune `#FFD200` (« NEW ») | `v`, `qx` ✅ |
| Coche non cochée | `#ECECEA` | `#F4F4F4` | ✅ |
| Barre d'onglets | `#F5F5F5` | `#000000` | ✅ |
| Police | Montserrat (substitut de la Gotham-like d'origine) | | ❓ Q6 |

Points d'attention :
- **En sombre, la hiérarchie est inversée** : page gris `#202020`, cartes noires. À ne pas « corriger ».
- Marges de page 16 pt ; carte d'épisode 112 pt de haut, poster de 124 pt, 14 pt entre cartes ; rayon ~6 pt.
- Aucune couleur d'erreur / d'alerte / rouge n'apparaît dans les captures → ❓ à définir si nécessaire.

---

## 3. Composants

### 3.1 `EpisodeCard` (Watchlist) ✅ `v`, `qx`, `images`, `q`
Ligne de 112 pt, fond carte, ombre légère (clair) :
1. **Poster** à gauche, pleine hauteur, coins gauches arrondis, 124 pt de large (recadrage paysage du poster).
2. Colonne texte (padding ~14 pt) :
   - **Pastille contour** `NOM DE LA SÉRIE >` : MAJUSCULES, 12 pt, contour 1 pt, tronquée par « … » (`HIS DARK MAT… >`), chevron droit.
   - **`S01 | E01`** bold 17 pt (EN : `S03 | E02`). Suffixes possibles : **`+15`** (nombre d'épisodes en retard, petit gris), **`(E151)`** (numéro **absolu** — `s.jpeg`, Fairy Tail : `S04 | E01 (E151) +177`, très utile pour les animes), badge **`PREMIERE`** (gris) et badge jaune **`NOUVEAU`/`NEW`** (rogné sur `v`, plein sur `qx`).
   - **Titre de l'épisode** 15 pt regular, tronqué avec « … ».
3. **Bouton coche** (cercle ~36 pt) aligné à droite, centré verticalement.
   - Non coché : cercle `#ECECEA` + coche grise.
   - **Coché : cercle vert `#8CCD40` + coche blanche** (`images.jpeg`, ligne Euphoria — état figé de l'animation).
4. Variante ancienne (`q.jpeg`) : le **réseau de diffusion** s'affiche en haut à droite (« Netflix », « FX »…) — ❓ à décliner en « studio / plateforme de streaming » ? → Q4.

États : normal · coché (transition) · tronqué · avec/sans badge · avec/sans `+N`.
❓ Interactions non visibles : tap sur la carte (→ fiche épisode ? fiche série ?), tap sur la pastille (→ fiche série), swipe, long-press, retrait de la liste après coche.

### 3.2 `SectionChip` ✅
Pastille centrée, MAJUSCULES bold 13 pt, interlettre large. Libellés relevés : `A VOIR` / `WATCH NEXT` / `HAVEN'T STARTED` (→ « Pas commencé »), date `JAN 13, 2024`.
Clair : fond `#EEEEEE`, texte gris. Sombre : fond `#7E7E7E`, texte blanc.

### 3.3 `GridToggle` ✅
Icône 2×2 carrés pleins, à droite de la ligne de la pastille de section (`v`, `m`, `qx`). Bascule probable liste ↔ grille. ❓ **Contenu de l'état « grille » non visible** → Q4.

### 3.4 `UpcomingRow` (clair, ancienne) ✅ `h`, `c`
Poster portrait 60×80, **nom de la série bold**, `S07E02` (sans pipe), titre d'épisode gris clair, à droite un **compte à rebours** : grand chiffre gris clair (`3`, `5`, `17`, `46`) + « days » dessous. Séparateurs de 1 pt. En-tête gris foncé « Upcoming » sur `c`.
Dans la génération récente (`qx`, sombre) cette ligne devient `EpisodeCard` regroupée sous des **pastilles de date** (`JAN 13, 2024`) — c'est la référence retenue (voir §4.2).

### 3.5 `ProgressBarRow` (saisons) 🟡 `c`, `q`
- `c.jpeg` : « Season 1 [barre jaune] 17/17 > » ; saisons non commencées : barre grise `0/24`.
- `q.jpeg` : ligne de saison pleine largeur « Season 1 ⌄ 13/13 [coche verte] » avec **barre verte fine en bas de la ligne**.
- Les deux sont d'**anciennes générations** : forme finale pour la version récente ❓ Q5.

### 3.6 `PosterCarousel` ✅ `s`, `images`
Posters portrait (≈158×236 pt, rayon ~4), défilement horizontal, 12 pt d'écart, dernier poster rogné pour signaler le scroll. Sur `images.jpeg`, **bouton « + » en haut à droite du poster** (ajout rapide, carré bordé de blanc).
Titre de section à gauche (24 pt bold) + lien **`VOIR TOUT`** bleu à droite (`s`) / chevron `>` (`images`).

### 3.7 `StatCard` ✅ `s`
Carte blanche : label MAJUSCULES « TEMPS PASSÉ À REGARDER » ; trois nombres 36 pt bold sur une ligne **`01  22  17`** avec légende dessous **Mois · Jours · Heures**. Deuxième carte à droite, rognée : « ÉPISO… » / « 18 au cours… » (nombre d'épisodes vus, texte tronqué : ❓ contenu exact inconnu).

### 3.8 `EmptyFavoriteTile` ✅ `s`
Tuile `#EEEEEC` de poster, grand « + » gris centré, sous le titre « Séries préférées » (16 pt, gris foncé).

### 3.9 `StarRating`, `EmotionPicker` 🟡 `a`
Voir §4.6.

### 3.10 `FollowButton` 🟡 `c`
Bouton vert « ✓ Followed » (pilule, texte blanc) en haut à droite de l'en-tête de série. ❓ Libellé et état « non suivi » inconnus.

### 3.11 `BrowseAllButton` ✅ `images`
Bannière jaune pleine largeur, icône dans une pastille noire à gauche, **`BROWSE ALL SHOWS`** MAJUSCULES bold + chevron `>`.

---

## 4. Écrans

### 4.1 Watchlist — « ÉPISODES À VOIR » ✅ (`v` principal ; `images`, `m`, `q`)
- Status bar → onglets supérieurs → `SectionChip "A VOIR"` + `GridToggle` → liste verticale d'`EpisodeCard` (virtualisée) → tab bar.
- Sections observées : **A VOIR / WATCH NEXT** (prochain épisode de chaque série suivie) puis **PAS COMMENCÉ / HAVEN'T STARTED** (`q.jpeg`). `f.jpeg` (autre app) montre une troisième section « NOT WATCHED IN A WHILE » — ❓ ne pas reprendre sans confirmation.
- Tri / filtres : **non visibles** → ❓ Q4. Le brief demande « tri et filtres identiques » mais aucune capture ne montre ces contrôles.
- Défilement : header (onglets) fixe, contenu scrolle ✅ 🟡.
- État vide, chargement (skeleton), hors-ligne : ❓ non couverts.

### 4.2 À venir — « A VENIR / UPCOMING » ✅ (`qx` principal ; `h`, `c` pour l'ancienne forme)
Version retenue (`qx`) :
- Fond de page gris, groupes séparés par une **pastille de date** (`JAN 13, 2024`) centrée ; sous chaque date, une ou plusieurs `EpisodeCard` **sans** compteur `+N`, avec badge jaune `NEW` quand c'est le premier épisode d'une saison/série.
- L'action de droite reste le bouton coche (cercle blanc) — ❓ cocher un épisode non diffusé : comportement inconnu.
- Grand espace vide au-dessus de la première date dans `qx` (probablement le scroll initial) — ❓ à confirmer.
- Anciennes versions : liste plate avec compte à rebours en jours (`h`, `c`). ❓ Les deux formes coexistent-elles ? → Q1.

### 4.3 Découvrir 🟡 (`images`, `m` — moitié droite)
- Champ de recherche en haut (« Search shows and movies » → « Rechercher un anime… ») sans bordure, texte gris.
- Rangées horizontales : **« Shows for you >»** (recommandations) puis **« Trending shows >»** (tendances), chacune un `PosterCarousel` avec bouton « + ».
- Bouton jaune `BROWSE ALL SHOWS` (§3.11) en bas.
- ❓ Le brief veut aussi : saison en cours, populaires, genres, recommandations. **Aucune capture ne montre la page « tout parcourir », les genres, ni le détail d'une rangée.** → Q5.

### 4.4 Recherche ❓ non couvert
Seul le champ au repos est visible (`images`). Suggestions, résultats, état de saisie, ajout rapide : **à fournir**.

### 4.5 Fiche série (→ fiche anime) 🟡 (`q`, `c`, `m` — anciennes versions)
Observé :
- **Bannière** plein-largeur avec dégradé, chevron de retour (en haut à gauche), titre de la série en blanc, menu `⋮` (`q`) ou roue dentée + partage (`c`).
- Ligne « S10E23 in 2 days » + **bouton vert « Followed »** + avatars d'amis « +1.2M » (`c`).
- Deux onglets sous la bannière : **ABOUT | EPISODES** (soulignement jaune sur l'actif).
- Onglet **EPISODES** : « WATCH NEXT » (carte-bannière du prochain épisode), « ALL EPISODES » + cercle coche à droite (**marquer toute la série**), puis lignes de saison pliables (§3.5) avec compteur `13/13`, coche verte à droite, barre de progression.

❓ Non couvert (le brief l'exige) : onglet ABOUT (synopsis, infos), liste d'épisodes d'une saison dépliée, « tout marquer jusqu'ici », personnages, similaires, **regroupement de franchise** (ex. une série = plusieurs saisons AniList), menu d'actions (retirer, favori, abandonner). **Version récente iOS de cette fiche inconnue** → Q5.

### 4.6 Fiche épisode 🟡 (`a.jpeg`, 166×296 : illisible en détail)
De haut en bas :
- Chevron « fermer » + **points de pagination** (swipe entre épisodes, 5 points).
- **Bannière** de l'épisode avec : pastille contour du nom de la série, bouton partage (haut droit), `S01 | E01` bold blanc, titre de l'épisode blanc.
- Ligne de dates : icône calendrier + date de diffusion (`Sep 13, 2019`) · icône + date de visionnage (`Mar 8, 2019`) ; à droite **bouton coche vert** (épisode vu).
- **« RATE THIS EPISODE »** : 5 étoiles jaunes avec libellé + pourcentage sous chacune (BAD · OK · GOOD · GREAT · WOW, la 5ᵉ grisée).
- **« HOW DID YOU FEEL? »** : tuiles d'émotion (emoji + libellé) en défilement horizontal : SHOCKED (sélectionnée = fond jaune), FRUSTRATED, SAD, REFLECTIVE…
- Sous le pli : ❓ **personnage préféré, commentaires, suite de la page** — jamais montrés.

⚠️ Libellés et emojis lus sur une image de 166 px : à confirmer avec une capture plus grande.

### 4.7 Profil ✅ partiel (`s`)
- Status bar → bloc de stats (`StatCard` × 2, défilement horizontal) → section **« Séries » + `VOIR TOUT`** + carrousel de posters (avec badge jaune sur le 3ᵉ) → **« Séries préférées »** avec tuile « + » vide.
- ❓ **L'en-tête du profil (avatar, pseudo, réglages), les sections « Films », « Terminés / En cours / Abandonnés », « Listes perso », les onglets internes, les réglages (langue, titres romaji/anglais, thème, import/export)** ne sont pas visibles.

### 4.8 Écrans demandés par le brief et absents des captures ❓
Import (CSV TV Time / AniList / MAL XML), export JSON, réglages, onboarding, connexion (phase 2), amis, fil d'activité, commentaires, notifications, listes perso, stats détaillées (terminés / abandonnés), fiche personnage, calendrier jour par jour (la vue À venir de `qx` est une liste par date, pas un calendrier mensuel).

---

## 5. Animations & interactions

| Interaction | Observé ? | Plan |
|---|---|---|
| Coche d'un épisode | État final seulement (`images.jpeg`) | Spring « pop » + remplissage vert + coche blanche (`motion.check`), **provisoire** |
| Transition de page (push) | ❌ | Slide iOS 0.35 s, parallax léger, **provisoire** |
| Swipe retour bord gauche | ❌ | Geste Framer Motion drag |
| Changement d'onglet supérieur | ❌ | Soulignement glissant, **provisoire** |
| Pull-to-refresh, haptique | ❌ | Non prévu sans demande |
| Popups (ex. note / émotion) | ❌ | À définir |

→ **Aucune vidéo fournie : fournir un enregistrement d'écran de TV Time (coche, push, popups) ou m'autoriser des animations approchantes (Q7).**

---

## 6. Adaptations « animes uniquement » (déductions du brief + captures)

- Numérotation `S03 | E02` **et** numéro absolu `(E151)` ✅ (`s.jpeg`) — AniList ne donne pas les épisodes par saison de façon unifiée : regroupement de franchise par relations SEQUEL/PREQUEL (cf. brief).
- Badge « PREMIERE » → dans `qx.jpeg` (animes) on voit **NEW** : à décliner « NOUVEAU » en FR.
- Posters : portrait 2:3 pour les carrousels, **recadrage paysage** dans `EpisodeCard` (les posters d'anime sont recadrés vers le haut).
- Réseaux (Netflix, FX…) → plateforme de streaming / studio ❓ Q4.
- Films : AniList a des films (`format: MOVIE`) — ❓ Q3.

---

## 7. Matrice de couverture du brief

| Fonctionnalité demandée | Captures | Verdict |
|---|---|---|
| Watchlist (à voir / pas commencé / retard / prochain / progression) | `v`, `q`, `images` | ✅ sauf tri/filtres et état « en retard » (seul `+N`) |
| À venir | `qx`, `h`, `c` | ✅ (liste par dates) — calendrier visuel ❓ |
| Découvrir (tendances, populaires, saison, reco, genres) | `images` | 🟡 tendances + reco seulement |
| Recherche | `images` (champ seul) | ❓ |
| Fiche anime (bannière, saisons, épisodes, infos, persos, similaires) | `q`, `c` (anciennes) | 🟡 |
| Fiche épisode | `a` | 🟡 |
| Profil et stats | `s` | 🟡 |
| Listes perso, terminés, abandonnés, favoris | `s` (favoris seulement) | ❓ |
| Import / export | — | ❓ |
| Réglages (romaji/anglais, thème…) | — | ❓ |
| Social / notifications (phase 2) | `c` (avatars « +1.2M ») | ❓ |

---

## 8. Questions ouvertes (bloquantes pour la phase 2)

- **Q1 — Cible visuelle.** Je pars sur la génération **récente** : iOS FR clair (`v`, `s`) + thème sombre (`qx`). Les captures `h`, `c`, `q` (ancienne : compte à rebours en jours, Android, onglets jaunes) servent seulement à compléter ce qui manque. OK ?
- **Q2 — `f.jpeg` (« Suite TV »).** C'est une autre app (tab bar flottante, cartes grises sur fond noir). Je l'**ignore** pour le style. OK ?
- **Q3 — Onglet « Films ».** Remplacer par quoi (Films d'anime ? Listes ? rien → 3 onglets) ?
- **Q4 — Contrôles non visibles.** Tri / filtres de la Watchlist, état « grille » du `GridToggle`, quoi afficher à la place du réseau (Netflix…), comportement des taps : captures ou description ?
- **Q5 — Écrans sans capture** : fiche anime (version récente), recherche, découvrir complet, import/export, réglages, listes perso. Vous en fournissez, ou je construis à partir des composants existants (en le signalant) ?
- **Q6 — Police.** Montserrat (gratuite, auto-hébergée) comme substitut de la police d'origine : OK ?
- **Q7 — Animations.** Pas de vidéo : en fournir une ou accepter des animations approchantes ?
- **Q8 — Nom, langue, thème.** Nom définitif de l'app (le brief dit « [TvTime] » entre crochets) ; interface en **français** (captures `v`, `s`) ; thème : suit le système, ou réglage manuel clair/sombre ?
