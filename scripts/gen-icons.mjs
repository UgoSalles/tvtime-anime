// Génère le logo original (écran + coche) en PNG : icônes PWA et splash screens iOS.
// Aucune dépendance : rasterisation par supersampling + encodeur PNG (zlib).
// Usage : node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const YELLOW = [255, 210, 0];
const BLACK = [17, 17, 17];

// ── géométrie du logo, en coordonnées normalisées [0,1] ────────────────────
const sdRoundRect = (px, py, cx, cy, hx, hy, r) => {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdSegment = (px, py, ax, ay, bx, by) => {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
};
const T = 0.055; // épaisseur du trait
/** true si le point (x,y) du logo est noir. */
function glyph(x, y) {
  const screen = Math.abs(sdRoundRect(x, y, 0.5, 0.47, 0.27, 0.2, 0.07)) < T / 2;
  const foot = sdSegment(x, y, 0.4, 0.76, 0.6, 0.76) < T / 2;
  const check =
    sdSegment(x, y, 0.4, 0.47, 0.475, 0.55) < T / 2 + 0.004 ||
    sdSegment(x, y, 0.475, 0.55, 0.62, 0.38) < T / 2 + 0.004;
  return screen || foot || check;
}

/** Rendu `size`×`size` (ou w×h) ; le logo occupe `scale` de la plus petite dimension. */
function render(w, h, { bg, scale }) {
  const px = Buffer.alloc(w * h * 4);
  const s = Math.min(w, h) * scale;
  const ox = (w - s) / 2, oy = (h - s) / 2;
  const SS = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let j = 0; j < SS; j++)
        for (let i = 0; i < SS; i++) {
          const u = (x + (i + 0.5) / SS - ox) / s;
          const v = (y + (j + 0.5) / SS - oy) / s;
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1 && glyph(u, v)) hit++;
        }
      const a = hit / (SS * SS);
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(bg[c] * (1 - a) + BLACK[c] * a);
      px[o + 3] = 255;
    }
  }
  return px;
}

// ── encodeur PNG ───────────────────────────────────────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
mkdirSync('public/splash', { recursive: true });

// Icônes : fond jaune plein cadre (iOS arrondit lui-même ; pas de transparence).
const icons = [
  ['apple-touch-icon.png', 180, 1.0],
  ['icon-192.png', 192, 1.0],
  ['icon-512.png', 512, 1.0],
  ['icon-maskable-512.png', 512, 0.8], // zone de sécurité 80 %
];
for (const [name, size, scale] of icons)
  writeFileSync(`public/icons/${name}`, png(size, size, render(size, size, { bg: YELLOW, scale })));

// Splash screens iPhone : fond jaune, logo centré (un tiers de la largeur).
// [largeur pt, hauteur pt, ratio] — media queries correspondantes dans index.html.
export const splashSizes = [
  [430, 932, 3], [393, 852, 3], [390, 844, 3], [428, 926, 3], [414, 896, 3],
  [414, 896, 2], [375, 812, 3], [414, 736, 3], [375, 667, 2], [360, 780, 3],
];
for (const [w, h, r] of splashSizes) {
  const W = w * r, H = h * r;
  const px = render(W, H, { bg: YELLOW, scale: (W * 0.36) / Math.min(W, H) });
  writeFileSync(`public/splash/${W}x${H}.png`, png(W, H, px));
}

writeFileSync(
  'public/icons/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#FFD200"/><g fill="none" stroke="#111" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"><rect x="23" y="27" width="54" height="40" rx="7"/><path d="M40 76h20M40 47l7.5 8 14.5-17"/></g></svg>`,
);
console.log('icônes et splash générés');
