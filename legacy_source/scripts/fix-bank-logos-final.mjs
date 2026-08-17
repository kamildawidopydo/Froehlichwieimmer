import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../public/assets/bank-logos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** Manually verified — official sites + Wikimedia Commons */
const LOGOS = {
  'morrow-bank': 'https://upload.wikimedia.org/wikipedia/commons/d/df/Morrow_logo.svg',
  'lhv-pank': 'https://www.lhv.ee/assets/images/lhv-logo.svg',
  'saxo-privatbank': 'https://upload.wikimedia.org/wikipedia/commons/4/40/Saxo_Bank_logo.svg',
  'instabank': 'https://instabank.no/wp-content/uploads/2020/11/Ny-logo-pa-lys-bakgrunn.png',
  'resurs-bank': 'https://www.resursbank.se/assets/resurs_logo_rgb_black-73d9aa60.svg',
  's-pankki': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/S-pankki.svg',
  'bank-norwegian': 'https://res.cloudinary.com/banknorwegian/image/upload/statics/logo_dark.svg',
  'sydbank': 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sydbank.svg',
  'tf-bank': 'https://www.tfbank.se/static/svg/logo/se/h26/575651.svg',
  'inbank': 'https://inbank.ee/images/og-logo.png',
  'lunar-bank': 'https://www.lunar.app/favicon.svg',
  'oma-saastopankki': 'https://www.omasp.fi/themes/custom/omasp/assets/images/omasp-logo.svg',
  'coop-bank': 'https://coopbank.dk/cbimg/coop_bank_logo.png',
  'ebn-banco': 'https://d28luerk5zbkgl.cloudfront.net/wp-content/uploads/2025/05/ebn_logo_mobile.png',
  'banco-bpi': 'https://www.bancobpi.pt/SitePublico_SiteBancoBPI/img/safaripinnedtab.svg',
  'kommunalkredit-invest': 'https://www.kommunalkredit.at/_assets/3c96c19b5126d45e422fe553d82b0325/Template/dist/assets/img/logo.svg',
  'openbank': 'https://www.openbank.es/assets/logo_topbar/Logo_Web_8_0.svg',
  'pibank': 'https://www.pibank.es/wp-content/uploads/2017/12/pibank-logo.svg',
  'swissquote': 'https://www.swissquote.com/api/internal/media/get-media?filename=2023-09/swissquote-logo.png',
  'postfinance': 'https://upload.wikimedia.org/wikipedia/commons/9/95/PostFinance_Logo.svg',
};

function ext(ct, url) {
  if (ct?.includes('svg') || url.endsWith('.svg')) return 'svg';
  if (url.endsWith('.webp')) return 'webp';
  if (url.endsWith('.jpg')) return 'jpg';
  return 'png';
}

async function download(slug, url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const head = buf.subarray(0, 80).toString('utf8').toLowerCase();
  if (head.includes('<html') || buf.length < 200) throw new Error('invalid');
  const e = ext(res.headers.get('content-type'), url);
  for (const old of ['png', 'svg', 'webp', 'jpg']) {
    const p = join(outDir, `${slug}.${old}`);
    if (existsSync(p)) unlinkSync(p);
  }
  writeFileSync(join(outDir, `${slug}.${e}`), buf);
  return `/assets/bank-logos/${slug}.${e}`;
}

const results = {};
for (const [slug, url] of Object.entries(LOGOS)) {
  try {
    await new Promise((r) => setTimeout(r, 600));
    results[slug] = await download(slug, url);
    console.log(`✓ ${slug}: ${results[slug]} (${url})`);
  } catch (e) {
    console.error(`✗ ${slug}: ${e.message}`);
  }
}

let sql = `-- HQ bank logos — manual re-download (${new Date().toISOString().slice(0, 10)})\n\n`;
for (const [slug, logoUrl] of Object.entries(results)) {
  sql += `update public.banks set logo_url = '${logoUrl}' where slug = '${slug}';\n`;
}
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations/20260522150000_bank_logos_hq_redownload.sql'), sql);
console.log(`\n${Object.keys(results).length}/20`);
