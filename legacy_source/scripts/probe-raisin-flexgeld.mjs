/**
 * Probe Raisin API + flexgeld page for Flexgeld (NOTICE) products.
 * Run: node scripts/probe-raisin-flexgeld.mjs
 */
const API =
  'https://api2.weltsparen.de/dcms/v1/public/products?distribution_channel_id=raisin_direct_retail_deu&distributor_id=Raisin&limit=500';

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const data = await fetch(API, { headers: { Accept: 'application/json' } }).then((r) => r.json());

const noticeProducts = (data.entries ?? []).filter(
  (e) => e.product_type === 'NOTICE' || e.marketed_as_product_type === 'NOTICE',
);

const byBank = new Map();
for (const e of noticeProducts) {
  const b = e.deposit_taking_bank;
  if (!b?.bank_slug) continue;
  const rate = parseFloat(e.interest_rates?.interest_rate_nominal);
  if (!Number.isFinite(rate)) continue;
  const prev = byBank.get(b.bank_slug);
  if (!prev || rate > prev.rate) {
    byBank.set(b.bank_slug, {
      raisinSlug: b.bank_slug,
      name: b.name,
      legalName: b.legal_name,
      country: b.branch_country?.name ?? 'Unknown',
      rate,
      productName: e.display?.product_name,
      logoUrl: b.logo_url || b.bank_logo_url,
      minDeposit: e.conditions?.minimum_deposit?.amount ?? e.customer_deposit_limit?.minimum ?? 1,
      currency: e.currency ?? 'EUR',
    });
  }
}

console.log('NOTICE/Flexgeld banks from API:', byBank.size);
for (const v of [...byBank.values()].sort((a, b) => b.rate - a.rate)) {
  console.log(`  ${v.rate}%  ${v.name} (${v.raisinSlug})`);
}

// Also list OVERNIGHT as potential flexgeld partners on Raisin
const overnight = new Map();
for (const e of data.entries ?? []) {
  if (e.product_type !== 'OVERNIGHT') continue;
  const b = e.deposit_taking_bank;
  if (!b?.bank_slug) continue;
  const rate = parseFloat(e.interest_rates?.interest_rate_nominal);
  if (!overnight.has(b.bank_slug) || rate > overnight.get(b.bank_slug).rate) {
    overnight.set(b.bank_slug, { name: b.name, rate, raisinSlug: b.bank_slug });
  }
}
console.log('\nOVERNIGHT banks (Tagesgeld on Raisin):', overnight.size);

// Try flexgeld page HTML
const html = await fetch('https://www.raisin.com/de-de/flexgeld/', {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'de-DE' },
}).then((r) => r.text());

const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (nextMatch) {
  const next = JSON.parse(nextMatch[1]);
  const json = JSON.stringify(next);
  const slugs = [...new Set([...json.matchAll(/"bank_slug":"([^"]+)"/g)].map((m) => m[1]))];
  console.log('\n__NEXT_DATA__ bank_slug count:', slugs.length);
}

// Output JSON for seed script
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const out = {
  generatedAt: new Date().toISOString(),
  noticeBanks: [...byBank.values()],
  slugSuggestions: Object.fromEntries(
    [...byBank.values()].map((b) => [b.raisinSlug, slugify(b.name)]),
  ),
};

writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'raisin-flexgeld-notice.json'),
  JSON.stringify(out, null, 2),
);
console.log('\nWrote scripts/raisin-flexgeld-notice.json');
