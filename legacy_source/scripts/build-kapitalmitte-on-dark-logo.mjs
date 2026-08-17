/**
 * Build on-dark logo variants: ink → white, Mitte teal preserved.
 * Usage: node scripts/build-kapitalmitte-on-dark-logo.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoDir = path.join(root, 'public/assets/logo');

const TEAL = { r: 31, g: 111, b: 106 }; // Zentrum Mitte #1F6F6A

function isTeal(r, g, b) {
  return g > r + 15 && b > r + 5 && g > 70 && g < 210 && r < 120;
}

function isLight(r, g, b) {
  return r > 210 && g > 210 && b > 210;
}

async function toOnDark(srcPath, outPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

    if (isTeal(r, g, b)) {
      out[i] = TEAL.r;
      out[i + 1] = TEAL.g;
      out[i + 2] = TEAL.b;
      out[i + 3] = 255;
    } else if (isLight(r, g, b)) {
      // letter counters → transparent so dark bg shows through
      out[i + 3] = 0;
    } else {
      // ink / dark strokes → white
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
    }
  }

  const buf = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  await writeFile(outPath, buf);
  console.log('wrote', path.basename(outPath), info.width + 'x' + info.height);
}

await toOnDark(
  path.join(logoDir, 'kapitalmitte-logo.png'),
  path.join(logoDir, 'kapitalmitte-logo-on-dark.png'),
);
await toOnDark(
  path.join(logoDir, 'kapitalmitte-mark.png'),
  path.join(logoDir, 'kapitalmitte-mark-on-dark.png'),
);
