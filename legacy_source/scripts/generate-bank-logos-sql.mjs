import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoDir = join(root, 'public/assets/bank-logos');

const SLUGS = [
  'lhv-pank', 'lea-bank', 'nordax-bank', 'leaseplan-bank', 's-pankki', 'illimity-bank', 'lunar-bank', 'knab',
  'oma-saastopankki', 'coop-bank', 'ebn-banco', 'banca-progetto', 'klarna-bank', 'saxo-privatbank', 'instabank',
  'resurs-bank', 'sbab-bank', 'nibc-direct', 'medirect-bank', 'tf-bank', 'inbank', 'bigbank', 'bank-norwegian',
  'sydbank', 'argenta', 'bff-bank', 'blueorange-bank', 'mano-bankas', 'pop-pankki', 'banco-invest', 'ikano-bank',
  'jt-direktbank', 'vivibanca', 'banco-bpi', 'crelan', 'distingo-bank', 'kommunalkredit-invest', 'postfinance',
  '1822direkt', 'santander-deutschland', 'trade-republic', 'openbank', 'ca-auto-bank', 'consorsbank', 'hello-bank',
  'easybank', 'suresse-direkt-bank', 'citadele-banka', 'komplett-bank', 'collector-bank', 'siauliu-bankas', 'pibank',
  'anadi-bank', 'swissquote', 'renault-bank-direkt',
];

const files = readdirSync(logoDir);
const exts = ['svg', 'png', 'webp', 'jpg'];

let sql = `-- Bank logos for comparison catalog (55 new banks)\n-- Generated ${new Date().toISOString().slice(0, 10)}\n\n`;
const missing = [];

for (const slug of SLUGS) {
  const hit = exts.map((e) => `${slug}.${e}`).find((f) => files.includes(f));
  if (!hit) {
    missing.push(slug);
    continue;
  }
  sql += `update public.banks set logo_url = '/assets/bank-logos/${hit}' where slug = '${slug}';\n`;
}

writeFileSync(join(root, 'supabase/migrations/20260522140000_comparison_bank_logos.sql'), sql);
console.log(`SQL written for ${SLUGS.length - missing.length}/${SLUGS.length} banks`);
if (missing.length) console.log('Missing:', missing.join(', '));
