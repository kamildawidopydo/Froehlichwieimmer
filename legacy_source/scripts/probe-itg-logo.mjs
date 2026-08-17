const UA = 'Mozilla/5.0 Chrome/120.0.0.0';

const urls = [
  'https://stockanalysis.com/stocks/itg/',
  'https://www.google.com/search?q=ITG+Inc+IPO+NASDAQ+2026',
];

const r = await fetch('https://stockanalysis.com/stocks/itg/', { headers: { 'User-Agent': UA } });
const h = await r.text();
console.log('status', r.status);
const logos = [...h.matchAll(/https:\/\/img\.stockanalysis\.com\/[^"'\s)]+/gi)].map((m) => m[0]);
console.log('logos', [...new Set(logos)]);
const og = h.match(/og:image" content="([^"]+)"/i)?.[1];
console.log('og', og);

const fmp = ['ITG', 'ITG.US'];
for (const s of fmp) {
  const u = `https://financialmodelingprep.com/image-stock/${s}.png`;
  const res = await fetch(u, { method: 'HEAD' });
  console.log(s, res.status, res.headers.get('content-type'));
}

// try company domains
for (const d of ['itg.com', 'itginc.com', 'itg-co.com', 'investmenttechnology.com']) {
  const u = `https://unavatar.io/${d}?fallback=false`;
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA } });
    console.log(d, res.status, res.headers.get('content-type'), res.headers.get('content-length'));
  } catch (e) {
    console.log(d, e.message);
  }
}
