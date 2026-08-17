import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'public/assets/bank-logos/knab-logo.png');
const outPath = path.join(root, 'src/lib/knabLogoPngBase64.js');

const base64 = fs.readFileSync(pngPath).toString('base64');
const content = `/** Knab wordmark PNG embedded for pdf-lib (no runtime fetch). */
export const KNAB_LOGO_PNG_BASE64 = "${base64}";

export function getKnabLogoPngBytes() {
  const binary = atob(KNAB_LOGO_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
`;

fs.writeFileSync(outPath, content);
console.log(`Wrote ${outPath} (${base64.length} base64 chars)`);
