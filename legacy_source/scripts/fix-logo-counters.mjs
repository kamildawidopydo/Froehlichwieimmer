/**
 * Punch Recraft white/pale counter fills to transparent, rebuild on-dark.
 * Usage: node scripts/fix-logo-counters.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoDir = path.join(__dirname, '..', 'public/assets/logo');

async function punchWhites(srcPath, outPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  let cleared = 0;
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 8) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const isWhite = r > 225 && g > 225 && b > 225;
    const isPaleBlue = b > 200 && g > 180 && r > 150 && b >= r && b - r < 80 && g > r - 10;
    if (isWhite || isPaleBlue) {
      out[i + 3] = 0;
      cleared += 1;
    }
  }
  const buf = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  await writeFile(outPath, buf);
  console.log(path.basename(outPath), `${info.width}x${info.height}`, 'cleared', cleared);
  return buf;
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
    if (r > 210 && g > 210 && b > 210) {
      out[i + 3] = 0;
      continue;
    }
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
  }
  await writeFile(
    outPath,
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(),
  );
  console.log('on-dark', path.basename(outPath));
}

const light = await punchWhites(
  path.join(logoDir, 'kapitalmitte-logo.png'),
  path.join(logoDir, 'kapitalmitte-logo.png'),
);
const mark = await punchWhites(
  path.join(logoDir, 'kapitalmitte-mark.png'),
  path.join(logoDir, 'kapitalmitte-mark.png'),
);
await toOnDark(light, path.join(logoDir, 'kapitalmitte-logo-on-dark.png'));
await toOnDark(mark, path.join(logoDir, 'kapitalmitte-mark-on-dark.png'));

let svg = await readFile(path.join(logoDir, 'kapitalmitte-logo.svg'), 'utf8');
svg = svg
  .replaceAll('fill="white"', 'fill="none"')
  .replaceAll('fill="#ACCDE5"', 'fill="none"')
  .replaceAll('fill="#DFEEF5"', 'fill="none"');
await writeFile(path.join(logoDir, 'kapitalmitte-logo.svg'), svg);

const darkSvg = svg
  .replaceAll('#2186D4', '#FFFFFF')
  .replaceAll('#2379B8', '#FFFFFF')
  .replaceAll('#2E79B2', '#FFFFFF');
await writeFile(path.join(logoDir, 'kapitalmitte-logo-on-dark.svg'), darkSvg);
console.log('svg ok');
