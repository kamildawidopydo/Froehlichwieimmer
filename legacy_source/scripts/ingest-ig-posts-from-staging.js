/**
 * Resize AI-generated post PNGs from Cursor assets/ → public/.../instagram/posts/
 * Run after placing ig-post-*.png in staging (see ingest-instagram-pngs.js).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const stagingCandidates = [
  path.join(process.env.USERPROFILE || '', '.cursor/projects/c-Users-HP-Desktop-IT-dataweb/assets'),
  path.join(__dirname, '../assets'),
];
const staging = stagingCandidates.find((p) => fs.existsSync(p));
const OUT = path.join(__dirname, '../public/assets/social/instagram/posts');

const posts = [
  'ig-post-sparvergleich.png',
  'ig-post-einlage.png',
  'ig-post-bonus.png',
  'ig-post-frankfurt.png',
  'ig-post-team.png',
];

async function main() {
  if (!staging) {
    console.error('Staging not found');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const srcName of posts) {
    const destName = srcName.replace('ig-', '');
    const src = path.join(staging, srcName);
    const dest = path.join(OUT, destName);
    if (!fs.existsSync(src)) {
      console.warn('Missing:', srcName);
      continue;
    }
    await sharp(src)
      .rotate()
      .resize(1080, 1080, { fit: 'cover', position: 'centre' })
      .png({ quality: 92 })
      .toFile(dest);
    console.log('OK', destName);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
