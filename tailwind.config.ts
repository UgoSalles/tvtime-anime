import type { Config } from 'tailwindcss';
import { light, typography, fontFamily, radius, layout } from './src/theme';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

// Chaque token de couleur devient une variable CSS (posée par ThemeProvider) :
// le même nom de classe sert pour le thème clair et sombre.
const colors: Record<string, string> = Object.fromEntries(
  Object.keys(light).map((k) => [kebab(k), `var(--c-${kebab(k)})`]),
);

const fontSize = Object.fromEntries(
  Object.entries(typography).map(([k, t]) => [
    kebab(k),
    [`${t.size}px`, { lineHeight: `${t.lineHeight}px`, letterSpacing: `${t.letterSpacing}px`, fontWeight: String(t.weight) }],
  ]),
) as Record<string, [string, { lineHeight: string; letterSpacing: string; fontWeight: string }]>;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...colors, ink: 'var(--c-text-primary)', 'ink-2': 'var(--c-text-secondary)', 'ink-3': 'var(--c-text-tertiary)', yellow: 'var(--c-yellow)', green: 'var(--c-green)', blue: 'var(--c-blue)' },
      fontFamily: { sans: [fontFamily.sans] },
      fontSize,
      borderRadius: { card: `${radius.card}px`, badge: `${radius.badge}px`, poster: `${radius.poster}px` },
      spacing: { page: `${layout.pageMargin}px` },
    },
  },
  plugins: [],
} satisfies Config;
