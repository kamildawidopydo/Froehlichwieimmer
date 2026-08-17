const UA = 'Mozilla/5.0 Chrome/120.0.0.0';
const tickers = ['aac', 'bsp', 'cux', 'mot', 'lime', 'itg'];

for (const t of tickers) {
  const url = `https://stockanalysis.com/ipos/${t}/`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const h = await r.text();
    const logos = [...h.matchAll(/https:\/\/img\.stockanalysis\.com\/[^"'\s)]+/gi)].map((m) => m[0]);
    const og = h.match(/property="og:image" content="([^"]+)"/i)?.[1];
    console.log(t.toUpperCase(), r.status, 'og:', og?.slice(0, 80));
    console.log('  logos:', [...new Set(logos)].slice(0, 3));
  } catch (e) {
    console.log(t, e.message);
  }
}
