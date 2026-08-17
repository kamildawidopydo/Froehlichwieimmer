/**
 * Download bond issuer logos into public/assets/bond-logos/
 * Run: node scripts/download-bond-logos.mjs
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public/assets/bond-logos');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** slug -> { domain?, flag?, urls? } */
const ISSUERS = {
  de: { flag: 'de' },
  fr: { flag: 'fr' },
  it: { flag: 'it' },
  es: { flag: 'es' },
  be: { flag: 'be' },
  at: { flag: 'at' },
  nl: { flag: 'nl' },
  volkswagen: { domain: 'volkswagen.com' },
  'mercedes-benz': { domain: 'mercedes-benz.com' },
  bmw: { domain: 'bmw.com' },
  basf: { domain: 'basf.com' },
  siemens: { domain: 'siemens.com' },
  thyssenkrupp: { urls: ['https://financialmodelingprep.com/image-stock/TKA.DE.png'] },
  allianz: { domain: 'allianz.com' },
  'deutsche-bank': { domain: 'db.com' },
  'bnp-paribas': { domain: 'bnpparibas.com' },
  ing: { domain: 'ing.com' },
  unicredit: { domain: 'unicreditgroup.eu' },
  santander: { domain: 'santander.com' },
  vodafone: { domain: 'vodafone.com' },
  'deutsche-telekom': { domain: 'telekom.com' },
  telefonica: { domain: 'telefonica.com' },
  enel: { domain: 'enel.com' },
  edf: { urls: ['https://financialmodelingprep.com/image-stock/EDF.PA.png'] },
  eon: { urls: ['https://companiesmarketcap.com/img/company-logos/128/EOAN.DE.png'] },
  iberdrola: { domain: 'iberdrola.com' },
  engie: { domain: 'engie.com' },
  lvmh: { domain: 'lvmh.com' },
  sanofi: { domain: 'sanofi.com' },
  bayer: { domain: 'bayer.com' },
  heineken: { domain: 'heineken.com' },
  'ab-inbev': { domain: 'ab-inbev.com' },
};

async function fetchBuffer(url, minBytes = 200) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < minBytes) throw new Error(`too small (${buf.length}b) ${url}`);
  return buf;
}

async function logoFromDomain(domain) {
  const urls = [
    `https://unavatar.io/${domain}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
  for (const url of urls) {
    try {
      return await fetchBuffer(url);
    } catch {
      /* try next */
    }
  }
  throw new Error(`no logo for ${domain}`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  let ok = 0;
  let fail = 0;

  for (const [slug, cfg] of Object.entries(ISSUERS)) {
    const outPath = join(outDir, `${slug}.png`);
    try {
      let buf;
      if (cfg.flag) {
        buf = await fetchBuffer(`https://flagcdn.com/w320/${cfg.flag}.png`, 80);
      } else if (cfg.urls?.[0]) {
        buf = await fetchBuffer(cfg.urls[0]);
      } else if (cfg.domain) {
        buf = await logoFromDomain(cfg.domain);
      } else {
        throw new Error('no source');
      }
      writeFileSync(outPath, buf);
      console.log(`✓ ${slug}`);
      ok += 1;
    } catch (err) {
      console.warn(`✗ ${slug}: ${err.message}`);
      fail += 1;
    }
  }

  console.log(`\nDone: ${ok} saved, ${fail} failed → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
