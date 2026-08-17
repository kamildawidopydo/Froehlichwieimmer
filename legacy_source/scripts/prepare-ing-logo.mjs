/**
 * Convert ing-logo.jpg → PNG + base64 embed for pdf-lib.
 * node scripts/prepare-ing-logo.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'public/assets/bank-logos/ing-logo.jpg');
const outPng = path.join(root, 'public/assets/bank-logos/ing-logo.png');

const buf = await sharp(src)
  .trim({ threshold: 10 })
  .resize({ width: 800, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer();

fs.writeFileSync(outPng, buf);

const b64 = buf.toString('base64');
const js = `/** ING logo PNG embedded for pdf-lib (no runtime fetch). */
export const ING_LOGO_PNG_BASE64 = "${b64}";

export function getIngLogoPngBytes() {
  const binary = atob(ING_LOGO_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
`;

fs.writeFileSync(path.join(root, 'src/lib/ingLogoPngBase64.js'), js);
const meta = await sharp(outPng).metadata();
console.log('wrote ing-logo.png', meta.width, 'x', meta.height, buf.length, 'bytes');
console.log('wrote ingLogoPngBase64.js');
