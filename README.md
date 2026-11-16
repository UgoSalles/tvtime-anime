# TvTime — suivi d'animes (PWA iPhone)

Application web installable sur l'écran d'accueil de l'iPhone pour suivre tes animes épisode par épisode :
watchlist, calendrier des sorties, découverte, fiches, notes et statistiques. Usage personnel et entre amis.
Les données (AniList) sont gratuites ; tes suivis restent **sur ton téléphone**.

## Pour mes amis : installer l'app sur iPhone

**Lien de l'app : https://ugosalles.github.io/tvtime-anime/**

> Il faut **Safari** (pas Chrome ni l'app d'un autre navigateur) et iOS 16.4 ou plus récent.

1. Ouvre le lien de l'app dans **Safari**.
2. Touche le bouton **Partager** (carré avec une flèche vers le haut, en bas de l'écran).
3. Fais défiler et choisis **Sur l'écran d'accueil**.
4. Touche **Ajouter**. L'icône jaune apparaît sur ton écran d'accueil.
5. Ouvre l'app **depuis cette icône** : elle s'affiche alors en plein écran, comme une vraie application.

### Bon à savoir
- **Premier lancement** : les premières pages se chargent lentement (AniList limite le débit). Ensuite tout est mis en cache.
- **Hors-ligne** : ce que tu as déjà consulté (séries, épisodes, images) reste disponible sans réseau.
- **Tes données sont locales** à ton téléphone. Si tu désinstalles l'app ou changes de téléphone, tu les perds :
  fais une **sauvegarde** de temps en temps (*Profil → Réglages → Exporter une sauvegarde*), puis enregistre le fichier dans *Fichiers*.
- **Restaurer** : *Réglages → Restaurer une sauvegarde*.
- **Importer ton historique** : *Réglages → Importer* accepte l'export CSV de TV Time, un compte AniList (liste publique) ou un export XML de MyAnimeList.
- **Mise à jour** : l'app se met à jour toute seule ; ferme-la complètement et rouvre-la pour obtenir la dernière version.
- Pas de compte ni de serveur : tout reste sur ton téléphone (pas de notifications push ni de partage entre amis).

## Pour moi : développer et déployer

```bash
npm install
npm run dev          # http://localhost:5173 (réseau local : --host déjà activé)
npm run build        # compile + génère le service worker dans dist/
npm run preview      # sert dist/ pour tester la PWA hors-ligne
npm run typecheck
node scripts/gen-icons.mjs   # régénère icônes et écrans de lancement iOS
```

Les PWA exigent **HTTPS** : développement local sur `localhost` uniquement, puis déploiement ci-dessous.

### GitHub Pages (en place)
Chaque `git push` sur `main` lance `.github/workflows/deploy.yml` : build avec `VITE_BASE=/tvtime-anime/`, copie `404.html` (routes profondes), puis publication sur
https://ugosalles.github.io/tvtime-anime/ . Pour tester le build avec ce sous-chemin en local : `VITE_BASE=/tvtime-anime/ npm run build && npm run preview`.

### Cloudflare Pages (autre option)
1. *Workers & Pages → Create → Pages → Connect to Git* (ou *Direct Upload* du dossier `dist/`).
2. Build command : `npm run build` · Output directory : `dist`.
3. `public/_redirects` et `public/_headers` gèrent la redirection SPA et le cache du service worker.

### Vercel
1. *Add New → Project*, importe le dépôt. Framework : Vite (détecté).
2. `vercel.json` gère la redirection SPA et les en-têtes.

### Changer le nom de l'app
Le nom est défini dans `src/appConfig.ts`, `index.html` (`<title>` et `apple-mobile-web-app-title`) et le manifest généré par `vite.config.ts`.

## Architecture (résumé)
- Vite + React + TypeScript strict, React Router, TanStack Query, Zustand, Tailwind (tokens dans `src/theme.ts`), Framer Motion.
- Données : AniList GraphQL (`src/api/anilist.ts`) et Jikan (`src/api/jikan.ts`), file d'attente à jetons + retry, cache IndexedDB (`src/api/cache.ts`).
- Franchises : les saisons AniList sont regroupées par relations PREQUEL/SEQUEL (`src/api/franchise.ts`).
- Données utilisateur : Dexie (`src/lib/db.ts`, `src/db/`).
- Import / export : `src/io/`. Spécification (inventaire des écrans, design tokens relevés) : `SPEC.md`.
