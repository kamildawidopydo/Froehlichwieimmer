/**
 * Convert bunq-logo.svg → PNG + base64 embed for pdf-lib.
 * node scripts/prepare-bunq-logo.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'public/assets/bank-logos/bunq-logo.svg');
const outPng = path.join(root, 'public/assets/bank-logos/bunq-logo.png');

const buf = await sharp(src)
  .resize({ width: 800, withoutEnlargement: false })
  .png({ compressionLevel: 9 })
  .toBuffer();

fs.writeFileSync(outPng, buf);

const b64 = buf.toString('base64');
const js = `/** bunq logo PNG embedded for pdf-lib (no runtime fetch). */
export const BUNQ_LOGO_PNG_BASE64 = "${b64}";

export function getBunqLogoPngBytes() {
  const binary = atob(BUNQ_LOGO_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
`;

fs.writeFileSync(path.join(root, 'src/lib/bunqLogoPngBase64.js'), js);
const meta = await sharp(outPng).metadata();
console.log('wrote bunq-logo.png', meta.width, 'x', meta.height, buf.length, 'bytes');
