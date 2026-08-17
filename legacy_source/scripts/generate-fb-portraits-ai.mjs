/**
 * Regenerate Facebook comment avatars (footer preview modal) via Pollinations Flux.
 * Output: public/assets/social/facebook/avatars/comments/{slug}.png
 *
 * Usage:
 *   node scripts/generate-fb-portraits-ai.mjs
 *   node scripts/generate-fb-portraits-ai.mjs sandra-voigt
 *   FB_AVATAR_DELAY_MS=8000 node scripts/generate-fb-portraits-ai.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'fb-comment-avatar-manifest.json');
const OUT_DIR = path.join(__dirname, '../public/assets/social/facebook/avatars/comments');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const buildPrompt = (base) =>
  `${base}. Authentic casual Facebook profile picture, realistic smartphone photo, natural skin texture, imperfect lighting, no text, no watermark, no logo, square crop friendly, not studio corporate headshot.`;

const imageUrl = (prompt, seed) => {
  const q = encodeURIComponent(buildPrompt(prompt));
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
  const filterSlug = process.argv[2];
  const items = filterSlug ? all.filter((x) => x.slug === filterSlug) : all;

  if (items.length === 0) {
    console.error('No manifest entries.');
    process.exit(1);
  }

  const onlyMissing = process.argv.includes('--only-missing');
  console.log(`AI-generating ${items.length} Facebook avatar(s) → ${OUT_DIR}\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i++) {
    const { slug, prompt } = items[i];
    const seed = hash(slug) % 2147483647;
    const url = imageUrl(prompt, seed);
    const dest = path.join(OUT_DIR, `${slug}.png`);
    if (onlyMissing && fs.existsSync(dest) && fs.statSync(dest).size > 30000) {
      console.log(`[${i + 1}/${items.length}] skip ${slug} (exists)`);
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
    if (i < items.length - 1) {
      await sleep(Number(process.env.FB_AVATAR_DELAY_MS) || 12000);
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main();
