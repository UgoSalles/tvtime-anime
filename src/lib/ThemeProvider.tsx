import { useEffect, type ReactNode } from 'react';
import { light, dark, shadow, type ThemeColors } from '../theme';
import { useUi } from '../store/ui';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function apply(colors: ThemeColors, isDark: boolean) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(colors)) root.style.setProperty(`--c-${kebab(k)}`, v);
  root.style.setProperty('--c-yellow', '#FFD200');
  root.style.setProperty('--c-green', '#8CCD40');
  root.style.setProperty('--c-blue', '#2A7BC9');
  root.style.setProperty('--shadow-card', isDark ? shadow.cardDark : shadow.cardLight);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

// Appliqué avant le premier rendu pour éviter un flash de mauvais thème.
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const resolve = (pref: string) => (pref === 'system' ? mq.matches : pref === 'dark');
apply(resolve(useUi.getState().themePref) ? dark : light, resolve(useUi.getState().themePref));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useUi((s) => s.themePref);
  useEffect(() => {
    const run = () => apply(resolve(pref) ? dark : light, resolve(pref));
    run();
    mq.addEventListener('change', run);
    return () => mq.removeEventListener('change', run);
  }, [pref]);
  return <>{children}</>;
}
