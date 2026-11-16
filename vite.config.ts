import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME } from './src/appConfig';

// Sous-chemin d'hébergement (GitHub Pages : « /tvtime-anime/ »). Par défaut « / » (dev, Cloudflare, Vercel).
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg', 'splash/*.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Suivi de tes animes, épisode par épisode.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#FFD200',
        theme_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: `${base}index.html`,
        // Les données API (AniList en POST, Jikan) sont cachées par l'app elle-même dans IndexedDB
        // (src/api/cache.ts). Le service worker s'occupe des images, déjà vues = disponibles hors-ligne.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /(^|\.)anilist\.co$|(^|\.)crunchyroll\.com$|(^|\.)myanimelist\.net$/.test(url.hostname) && /\.(?:jpe?g|png|webp|gif|avif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'anime-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 24 * 3600, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
