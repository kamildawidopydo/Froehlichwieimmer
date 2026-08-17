/**
 * Generates Instagram comment avatars via OpenAI Images API (DALL·E 3).
 * Requires OPENAI_API_KEY in environment.
 *
 * Usage: node scripts/generate-ig-comment-avatars.mjs
 * Optional: node scripts/generate-ig-comment-avatars.mjs p01-lena-hartmann  (single slug)
 * Optional: node scripts/generate-ig-comment-avatars.mjs --force  (overwrite all PNGs)
 *
 * Without OPENAI_API_KEY use: node scripts/generate-ig-portraits-ai.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(__dirname, 'ig-avatar-manifest.json');
const OUT_DIR = path.join(ROOT, 'public/assets/social/instagram/avatars/generated');
const SIZE = 256;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateOne({ slug, prompt }, apiKey) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: `${prompt}. Square 1:1 composition, centered face, no text, no watermark, suitable for small circular avatar crop.`,
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${slug}: ${res.status} ${err}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${slug}: no image data`);

  const buf = Buffer.from(b64, 'base64');
  const outPath = path.join(OUT_DIR, `${slug}.png`);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set. Export it and run again.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const all = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const force = process.argv.includes('--force');
  const filterSlug = process.argv.find((a) => a !== '--force' && !a.endsWith('.mjs'));
  const items = filterSlug ? all.filter((x) => x.slug === filterSlug) : all;

  if (items.length === 0) {
    console.error('No manifest entries to generate.');
    process.exit(1);
  }

  console.log(`Generating ${items.length} avatar(s) → ${OUT_DIR}`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const outPath = path.join(OUT_DIR, `${item.slug}.png`);
    if (!force && !filterSlug && fs.existsSync(outPath)) {
      console.log(`[${i + 1}/${items.length}] skip ${item.slug} (exists)`);
      continue;
    }
    try {
      await generateOne(item, apiKey);
      console.log(`[${i + 1}/${items.length}] ok ${item.slug}.png`);
    } catch (e) {
      console.error(`[${i + 1}/${items.length}] FAIL ${item.slug}:`, e.message);
    }
    if (i < items.length - 1) await sleep(1200);
  }

  console.log('Done.');
}

main();
