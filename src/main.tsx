import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import './index.css';
import { ThemeProvider } from './lib/ThemeProvider';
import { App } from './App';
import { LibraryProvider } from './lib/library';

// networkMode « always » : les requêtes passent par notre cache IndexedDB, qui sait répondre hors-ligne
// (sinon React Query suspend tout tant que navigator.onLine est faux).
const queryClient = new QueryClient({ defaultOptions: { queries: { networkMode: 'always', retry: 1 }, mutations: { networkMode: 'always' } } });

// Demande un stockage « persistant » pour que le navigateur n'efface pas les suivis (ignoré sans effet par iOS).
navigator.storage?.persist?.().catch(() => undefined);
// Anciennes versions du cache de franchises (parcours tronqué à 6 saisons) : on les jette.
import('./lib/db').then(({ db }) => db.apiCache.where('key').startsWith('franchise3:').delete()).catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <LibraryProvider>
            <App />
          </LibraryProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
