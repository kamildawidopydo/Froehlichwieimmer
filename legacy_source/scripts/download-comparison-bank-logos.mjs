/**
 * Download real bank logos — Wikimedia API, official sites, og:image fallback.
 * Run: node scripts/download-comparison-bank-logos.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public/assets/bank-logos');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** slug -> { wikimedia?: string, urls?: string[], homepage?: string } */
const BANKS = {
  'lhv-pank': { homepage: 'https://www.lhv.ee', wikimedia: 'LHV_Pank_logo.svg' },
  'lea-bank': { homepage: 'https://www.leabank.no' },
  'nordax-bank': { homepage: 'https://www.nordaxbank.se', wikimedia: 'Nordax_Bank_logo.svg' },
  'leaseplan-bank': { homepage: 'https://www.leaseplanbank.nl' },
  's-pankki': { homepage: 'https://www.s-pankki.fi', wikimedia: 'S-Pankki_logo.svg' },
  'illimity-bank': { homepage: 'https://www.illimity.com' },
  'lunar-bank': { homepage: 'https://www.lunar.app' },
  'knab': { homepage: 'https://www.knab.nl' },
  'oma-saastopankki': { homepage: 'https://www.omasp.fi' },
  'coop-bank': { homepage: 'https://www.coopbank.dk' },
  'ebn-banco': { homepage: 'https://www.ebnbanco.es' },
  'banca-progetto': { homepage: 'https://www.bancaprogetto.it' },
  'klarna-bank': { wikimedia: 'Klarna_Logo_black.svg', homepage: 'https://www.klarna.com' },
  'saxo-privatbank': { homepage: 'https://www.home.saxo' },
  'instabank': { homepage: 'https://www.instabank.no' },
  'resurs-bank': { homepage: 'https://www.resursbank.se' },
  'sbab-bank': { homepage: 'https://www.sbab.se' },
  'nibc-direct': { homepage: 'https://www.nibc.nl' },
  'medirect-bank': { homepage: 'https://www.medirect.be' },
  'tf-bank': { homepage: 'https://www.tfbank.se' },
  'inbank': { homepage: 'https://www.inbank.ee' },
  'bigbank': { homepage: 'https://www.bigbank.eu', wikimedia: 'Bigbank_logo.svg' },
  'bank-norwegian': { homepage: 'https://www.banknorwegian.no' },
  'sydbank': { homepage: 'https://www.sydbank.dk', wikimedia: 'Sydbank_logo.svg' },
  'argenta': { homepage: 'https://www.argenta.be', wikimedia: 'Argenta_logo.svg' },
  'bff-bank': { homepage: 'https://www.bff.com' },
  'blueorange-bank': { homepage: 'https://www.blueorangebank.eu' },
  'mano-bankas': { homepage: 'https://www.manobankas.lt' },
  'pop-pankki': { homepage: 'https://www.poppankki.fi' },
  'banco-invest': { homepage: 'https://www.invest.pt' },
  'ikano-bank': { homepage: 'https://www.ikanobank.com' },
  'jt-direktbank': { homepage: 'https://www.jtbank.eu' },
  'vivibanca': { homepage: 'https://www.vivibanca.it' },
  'banco-bpi': { wikimedia: 'Banco_BPI_logo.svg', homepage: 'https://www.bancobpi.pt' },
  'crelan': { homepage: 'https://www.crelan.be', wikimedia: 'Crelan_logo.svg' },
  'distingo-bank': { homepage: 'https://www.distingo.eu' },
  'kommunalkredit-invest': { homepage: 'https://www.kommunalkredit.at' },
  'postfinance': { wikimedia: 'PostFinance_logo.svg', homepage: 'https://www.postfinance.ch' },
  '1822direkt': { homepage: 'https://www.1822direkt.de' },
  'santander-deutschland': {
    urls: ['https://upload.wikimedia.org/wikipedia/commons/b/b3/Santander_Logo.svg'],
    homepage: 'https://www.santander.de',
  },
  'trade-republic': { wikimedia: 'Trade_Republic_logo_2021.svg', homepage: 'https://traderepublic.com' },
  'openbank': { homepage: 'https://www.openbank.es' },
  'ca-auto-bank': { homepage: 'https://www.ca-autobank.it' },
  'consorsbank': { homepage: 'https://www.consorsbank.de' },
  'hello-bank': { homepage: 'https://www.hellobank.be' },
  'easybank': { wikimedia: 'Easybank_logo.svg', homepage: 'https://www.easybank.at' },
  'suresse-direkt-bank': { homepage: 'https://www.suresse-direkt.de' },
  'citadele-banka': { wikimedia: 'Citadele logo RGB.png', homepage: 'https://www.citadele.lv' },
  'komplett-bank': { homepage: 'https://www.komplettbank.no' },
  'collector-bank': { homepage: 'https://www.collectorbank.se' },
  'siauliu-bankas': { homepage: 'https://www.sb.lt' },
  'pibank': { homepage: 'https://www.pibank.es' },
  'anadi-bank': { homepage: 'https://www.anadibank.com' },
  'swissquote': { wikimedia: 'Swissquote_logo.svg', homepage: 'https://www.swissquote.com' },
  'renault-bank-direkt': { homepage: 'https://www.renault-bank-direkt.de' },
};

function extFromContentType(ct, url) {
  if (ct?.includes('svg')) return 'svg';
  if (ct?.includes('webp')) return 'webp';
  if (ct?.includes('png')) return 'png';
  if (ct?.includes('jpeg') || ct?.includes('jpg')) return 'jpg';
  if (ct?.includes('x-icon') || ct?.includes('icon')) return 'png';
  if (url.includes('.svg')) return 'svg';
  if (url.includes('.webp')) return 'webp';
  if (url.includes('.png')) return 'png';
  return 'png';
}

function isValidImage(buf) {
  if (!buf || buf.length < 120) return false;
  const head = buf.subarray(0, 64).toString('utf8').toLowerCase();
  if (head.includes('<html') || head.includes('<!doc')) return false;
  return true;
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isValidImage(buf)) throw new Error('Not an image');
  return { buf, ext: extFromContentType(ct, url) };
}

async function wikimediaUrl(filename) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wiki API ${res.status}`);
  const data = await res.json();
  const page = Object.values(data.query?.pages || {})[0];
  const url = page?.imageinfo?.[0]?.url;
  if (!url) throw new Error(`No Wikimedia file: ${filename}`);
  return url;
}

async function ogImageFromHomepage(homepage) {
  const res = await fetch(homepage, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Homepage ${res.status}`);
  const html = await res.text();
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<link[^>]+rel=["'](?:apple-touch-icon|icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|icon|shortcut icon)["']/i,
    /"logo"\s*:\s*"([^"]+)"/i,
    /src=["']([^"']*logo[^"']*\.(?:svg|png|webp))["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      let url = m[1].replace(/&amp;/g, '&');
      if (url.startsWith('//')) url = `https:${url}`;
      else if (url.startsWith('/')) url = new URL(url, homepage).href;
      else if (!url.startsWith('http')) url = new URL(url, homepage).href;
      if (!url.includes('facebook') && !url.includes('twitter')) return url;
    }
  }
  throw new Error('No og:image found');
}

async function buildCandidates(slug, cfg) {
  const urls = [...(cfg.urls || [])];
  if (cfg.wikimedia) {
    try {
      urls.push(await wikimediaUrl(cfg.wikimedia));
    } catch (e) {
      console.warn(`  wiki lookup ${slug}: ${e.message}`);
    }
  }
  if (cfg.homepage) {
    try {
      urls.push(await ogImageFromHomepage(cfg.homepage));
    } catch (e) {
      console.warn(`  og scrape ${slug}: ${e.message}`);
    }
    const domain = new URL(cfg.homepage).hostname.replace(/^www\./, '');
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }
  return [...new Set(urls)];
}

async function downloadForSlug(slug, cfg) {
  const urls = await buildCandidates(slug, cfg);
  for (const url of urls) {
    try {
      const { buf, ext } = await fetchBuffer(url);
      const file = join(outDir, `${slug}.${ext}`);
      writeFileSync(file, buf);
      return `/assets/bank-logos/${slug}.${ext}`;
    } catch (err) {
      console.warn(`  ✗ ${slug}: ${url.slice(0, 80)} — ${err.message}`);
    }
  }
  return null;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const results = {};
  const slugs = Object.keys(BANKS);

  for (const slug of slugs) {
    const existing = ['png', 'svg', 'webp', 'jpg']
      .map((e) => join(outDir, `${slug}.${e}`))
      .find((p) => existsSync(p));
    if (existing && slug !== 'lhv-pank') {
      const ext = existing.split('.').pop();
      results[slug] = `/assets/bank-logos/${slug}.${ext}`;
      console.log(`↷ ${slug}: already exists`);
      continue;
    }

    const path = await downloadForSlug(slug, BANKS[slug]);
    if (path) {
      results[slug] = path;
      console.log(`✓ ${slug}: ${path}`);
    } else {
      console.error(`✗ ${slug}: all sources failed`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDownloaded ${Object.keys(results).length}/${slugs.length} logos`);

  let sql = `-- Bank logos for comparison catalog (generated by scripts/download-comparison-bank-logos.mjs)\n\n`;
  for (const [slug, logoUrl] of Object.entries(results)) {
    sql += `update public.banks set logo_url = '${logoUrl}' where slug = '${slug}';\n`;
  }
  writeFileSync(join(root, 'supabase/migrations/20260522140000_comparison_bank_logos.sql'), sql, 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
