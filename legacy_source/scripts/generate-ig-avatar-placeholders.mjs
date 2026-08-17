/**
 * Fallback avatars (unique SVG per slug) when GPT PNGs are not generated yet.
 * Usage: node scripts/generate-ig-avatar-placeholders.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'ig-avatar-manifest.json');
const OUT_DIR = path.join(__dirname, '../public/assets/social/instagram/avatars/generated');

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const initialsFromSlug = (slug) => {
  const parts = slug.replace(/^p\d+-/, '').split('-').filter(Boolean);
  const a = parts[0]?.[0] ?? '?';
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return (a + b).toUpperCase();
};

const svgFor = (slug) => {
  const h = hash(slug);
  const hue = h % 360;
  const hue2 = (hue + 40) % 360;
  const initials = initialsFromSlug(slug);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue},42%,42%)"/>
      <stop offset="100%" style="stop-color:hsl(${hue2},48%,28%)"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="96" r="52" fill="hsl(${hue},30%,72%)"/>
  <ellipse cx="128" cy="220" rx="78" ry="56" fill="hsl(${hue},30%,72%)"/>
  <text x="128" y="138" text-anchor="middle" font-family="system-ui,sans-serif" font-size="56" font-weight="600" fill="white">${initials}</text>
</svg>`;
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const items = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
for (const { slug } of items) {
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.svg`), svgFor(slug), 'utf8');
}
console.log(`Wrote ${items.length} placeholder SVGs to ${OUT_DIR}`);
