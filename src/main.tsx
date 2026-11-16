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

// networkMode « always » : les requêtes passent par notre cache IndexedDB, qui sait répondre hors-ligne
// (sinon React Query suspend tout tant que navigator.onLine est faux).
const queryClient = new QueryClient({ defaultOptions: { queries: { networkMode: 'always', retry: 1 }, mutations: { networkMode: 'always' } } });

// Demande un stockage « persistant » pour que le navigateur n'efface pas les suivis (ignoré sans effet par iOS).
navigator.storage?.persist?.().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
