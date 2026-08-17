/**
 * Generate Flexgeld banks/offers from Raisin Weltsparen API (NOTICE products)
 * and download bank logos from Raisin CDN.
 *
 * Run: node scripts/generate-flexgeld-from-raisin.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logosDir = join(root, 'public', 'assets', 'bank-logos');

const API =
  'https://api2.weltsparen.de/dcms/v1/public/products?distribution_channel_id=raisin_direct_retail_deu&distributor_id=Raisin&limit=500';

/** Our slug -> Raisin bank_slug (existing catalog) */
const EXISTING_SLUG_MAP = {
  'banca-progetto': 'banca-progetto',
  'bluor-bank-as': 'blu-or-bank-as',
  'lea-bank': 'lea-bank-ab',
  'illimity-bank': 'illimity',
  'lhv-pank': 'lhv-pank',
  'vivibanca': 'vi-vi-banca',
  'distingo-bank': 'distingo-bank',
  'morrow-bank': 'morrow-bank',
  'collector-bank': 'collector',
  'mano-bankas': 'ab-mano-bankas',
  inbank: 'inbank',
  'nordax-bank': 'nordax-bank-ab-publ',
  'klarna-bank': 'klarna-bank-ab',
  'resurs-bank': 'resurs-bank',
  'citadele-banka': 'cbl-bank',
  'artea-ab': 'artea-ab',
  'coop-pank': 'coop-pank',
  'bff-bank': 'bff',
  'medirect-bank': 'me-direct-bank-malta-plc',
  instabank: 'instabank-asa',
  unicredit: 'uni-credit-nv-sa',
};

/** Raisin slug -> preferred our slug (new banks) */
const RAISIN_TO_OUR_SLUG = {
  'imprebanca': 'imprebanca',
  'civi-bank': 'civi-bank',
  'first-investment-bank-ad-fibank': 'fibank',
};

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function ourSlugForRaisin(raisinSlug, bankName) {
  if (RAISIN_TO_OUR_SLUG[raisinSlug]) return RAISIN_TO_OUR_SLUG[raisinSlug];
  for (const [our, raisin] of Object.entries(EXISTING_SLUG_MAP)) {
    if (raisin === raisinSlug) return our;
  }
  return slugify(bankName || raisinSlug);
}

function logoExt(url) {
  const m = url.match(/\.(png|jpe?g|svg|webp)(\?|$)/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

async function downloadLogo(slug, url) {
  if (!url) return null;
  const ext = logoExt(url);
  const dest = join(logosDir, `${slug}.${ext}`);
  if (existsSync(dest)) return `/assets/bank-logos/${slug}.${ext}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Kapitalmitte/1.0 (logo-sync)' },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    writeFileSync(dest, buf);
    return `/assets/bank-logos/${slug}.${ext}`;
  } catch {
    return null;
  }
}

const data = await fetch(API, {
  headers: { Accept: 'application/json', 'User-Agent': 'Kapitalmitte/1.0' },
}).then((r) => r.json());

const noticeByRaisin = new Map();
for (const e of data.entries ?? []) {
  if (e.product_type !== 'NOTICE' && e.marketed_as_product_type !== 'NOTICE') continue;
  const b = e.deposit_taking_bank;
  if (!b?.bank_slug) continue;
  const rate = parseFloat(e.interest_rates?.interest_rate_nominal);
  if (!Number.isFinite(rate) || rate <= 0) continue;

  const prev = noticeByRaisin.get(b.bank_slug);
  if (!prev || rate > prev.rate) {
    noticeByRaisin.set(b.bank_slug, {
      raisinSlug: b.bank_slug,
      name: b.name || b.legal_name,
      country: b.branch_country?.name ?? 'Unknown',
      rate,
      productName: e.display?.product_name ?? '',
      logoUrl: b.logo_url || b.bank_logo_url,
      minDeposit:
        e.conditions?.minimum_deposit?.amount ??
        e.customer_deposit_limit?.minimum ??
        500,
      depositProtection:
        b.statutory_deposit_guarantee_scheme?.name ??
        'EU-Einlagensicherung',
      websiteUrl: `https://www.raisin.com/de-de/bank/${b.bank_slug}/`,
    });
  }
}

mkdirSync(logosDir, { recursive: true });

const banks = [];
for (const entry of noticeByRaisin.values()) {
  const slug = ourSlugForRaisin(entry.raisinSlug, entry.name);
  const logoPath = await downloadLogo(slug, entry.logoUrl);
  banks.push({ ...entry, slug, logoPath });
  console.log(`${entry.rate}%  ${entry.name} -> ${slug}${logoPath ? ' [logo]' : ''}`);
}

// Build reverse map for raisin.ts
const newSlugMapEntries = {};
for (const b of banks) {
  newSlugMapEntries[b.slug] = b.raisinSlug;
}

let sql = `-- Flexgeld offers from Raisin NOTICE products (${new Date().toISOString().slice(0, 10)})
-- Source: https://www.raisin.com/de-de/flexgeld/ via Weltsparen API
-- One Flexgeld offer per bank; daily rate sync via savings-rates-sync (NOTICE)

`;

for (const b of banks) {
  sql += `
-- ${b.name} (${b.raisinSlug})
insert into public.banks (name, slug, country, website_url, logo_url, deposit_protection, deposit_protection_amount, is_active)
select '${esc(b.name)}', '${esc(b.slug)}', '${esc(b.country)}', '${esc(b.websiteUrl)}', ${b.logoPath ? `'${esc(b.logoPath)}'` : 'null'}, '${esc(b.depositProtection)}', '100.000 €', true
where not exists (select 1 from public.banks where slug = '${esc(b.slug)}');

update public.banks
set
  website_url = coalesce(website_url, '${esc(b.websiteUrl)}'),
  logo_url = coalesce(logo_url, ${b.logoPath ? `'${esc(b.logoPath)}'` : 'null'})
where slug = '${esc(b.slug)}';

insert into public.savings_offers (
  interest_rate, deposit_term, min_deposit, investment_type, interest_frequency,
  currency, early_withdrawal, bonus_amount, is_active, bank_id, bank_link,
  deposit_protection, description
)
select
  ${b.rate}, 0, ${b.minDeposit}, 'Flexgeld', 'Monatlich', 'EUR',
  'Mit Kündigungsfrist (je nach Anbieter)', 0, true, bk.id,
  '${esc(b.websiteUrl)}', '100.000 €',
  '${esc(`${b.name} Flexgeld über Raisin: ${b.rate}% p.a. (${b.productName}). Stand: Raisin/Weltsparen API.`)}'
from public.banks bk
where bk.slug = '${esc(b.slug)}'
  and not exists (
    select 1 from public.savings_offers o
    where o.bank_id = bk.id and o.investment_type = 'Flexgeld' and o.is_active = true
  );

update public.savings_offers o
set
  interest_rate = ${b.rate},
  min_deposit = ${b.minDeposit},
  deposit_term = 0,
  investment_type = 'Flexgeld',
  bank_link = '${esc(b.websiteUrl)}',
  description = '${esc(`${b.name} Flexgeld über Raisin: ${b.rate}% p.a. (${b.productName}). Stand: Raisin/Weltsparen API.`)}'
from public.banks bk
where o.bank_id = bk.id and bk.slug = '${esc(b.slug)}' and o.investment_type = 'Flexgeld';
`;
}

sql += `
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, current_date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug in (${banks.map((b) => `'${esc(b.slug)}'`).join(', ')})
  and o.investment_type = 'Flexgeld'
on conflict do nothing;
`;

const migrationPath = join(
  root,
  'supabase',
  'migrations',
  '20260522240000_raisin_flexgeld_offers.sql',
);
writeFileSync(migrationPath, sql);

const raisinTsPath = join(root, 'supabase', 'functions', 'savings-rates-sync', 'raisin.ts');
let raisinTs = readFileSync(raisinTsPath, 'utf8');
for (const [our, raisin] of Object.entries(newSlugMapEntries)) {
  if (!raisinTs.includes(`'${our}':`)) {
    raisinTs = raisinTs.replace(
      /('unicredit': 'uni-credit-nv-sa',)\n(\};)/,
      `$1\n  '${our}': '${raisin}',\n$2`,
    );
  }
}
writeFileSync(raisinTsPath, raisinTs);

writeFileSync(
  join(__dirname, 'raisin-flexgeld-generated.json'),
  JSON.stringify({ banks, slugMap: newSlugMapEntries }, null, 2),
);

console.log(`\nWrote ${migrationPath}`);
console.log(`Banks: ${banks.length}`);
