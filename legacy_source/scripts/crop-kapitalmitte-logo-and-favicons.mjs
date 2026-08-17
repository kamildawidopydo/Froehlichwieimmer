/**
 * Crop kapitalmitte lockup tightly + generate mark favicons.
 * Usage: node scripts/crop-kapitalmitte-logo-and-favicons.mjs
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public/assets/logo/kapitalmitte-logo.png');
const markPath = path.join(root, 'public/assets/logo/kapitalmitte-mark.png');
const favDir = path.join(root, 'public/assets/favicon');
const desktopSrc = 'C:/Users/HP/Desktop/Kapitalmitte/kapitalmitte-logo-from-jpg-transparent.png';

// Prefer desktop source (full square) so we can re-crop cleanly
let srcBuf;
try {
  srcBuf = await readFile(desktopSrc);
} catch {
  srcBuf = await readFile(logoPath);
}

const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

let minX = info.width;
let minY = info.height;
let maxX = 0;
let maxY = 0;
const colHas = new Array(info.width).fill(false);

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a > 10) {
      colHas[x] = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

// Largest empty column gap = space between mark and wordmark
let bestGap = null;
let inGap = false;
let gapStart = 0;
for (let x = minX; x <= maxX; x += 1) {
  if (!colHas[x]) {
    if (!inGap) {
      inGap = true;
      gapStart = x;
    }
  } else if (inGap) {
    const w = x - gapStart;
    if (!bestGap || w > bestGap.w) bestGap = { start: gapStart, end: x - 1, w };
    inGap = false;
  }
}

const pad = 16;
const lockLeft = Math.max(0, minX - pad);
const lockTop = Math.max(0, minY - pad);
const lockW = Math.min(info.width - lockLeft, maxX - minX + 1 + pad * 2);
const lockH = Math.min(info.height - lockTop, maxY - minY + 1 + pad * 2);

const markRight = bestGap ? bestGap.start : Math.floor(minX + (maxX - minX) * 0.22);
const markLeft = Math.max(0, minX - pad);
const markTop = Math.max(0, minY - pad);
const markBottom = Math.min(info.height, maxY + pad);
const markW = markRight - markLeft;
const markH = markBottom - markTop;
const side = Math.max(markW, markH) + pad;
const markExtractLeft = Math.max(0, Math.floor(markLeft + markW / 2 - side / 2));
const markExtractTop = Math.max(0, Math.floor(markTop + markH / 2 - side / 2));
const markExtractW = Math.min(side, info.width - markExtractLeft);
const markExtractH = Math.min(side, info.height - markExtractTop);

const lockBuf = await sharp(srcBuf)
  .extract({ left: lockLeft, top: lockTop, width: lockW, height: lockH })
  .png()
  .toBuffer();
await writeFile(logoPath, lockBuf);

const markBuf = await sharp(srcBuf)
  .extract({
    left: markExtractLeft,
    top: markExtractTop,
    width: markExtractW,
    height: markExtractH,
  })
  .resize(512, 512, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();
await writeFile(markPath, markBuf);

await mkdir(favDir, { recursive: true });

const SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

for (const { name, size } of SIZES) {
  await sharp(markBuf)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(favDir, name));
  console.log('wrote', name);
}

const icoBuf = await toIco([
  await readFile(path.join(favDir, 'favicon-16x16.png')),
  await readFile(path.join(favDir, 'favicon-32x32.png')),
]);
await writeFile(path.join(favDir, 'favicon.ico'), icoBuf);
console.log('wrote favicon.ico');

await copyFile(logoPath, 'C:/Users/HP/Desktop/Kapitalmitte/kapitalmitte-logo-cropped.png');
await copyFile(markPath, 'C:/Users/HP/Desktop/Kapitalmitte/kapitalmitte-mark.png');

console.log('OK', {
  lock: { lockLeft, lockTop, lockW, lockH },
  mark: { markExtractLeft, markExtractTop, markExtractW, markExtractH, gap: bestGap },
});
