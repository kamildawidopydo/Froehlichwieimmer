import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const srcSvg = 'C:/Users/HP/Desktop/Kapitalmitte/logo-lockup-for-brand--kapitalmitte---left-side-a-.svg';
const desktopDir = 'C:/Users/HP/Desktop/Kapitalmitte';
const publicDir = path.join(root, 'public/assets/logo');

let svg = fs.readFileSync(srcSvg, 'utf8');

// Remove full-canvas white background only (keep letter counter whites)
const bgPath = '<path fill="white" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"/>';
if (!svg.includes(bgPath)) {
  console.error('Background path not found — aborting');
  process.exit(1);
}
svg = svg.replace(bgPath, '');

// Crop to lockup bounds with padding
svg = svg
  .replace('width="1024" height="1024"', 'width="960" height="200"')
  .replace('viewBox="0 0 1024 1024"', 'viewBox="40 420 960 200"');

const outSvgPublic = path.join(publicDir, 'kapitalmitte-logo.svg');
const outPngPublic = path.join(publicDir, 'kapitalmitte-logo.png');
const outSvgDesk = path.join(desktopDir, 'kapitalmitte-logo-transparent.svg');
const outPngDesk = path.join(desktopDir, 'kapitalmitte-logo-transparent.png');

fs.writeFileSync(outSvgPublic, svg);
fs.writeFileSync(outSvgDesk, svg);

const pngBuf = await sharp(Buffer.from(svg))
  .resize({
    width: 1920,
    height: 400,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

fs.writeFileSync(outPngPublic, pngBuf);
fs.writeFileSync(outPngDesk, pngBuf);

console.log('OK', {
  outSvgPublic,
  outPngPublic,
  outSvgDesk,
  outPngDesk,
  pngBytes: pngBuf.length,
});
