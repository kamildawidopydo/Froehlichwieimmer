/**
 * Install Desktop SVG as site logo + PNG for email; build on-dark SVG.
 * Usage: node scripts/install-kapitalmitte-svg-logo.mjs
 */
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoDir = path.join(root, 'public/assets/logo');
const desktopSvg = 'C:/Users/HP/Desktop/Kapitalmitte/kapitalmitte-logo-transparent.svg';

let svg = await readFile(desktopSvg, 'utf8');

// Brand teal alignment
svg = svg.replaceAll('#348882', '#1F6F6A');

const lightPath = path.join(logoDir, 'kapitalmitte-logo.svg');
await writeFile(lightPath, svg);

// On-dark: ink → white, counters transparent, teal stays
let dark = svg;
dark = dark.replaceAll('fill="white"', 'fill="none"');
dark = dark.replaceAll('#18252F', '#FFFFFF');
dark = dark.replaceAll('#2B2A2C', '#FFFFFF');
dark = dark.replaceAll('#464445', '#FFFFFF');
dark = dark.replaceAll('#14232F', '#FFFFFF');
dark = dark.replaceAll('#302F2E', '#FFFFFF');
// Unique gradient id for dark file
dark = dark.replaceAll('gradient_0', 'gradient_on_dark');
dark = dark.replace(
  /stop-color="#FFFFFF"/g,
  'stop-color="#FFFFFF"',
);

const darkPath = path.join(logoDir, 'kapitalmitte-logo-on-dark.svg');
await writeFile(darkPath, dark);

// Email/PNG from light SVG (transparent bg)
const pngBuf = await sharp(Buffer.from(svg))
  .resize({
    width: 1120,
    height: 240,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const pngPath = path.join(logoDir, 'kapitalmitte-logo.png');
await writeFile(pngPath, pngBuf);

// On-dark PNG for clients that still need raster on dark
const onDarkPng = await sharp(Buffer.from(dark))
  .resize({
    width: 1120,
    height: 240,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();
await writeFile(path.join(logoDir, 'kapitalmitte-logo-on-dark.png'), onDarkPng);

await copyFile(lightPath, 'C:/Users/HP/Desktop/Kapitalmitte/kapitalmitte-logo.svg');
await copyFile(pngPath, 'C:/Users/HP/Desktop/Kapitalmitte/kapitalmitte-logo-email.png');

console.log('OK', {
  lightPath,
  darkPath,
  pngPath,
  pngBytes: pngBuf.length,
});
