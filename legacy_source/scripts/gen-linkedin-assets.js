/**
 * Fallback SVG placeholders for LinkedIn preview.
 * Production PNGs are AI-generated and live under public/assets/social/linkedin/.
 * To regenerate PNGs, use Cursor image generation and copy into:
 *   employees/, comments/, logos/similar/, posts/, media/, products/, cover.png
 */
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../public/assets/social/linkedin');
['posts', 'products', 'media'].forEach((d) => fs.mkdirSync(path.join(base, d), { recursive: true }));

const LI_BLUE = '#0A66C2';
const INK = '#0A2540';
const GOLD = '#C9A227';

const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1584 396"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0%" stop-color="${INK}"/><stop offset="55%" stop-color="#123d66"/><stop offset="100%" stop-color="#0d3358"/></linearGradient></defs><rect width="1584" height="396" fill="url(#g)"/></svg>`;

const card = (title, sub, accent, w = 800, h = 450) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#F3F2EF"/><rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="4" fill="#fff" stroke="#E0E0E0"/><rect x="24" y="24" width="${w - 48}" height="5" fill="${accent}"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="${INK}" font-family="system-ui,sans-serif" font-size="28" font-weight="700">${title}</text><text x="${w / 2}" y="${h / 2 + 36}" text-anchor="middle" fill="#666" font-family="system-ui,sans-serif" font-size="14">${sub}</text></svg>`;

if (!fs.existsSync(path.join(base, 'cover.png'))) {
  fs.writeFileSync(path.join(base, 'cover.svg'), cover);
}

['sparvergleich', 'einlagensicherung', 'bonus', 'zinsrechner'].forEach((name, i) => {
  const colors = [LI_BLUE, INK, '#057642', GOLD];
  const p = path.join(base, `posts/${name}.svg`);
  if (!fs.existsSync(path.join(base, `posts/${name}.png`))) {
    fs.writeFileSync(p, card(name.toUpperCase(), 'Kapitalmitte', colors[i]));
  }
});

console.log('LinkedIn SVG fallbacks checked at', base);
