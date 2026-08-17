/**
 * Download real IPO company logos into public/assets/ipo-logos/
 * Run: node scripts/download-ipo-logos.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public/assets/ipo-logos');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** slug -> { external_key, urls?, wikimedia?, wikiPage?, homepage? } */
const IPOS = {
  openai: {
    external_key: 'sec_filed:openai',
    urls: ['https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg'],
  },
  anthropic: {
    external_key: 'sec_filed:anthropic',
    urls: ['https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg'],
  },
  discord: {
    external_key: 'sec_filed:discord',
    urls: ['https://upload.wikimedia.org/wikipedia/en/9/98/Discord_logo.svg'],
  },
  kraken: {
    external_key: 'sec_filed:kraken',
    homepage: 'https://www.kraken.com',
    wikiPage: 'Kraken_(cryptocurrency_exchange)',
  },
  databricks: {
    external_key: 'manual:databricks',
    homepage: 'https://www.databricks.com',
    wikiPage: 'Databricks',
  },
  stripe: {
    external_key: 'manual:stripe',
    urls: ['https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg'],
  },
  canva: {
    external_key: 'manual:canva',
    wikiPage: 'Canva',
    homepage: 'https://www.canva.com',
  },
  xai: {
    external_key: 'manual:xai',
    urls: ['https://upload.wikimedia.org/wikipedia/commons/5/57/XAI-Logo.svg'],
  },
  waymo: {
    external_key: 'manual:waymo',
    urls: ['https://upload.wikimedia.org/wikipedia/commons/9/9f/Waymo_logo.svg'],
  },
  anduril: {
    external_key: 'manual:anduril',
    homepage: 'https://www.anduril.com',
    wikiPage: 'Anduril Industries',
  },
  revolut: {
    external_key: 'manual:revolut',
    homepage: 'https://www.revolut.com',
    wikiPage: 'Revolut',
  },
  'figure-ai': {
    external_key: 'manual:figure-ai',
    wikiPage: 'Figure AI',
    homepage: 'https://www.figure.ai',
  },
};

function extFromContentType(ct, url) {
  if (ct?.includes('svg')) return 'svg';
  if (ct?.includes('webp')) return 'webp';
  if (ct?.includes('png')) return 'png';
  if (ct?.includes('jpeg') || ct?.includes('jpg')) return 'jpg';
  if (url.includes('.svg')) return 'svg';
  if (url.includes('.png')) return 'png';
  return 'png';
}

function isValidImage(buf) {
  if (!buf || buf.length < 80) return false;
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

async function wikiSummaryImage(pageTitle) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
    { headers: { 'User-Agent': UA } },
  );
  if (!res.ok) throw new Error(`Wiki summary ${res.status}`);
  const data = await res.json();
  const url = data.originalimage?.source || data.thumbnail?.source;
  if (!url) throw new Error('No wiki image');
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
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
    /src=["']([^"']*logo[^"']*\.(?:svg|png|webp))["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      let url = m[1].replace(/&amp;/g, '&');
      if (url.startsWith('//')) url = `https:${url}`;
      else if (url.startsWith('/')) url = new URL(url, homepage).href;
      else if (!url.startsWith('http')) url = new URL(url, homepage).href;
      return url;
    }
  }
  throw new Error('No og:image');
}

async function buildCandidates(slug, cfg) {
  const urls = [...(cfg.urls || [])];
  if (cfg.wikiPage) {
    try {
      urls.push(await wikiSummaryImage(cfg.wikiPage));
    } catch (e) {
      console.warn(`  wiki ${slug}: ${e.message}`);
    }
  }
  if (cfg.homepage) {
    try {
      urls.push(await ogImageFromHomepage(cfg.homepage));
    } catch (e) {
      console.warn(`  og ${slug}: ${e.message}`);
    }
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
      return { path: `/assets/ipo-logos/${slug}.${ext}`, external_key: cfg.external_key };
    } catch (err) {
      console.warn(`  ✗ ${slug}: ${url.slice(0, 90)} — ${err.message}`);
    }
  }
  return null;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const results = [];

  for (const [slug, cfg] of Object.entries(IPOS)) {
    const existing = ['svg', 'png', 'webp', 'jpg']
      .map((e) => join(outDir, `${slug}.${e}`))
      .find((p) => existsSync(p));
    if (existing) {
      const ext = existing.split('.').pop();
      results.push({ slug, path: `/assets/ipo-logos/${slug}.${ext}`, external_key: cfg.external_key });
      console.log(`↷ ${slug}: already exists`);
      continue;
    }

    const hit = await downloadForSlug(slug, cfg);
    if (hit) {
      results.push({ slug, ...hit });
      console.log(`✓ ${slug}: ${hit.path}`);
    } else {
      console.error(`✗ ${slug}: all sources failed`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  let sql = `-- IPO curated logos (generated by scripts/download-ipo-logos.mjs)\n\n`;
  for (const { external_key, path } of results) {
    sql += `update public.ipo_catalog set logo_url = '${path}' where external_key = '${external_key}';\n`;
  }
  const migPath = join(root, 'supabase/migrations/20260630220000_ipo_curated_local_logos.sql');
  writeFileSync(migPath, sql, 'utf8');
  console.log(`\nWrote ${results.length} logos → ${migPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
