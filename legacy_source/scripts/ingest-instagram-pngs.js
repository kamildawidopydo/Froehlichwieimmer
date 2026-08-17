/**
 * Copies AI-generated PNGs from Cursor assets/ into public/assets/social/instagram/
 * and builds highlight covers (200x200 center crop) from first story slide per highlight.
 *
 * Prefer batch render: node scripts/render-instagram-stories.js
 * This script is for optional AI PNG overrides from staging.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '../public/assets/social/instagram');

const stagingCandidates = [
  path.join(process.env.USERPROFILE || '', '.cursor/projects/c-Users-HP-Desktop-IT-dataweb/assets'),
  path.join(__dirname, '../assets'),
];
const staging = stagingCandidates.find((p) => fs.existsSync(p));

const copies = [
  ['ig-avatar-lena-hartmann.png', 'avatars/comments/lena-hartmann.png'],
  ['ig-avatar-markus-schneider.png', 'avatars/comments/markus-schneider.png'],
  ['ig-avatar-kristin-neumann.png', 'avatars/comments/kristin-neumann.png'],
  ['ig-avatar-florian-kessler.png', 'avatars/comments/florian-kessler.png'],
  ['ig-avatar-mira-soldan.png', 'avatars/comments/mira-soldan.png'],
  ['ig-avatar-tobias-jenisch.png', 'avatars/comments/tobias-jenisch.png'],
  ['ig-avatar-sabine-wolff.png', 'avatars/comments/sabine-wolff.png'],
  ['ig-avatar-viktor-pohl.png', 'avatars/comments/viktor-pohl.png'],
  ['ig-avatar-andrea-fuchs.png', 'avatars/comments/andrea-fuchs.png'],
  ['ig-avatar-jonas-werth.png', 'avatars/comments/jonas-werth.png'],
  ['ig-post-sparvergleich.png', 'posts/post-sparvergleich.png'],
  ['ig-post-einlage.png', 'posts/post-einlage.png'],
  ['ig-post-bonus.png', 'posts/post-bonus.png'],
  ['ig-post-zinsen.png', 'posts/post-zinsen.png'],
  ['ig-post-tagesgeld.png', 'posts/post-tagesgeld.png'],
  ['ig-post-flexgeld.png', 'posts/post-flexgeld.png'],
  ['ig-post-frankfurt.png', 'posts/post-frankfurt.png'],
  ['ig-post-team.png', 'posts/post-team.png'],
  ['ig-post-europa.png', 'posts/post-europa.png'],
  ['ig-story-sparvergleich-1.png', 'stories/sparvergleich-1.png'],
  ['ig-story-sparvergleich-2.png', 'stories/sparvergleich-2.png'],
  ['ig-story-zinsen-1.png', 'stories/zinsen-1.png'],
  ['ig-story-zinsen-2.png', 'stories/zinsen-2.png'],
  ['ig-story-sicherheit-1.png', 'stories/sicherheit-1.png'],
  ['ig-story-sicherheit-2.png', 'stories/sicherheit-2.png'],
  ['ig-story-team-1.png', 'stories/team-1.png'],
  ['ig-story-team-2.png', 'stories/team-2.png'],
  ['ig-story-faq-1.png', 'stories/faq-1.png'],
  ['ig-story-faq-2.png', 'stories/faq-2.png'],
];

const highlightFromStory = [
  ['sparvergleich', 'stories/sparvergleich-1.png'],
  ['zinsen', 'stories/zinsen-1.png'],
  ['sicherheit', 'stories/sicherheit-1.png'],
  ['team', 'stories/team-1.png'],
  ['faq', 'stories/faq-1.png'],
];

async function main() {
  if (!fs.existsSync(staging)) {
    console.error('Staging folder not found:', staging);
    process.exit(1);
  }

  for (const [srcName, destRel] of copies) {
    const src = path.join(staging, srcName);
    const dest = path.join(OUT, destRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(src)) {
      console.warn('Missing:', srcName);
      continue;
    }
    const pipeline = sharp(src).rotate();
    if (destRel.startsWith('stories/')) {
      await pipeline.resize(1080, 1920, { fit: 'cover', position: 'centre' }).png({ quality: 92 }).toFile(dest);
    } else {
      await pipeline.toFile(dest);
    }
    console.log('OK', destRel);
  }

  for (const [id, storyRel] of highlightFromStory) {
    const storyPath = path.join(OUT, storyRel);
    const coverPath = path.join(OUT, `highlights/${id}.png`);
    if (!fs.existsSync(storyPath)) {
      console.warn('Skip highlight, missing story:', storyRel);
      continue;
    }
    await sharp(storyPath)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .png({ quality: 90 })
      .toFile(coverPath);
    console.log('OK highlights/', id, '.png');
  }

  console.log('Done. Staging:', staging);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
