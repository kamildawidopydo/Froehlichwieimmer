import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/assets/bank-logos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const LAST = {
  'saxo-privatbank': 'https://www.home.saxo/-/media/global/logos/saxo-2022/saxo-beinvested-logo-blue.svg',
  'sydbank': 'https://thebanks.eu/img/logos/Sydbank.png',
  'postfinance': 'https://www.postfinance.ch/content/dam/pfch/image/about/company/pf_logo_on_yellow.png',
};

function ext(ct, url) {
  if (ct?.includes('svg') || url.endsWith('.svg')) return 'svg';
  return 'png';
}

async function dl(slug, url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  const e = ext(res.headers.get('content-type'), url);
  for (const old of ['png', 'svg', 'webp', 'jpg']) {
    const p = join(outDir, `${slug}.${old}`);
    if (existsSync(p)) unlinkSync(p);
  }
  writeFileSync(join(outDir, `${slug}.${e}`), buf);
  return `/assets/bank-logos/${slug}.${e}`;
}

for (const [slug, url] of Object.entries(LAST)) {
  const path = await dl(slug, url);
  console.log(`✓ ${slug}: ${path}`);
}

// Rebuild SQL for all 20 slugs
const SLUGS = [
  'komplett-bank', 'lhv-pank', 'saxo-privatbank', 'instabank', 'resurs-bank', 's-pankki', 'bank-norwegian',
  'sydbank', 'tf-bank', 'inbank', 'lunar-bank', 'oma-saastopankki', 'coop-bank', 'ebn-banco', 'banco-bpi',
  'kommunalkredit-invest', 'openbank', 'pibank', 'swissquote', 'postfinance',
];
const exts = ['svg', 'png', 'webp', 'jpg'];
let sql = `-- HQ bank logos — manual re-download (${new Date().toISOString().slice(0, 10)})\n\n`;
for (const slug of SLUGS) {
  const hit = exts.map((e) => `${slug}.${e}`).find((f) => existsSync(join(outDir, f)));
  if (hit) sql += `update public.banks set logo_url = '/assets/bank-logos/${hit}' where slug = '${slug}';\n`;
}
writeFileSync(join(root, 'supabase/migrations/20260522150000_bank_logos_hq_redownload.sql'), sql);
console.log('SQL updated');
