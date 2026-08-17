/**
 * Regenerate favicons from kapitalmitte mark.
 * Usage: node scripts/generate-favicons.mjs
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public/assets/logo/kapitalmitte-mark.png');
const outDir = path.join(root, 'public/assets/favicon');

const SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

await mkdir(outDir, { recursive: true });

for (const { name, size } of SIZES) {
  const outPath = path.join(outDir, name);
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`wrote ${name}`);
}

const icoBuf = await toIco([
  await readFile(path.join(outDir, 'favicon-16x16.png')),
  await readFile(path.join(outDir, 'favicon-32x32.png')),
]);
await writeFile(path.join(outDir, 'favicon.ico'), icoBuf);
console.log('wrote favicon.ico');
