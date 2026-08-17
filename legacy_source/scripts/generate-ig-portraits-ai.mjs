/**
 * Regenerate all Instagram comment avatars via AI (Pollinations Flux).
 * Replaces existing PNG in public/assets/social/instagram/avatars/generated/
 *
 * Usage:
 *   node scripts/generate-ig-portraits-ai.mjs
 *   node scripts/generate-ig-portraits-ai.mjs --force
 *   node scripts/generate-ig-portraits-ai.mjs p01-lena-hartmann
 *   IG_AVATAR_DELAY_MS=10000 node scripts/generate-ig-portraits-ai.mjs --force
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'ig-avatar-manifest.json');
const OUT_DIR = path.join(__dirname, '../public/assets/social/instagram/avatars/generated');
const SEED_SALT = 'ig-natural-v32';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const ANGLES = [
  'slight 3/4 turn to the left, eyes toward camera',
  'slight 3/4 turn to the right, relaxed natural expression',
  'straight-on at eye level, soft candid smile',
  'gentle selfie angle from slightly above',
  'chin slightly down, friendly approachable look',
  'head tilted a few degrees, informal portrait',
];

const SHOTS = [
  'iPhone front-camera selfie, soft indoor window light',
  'friend snapped a quick smartphone portrait outdoors',
  'casual photo near a café window, shallow depth of field',
  'golden hour outdoor portrait with natural shadows',
  'living room lamp light, authentic unposed snap',
  'office hallway background blur, everyday clothes',
  'weekend park walk photo, natural daylight',
  'car passenger seat selfie, soft daylight',
];

const buildPrompt = (slug, base) => {
  const h = hash(slug);
  const angle = ANGLES[h % ANGLES.length];
  const shot = SHOTS[(h >> 4) % SHOTS.length];
  const subject = base
    .replace(/^Photorealistic (profile )?headshot of /i, '')
    .replace(/^Photorealistic profile photo headshot of /i, '');
  return [
    subject,
    angle,
    shot,
    'real German person Instagram profile picture',
    'candid not staged, natural skin texture and subtle asymmetry',
    'slight mobile-photo grain, imperfect lighting',
    'not studio corporate headshot, not glamour retouch',
    'no text, no watermark, no logo, square crop friendly',
  ].join(', ');
};

const imageUrl = (prompt, seed) => {
  const q = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${q}?width=512&height=512&model=flux&nologo=true&enhance=true&seed=${seed}`;
};

async function download(url, dest, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) {
        const text = (await res.text()).slice(0, 120);
        throw new Error(`Not an image: ${text}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2000) throw new Error(`Image too small (${buf.length} bytes)`);
      const optimized = await sharp(buf)
        .resize(512, 512, { fit: 'cover', position: 'attention' })
        .png({ compressionLevel: 9, quality: 88 })
        .toBuffer();
      fs.writeFileSync(dest, optimized);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(3000);
    }
  }
  throw lastErr;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const all = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const onlyMissing = args.includes('--only-missing');
  const filterSlug = args.find((a) => !a.startsWith('-') && /^p\d{2}-/.test(a));
  const items = filterSlug ? all.filter((x) => x.slug === filterSlug) : all;

  if (items.length === 0) {
    console.error('No manifest entries.');
    process.exit(1);
  }

  console.log(`AI-generating ${items.length} Instagram avatar(s) → ${OUT_DIR}\n`);

  let ok = 0;
  let fail = 0;
  const delay = Number(process.env.IG_AVATAR_DELAY_MS) || 12000;

  for (let i = 0; i < items.length; i++) {
    const { slug, prompt } = items[i];
    const seed = hash(`${SEED_SALT}:${slug}`) % 2147483647;
    const fullPrompt = buildPrompt(slug, prompt);
    const url = imageUrl(fullPrompt, seed);
    const dest = path.join(OUT_DIR, `${slug}.png`);
    if (!force && !filterSlug && onlyMissing && fs.existsSync(dest) && fs.statSync(dest).size > 30000) {
      console.log(`[${i + 1}/${items.length}] skip ${slug} (exists)`);
      continue;
    }
    if (!force && !filterSlug && !onlyMissing && fs.existsSync(dest) && fs.statSync(dest).size > 30000) {
      console.log(`[${i + 1}/${items.length}] skip ${slug} (exists, use --force)`);
      continue;
    }
    try {
      await download(url, dest);
      ok++;
      const kb = Math.round(fs.statSync(dest).size / 1024);
      console.log(`[${i + 1}/${items.length}] ✓ ${slug}.png (${kb} KB)`);
    } catch (e) {
      fail++;
      console.error(`[${i + 1}/${items.length}] ✗ ${slug}: ${e.message}`);
    }
    if (i < items.length - 1) await sleep(delay);
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main();
