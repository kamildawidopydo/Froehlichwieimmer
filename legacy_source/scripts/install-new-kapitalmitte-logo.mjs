/**
 * Install Desktop Kapitalmitte logo (SVG + JPG) into public assets,
 * crop lockup/mark, build on-dark variants, regenerate favicons.
 *
 * Usage: node scripts/install-new-kapitalmitte-logo.mjs
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
const desktopDir = 'C:/Users/HP/Desktop/Kapitalmitte';
const desktopSvg = path.join(desktopDir, 'kapitalmitte.svg');

function stripWhiteCanvas(svg) {
  // Recraft full-bleed white square — remove only the outer canvas path
  return svg.replace(
    /<path fill="white" d="M0 0L4096 0L4096 4096L0 4096L0 0Z"\s*\/>/,
    '',
  );
}

async function alphaBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  return { data, info, minX, minY, maxX, maxY, colHas };
}

function largestGap(colHas, minX, maxX) {
  let best = null;
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
      if (!best || w > best.w) best = { start: gapStart, end: x - 1, w };
      inGap = false;
    }
  }
  return best;
}

async function toOnDark(srcBuf, outPath) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a < 12) {
      out[i + 3] = 0;
      continue;
    }
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    // Keep near-white counters transparent on dark surfaces
    if (r > 210 && g > 210 && b > 210) {
      out[i + 3] = 0;
      continue;
    }
    // Very light blue fills in emblem → soft white
    if (r > 170 && g > 190 && b > 210 && b >= r) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.min(255, Math.round(a * 0.85));
      continue;
    }
    // Brand cobalt / ink → white
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
  }
  await writeFile(
    outPath,
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(),
  );
}

let svg = await readFile(desktopSvg, 'utf8');
svg = stripWhiteCanvas(svg);
// Align brand blues to site primary #2186D4 where close
svg = svg.replaceAll('#2379B8', '#2186D4').replaceAll('#2E79B2', '#2186D4');
// Cap raster size for sharp
svg = svg
  .replace('width="4096"', 'width="2000"')
  .replace('height="4096"', 'height="2000"');

const lightSvgPath = path.join(logoDir, 'kapitalmitte-logo.svg');
await writeFile(lightSvgPath, svg.replace('width="2000"', 'width="4096"').replace('height="2000"', 'height="4096"'));

// Rasterize, trim, pad
const rendered = await sharp(Buffer.from(svg), { density: 72, limitInputPixels: false })
  .resize({ width: 2000, height: 2000, fit: 'inside' })
  .ensureAlpha()
  .png()
  .toBuffer();

const { info, minX, minY, maxX, maxY, colHas } = await alphaBounds(rendered);
const pad = 24;
const lockLeft = Math.max(0, minX - pad);
const lockTop = Math.max(0, minY - pad);
const lockW = Math.min(info.width - lockLeft, maxX - minX + 1 + pad * 2);
const lockH = Math.min(info.height - lockTop, maxY - minY + 1 + pad * 2);

const lockBuf = await sharp(rendered)
  .extract({ left: lockLeft, top: lockTop, width: lockW, height: lockH })
  .png()
  .toBuffer();

const logoPngPath = path.join(logoDir, 'kapitalmitte-logo.png');
await writeFile(logoPngPath, lockBuf);

const gap = largestGap(colHas, minX, maxX);
const markRight = gap ? gap.start : Math.floor(minX + (maxX - minX) * 0.28);
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

const markBuf = await sharp(rendered)
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

await toOnDark(lockBuf, path.join(logoDir, 'kapitalmitte-logo-on-dark.png'));
await toOnDark(markBuf, path.join(logoDir, 'kapitalmitte-mark-on-dark.png'));

// On-dark SVG from the stored light SVG
const storedSvg = await readFile(lightSvgPath, 'utf8');
let darkSvg = storedSvg
  .replaceAll('#2186D4', '#FFFFFF')
  .replaceAll('#2379B8', '#FFFFFF')
  .replaceAll('#2E79B2', '#FFFFFF')
  .replaceAll('#ACCDE5', '#FFFFFF')
  .replaceAll('#DFEEF5', '#FFFFFF');
await writeFile(path.join(logoDir, 'kapitalmitte-logo-on-dark.svg'), darkSvg);

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
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(favDir, name));
}
const icoBuf = await toIco([
  await readFile(path.join(favDir, 'favicon-16x16.png')),
  await readFile(path.join(favDir, 'favicon-32x32.png')),
]);
await writeFile(path.join(favDir, 'favicon.ico'), icoBuf);

await copyFile(logoPngPath, path.join(desktopDir, 'kapitalmitte-logo-cropped.png'));
await copyFile(markPath, path.join(desktopDir, 'kapitalmitte-mark.png'));

console.log('OK', {
  lock: { lockLeft, lockTop, lockW, lockH },
  mark: { markExtractLeft, markExtractTop, markExtractW, markExtractH, gap },
  pngBytes: lockBuf.length,
});
