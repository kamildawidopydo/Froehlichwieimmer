/**
 * Install Desktop kapitalmitte2006 as site logo + mark + favicons.
 * Usage: node scripts/install-kapitalmitte2006-logo.mjs
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoDir = path.join(root, 'public/assets/logo');
const favDir = path.join(root, 'public/assets/favicon');
const desktopSvg = 'C:/Users/HP/Desktop/KAPITALMITTE/kapitalmitte2006.svg';
const desktopJpg = 'C:/Users/HP/Desktop/KAPITALMITTE/kapitalmitte2006.jpg';

await mkdir(logoDir, { recursive: true });
await mkdir(favDir, { recursive: true });

let svg = await readFile(desktopSvg, 'utf8');
// Drop solid canvas background; keep letter counters white until raster punch
svg = svg.replace(
  /<path fill="white" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"\s*\/>/,
  '',
);

const lightSvgPath = path.join(logoDir, 'kapitalmitte-logo.svg');
await writeFile(lightSvgPath, svg);

/** Make near-white / pale counter fills transparent; keep brand blues. */
async function punchCounters(srcBuf) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 8) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const isWhite = r > 225 && g > 225 && b > 225;
    const isPale = b > 180 && g > 160 && r > 130 && b >= r - 5 && g > r - 15 && b - r < 100;
    if (isWhite || isPale) out[i + 3] = 0;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function toOnDark(srcBuf) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 12) {
      out[i + 3] = 0;
      continue;
    }
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r > 210 && g > 210 && b > 210) {
      out[i + 3] = 0;
      continue;
    }
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function cropTight(srcBuf, pad = 12) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return srcBuf;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(info.width - left, maxX - minX + 1 + pad * 2);
  const height = Math.min(info.height - top, maxY - minY + 1 + pad * 2);
  return sharp(srcBuf).extract({ left, top, width, height }).png().toBuffer();
}

async function contentBounds(srcBuf) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  const colHas = new Array(info.width).fill(false);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 10) {
        colHas[x] = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
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
  return { minX, minY, maxX, maxY, bestGap, width: info.width, height: info.height };
}

// Raster from SVG (prefer vector); fall back to JPG if needed
let raster;
try {
  raster = await sharp(Buffer.from(svg))
    .resize(2048, 2048, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
} catch {
  raster = await sharp(desktopJpg)
    .ensureAlpha()
    .resize(2048, 2048, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

let lightPng = await punchCounters(raster);
lightPng = await cropTight(lightPng, 16);

const logoPath = path.join(logoDir, 'kapitalmitte-logo.png');
await writeFile(logoPath, lightPng);

const onDarkPng = await toOnDark(lightPng);
await writeFile(path.join(logoDir, 'kapitalmitte-logo-on-dark.png'), onDarkPng);

// Dark SVG: brand ink → white, counters transparent
let darkSvg = svg
  .replaceAll('fill="white"', 'fill="none"')
  .replaceAll('fill="#CBEEF8"', 'fill="none"')
  .replaceAll('fill="#84C4F5"', 'fill="none"')
  .replaceAll('#2878B4', '#FFFFFF');
await writeFile(path.join(logoDir, 'kapitalmitte-logo-on-dark.svg'), darkSvg);

// Mark = left emblem before largest column gap
const bounds = await contentBounds(lightPng);
const pad = 8;
const markRight = bounds.bestGap ? bounds.bestGap.start : Math.floor(bounds.minX + (bounds.maxX - bounds.minX) * 0.28);
const markLeft = Math.max(0, bounds.minX - pad);
const markTop = Math.max(0, bounds.minY - pad);
const markBottom = Math.min(bounds.height, bounds.maxY + pad);
const markW = Math.max(1, markRight - markLeft);
const markH = Math.max(1, markBottom - markTop);
const side = Math.max(markW, markH) + pad;
const markExtractLeft = Math.max(0, Math.floor(markLeft + markW / 2 - side / 2));
const markExtractTop = Math.max(0, Math.floor(markTop + markH / 2 - side / 2));
const markExtractW = Math.min(side, bounds.width - markExtractLeft);
const markExtractH = Math.min(side, bounds.height - markExtractTop);

const markBuf = await sharp(lightPng)
  .extract({
    left: markExtractLeft,
    top: markExtractTop,
    width: markExtractW,
    height: markExtractH,
  })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const markPath = path.join(logoDir, 'kapitalmitte-mark.png');
await writeFile(markPath, markBuf);
await writeFile(path.join(logoDir, 'kapitalmitte-mark-on-dark.png'), await toOnDark(markBuf));

const SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

for (const { name, size } of SIZES) {
  await sharp(markBuf)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(favDir, name));
}

await writeFile(
  path.join(favDir, 'favicon.ico'),
  await toIco([
    await readFile(path.join(favDir, 'favicon-16x16.png')),
    await readFile(path.join(favDir, 'favicon-32x32.png')),
  ]),
);

const meta = await sharp(lightPng).metadata();
console.log('OK', {
  logo: `${meta.width}x${meta.height}`,
  markGap: bounds.bestGap,
  files: ['kapitalmitte-logo.png', 'kapitalmitte-logo-on-dark.png', 'kapitalmitte-mark.png', 'favicons'],
});
