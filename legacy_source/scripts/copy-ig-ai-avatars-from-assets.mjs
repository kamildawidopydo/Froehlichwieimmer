/**
 * Copy AI-generated PNGs from Cursor assets into public Instagram avatars folder.
 * Usage: node scripts/copy-ig-ai-avatars-from-assets.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS =
  process.env.CURSOR_ASSETS_DIR ||
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.cursor/projects/c-Users-HP-Desktop-IT-dataweb/assets');
const OUT = path.join(__dirname, '../public/assets/social/instagram/avatars/generated');
const MANIFEST = path.join(__dirname, 'ig-avatar-manifest.json');

const slugs = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).map((x) => x.slug);
fs.mkdirSync(OUT, { recursive: true });

let copied = 0;
for (const slug of slugs) {
  const src = path.join(ASSETS, `${slug}.png`);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(OUT, `${slug}.png`);
  fs.copyFileSync(src, dest);
  copied++;
}
console.log(`Copied ${copied}/${slugs.length} PNGs → ${OUT}`);
