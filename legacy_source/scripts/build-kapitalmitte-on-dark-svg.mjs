/**
 * Build correct on-dark SVG: ink white, counters punched via mask, teal preserved.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoDir = path.join(__dirname, '..', 'public/assets/logo');
const src = await readFile(path.join(logoDir, 'kapitalmitte-logo.svg'), 'utf8');

const pathRe = /<path\b[^>]*>/g;
const paths = src.match(pathRe) || [];

const ink = [];
const counters = [];
const accent = [];
const other = [];

for (const p of paths) {
  if (p.includes('fill="white"') || p.includes("fill='white'")) {
    counters.push(p.replace(/fill="white"/, 'fill="black"').replace(/fill='white'/, "fill='black'"));
  } else if (p.includes('#1F6F6A') || p.includes('#348882')) {
    accent.push(p.replace('#348882', '#1F6F6A'));
  } else if (
    p.includes('#18252F') ||
    p.includes('#2B2A2C') ||
    p.includes('#464445') ||
    p.includes('url(#gradient')
  ) {
    ink.push(
      p
        .replaceAll('#18252F', '#FFFFFF')
        .replaceAll('#2B2A2C', '#FFFFFF')
        .replaceAll('#464445', '#FFFFFF')
        .replace(/fill="url\([^"]+\)"/, 'fill="#FFFFFF"'),
    );
  } else {
    other.push(p);
  }
}

const viewMatch = src.match(/viewBox="([^"]+)"/);
const widthMatch = src.match(/width="([^"]+)"/);
const heightMatch = src.match(/height="([^"]+)"/);
const viewBox = viewMatch ? viewMatch[1] : '40 420 960 200';
const width = widthMatch ? widthMatch[1] : '960';
const height = heightMatch ? heightMatch[1] : '200';
const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);

const out = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
  <defs>
    <mask id="km-counters" maskUnits="userSpaceOnUse" x="${vx}" y="${vy}" width="${vw}" height="${vh}">
      <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="white"/>
      ${counters.join('\n      ')}
    </mask>
  </defs>
  <g mask="url(#km-counters)">
    ${ink.join('\n    ')}
    ${other
      .map((p) =>
        p
          .replaceAll('#18252F', '#FFFFFF')
          .replaceAll('#2B2A2C', '#FFFFFF')
          .replaceAll('#464445', '#FFFFFF'),
      )
      .join('\n    ')}
  </g>
  ${accent.join('\n  ')}
</svg>
`;

await writeFile(path.join(logoDir, 'kapitalmitte-logo-on-dark.svg'), out);
console.log('wrote on-dark svg', {
  ink: ink.length,
  counters: counters.length,
  accent: accent.length,
  other: other.length,
});
