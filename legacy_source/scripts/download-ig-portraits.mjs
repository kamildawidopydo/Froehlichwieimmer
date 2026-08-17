/**
 * Download unique casual portrait photos per commenter slug (local JPG assets).
 * Usage: node scripts/download-ig-portraits.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'ig-avatar-manifest.json');
const OUT_DIR = path.join(__dirname, '../public/assets/social/instagram/avatars/generated');

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const isFemaleSlug = (slug, prompt) => {
  if (/\bwoman\b/i.test(prompt) || /\bfrau\b/i.test(prompt)) return true;
  if (/\bman\b/i.test(prompt) && !/\bwoman\b/i.test(prompt)) return false;
  const first = slug.replace(/^p\d+-/, '').split('-')[0] ?? '';
  const female = new Set([
    'lena', 'sophie', 'nadine', 'elena', 'hannah', 'kristin', 'corinna', 'melanie', 'katrin',
    'mira', 'sabine', 'annika', 'claudia', 'ines', 'andrea', 'kerstin', 'birgit', 'greta', 'jana',
    'daniela', 'heike', 'ulrike', 'sonja', 'julia', 'susanne', 'kirsten', 'petra', 'simone', 'sandra',
    'lisa', 'ute', 'monika', 'nicole', 'silke', 'beate', 'marion', 'ute', 'kathrin', 'svenja',
  ]);
  return female.has(first);
};

const pickUniqueIndex = (slug, gender, used) => {
  const max = 99;
  for (let attempt = 0; attempt < max; attempt++) {
    const idx = (hash(slug) + attempt * 17) % max;
    const key = `${gender}-${idx}`;
    if (!used.has(key)) {
      used.add(key);
      return idx;
    }
  }
  return hash(slug) % max;
};

const download = async (url, dest) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const items = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const used = new Set();
let ok = 0;
let fail = 0;

for (const { slug, prompt } of items) {
  const female = isFemaleSlug(slug, prompt);
  const gender = female ? 'women' : 'men';
  const idx = pickUniqueIndex(slug, gender, used);
  const url = `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
  const dest = path.join(OUT_DIR, `${slug}.jpg`);
  try {
    await download(url, dest);
    ok++;
    process.stdout.write(`✓ ${slug}.jpg\n`);
  } catch (e) {
    fail++;
    console.error(`✗ ${slug}: ${e.message}`);
  }
}

console.log(`Done: ${ok} saved, ${fail} failed → ${OUT_DIR}`);
