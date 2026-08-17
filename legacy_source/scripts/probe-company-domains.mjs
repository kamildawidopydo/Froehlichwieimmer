const sites = [
  ['anduril', 'https://www.anduril.com'],
  ['bending-spoons', 'https://bendingspoons.com'],
  ['lime', 'https://www.li.me'],
  ['coppertech', 'https://www.coppertech.com'],
  ['metaoptics', 'https://metaoptics.com'],
  ['ares-acq', 'https://www.aresacquisitioncorp.com'],
];

const UA = 'Mozilla/5.0 Chrome/120.0.0.0';

for (const [slug, home] of sites) {
  const tries = [
    `https://unavatar.io/${new URL(home).hostname}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${new URL(home).hostname}&sz=128`,
  ];
  try {
    const r = await fetch(home, { headers: { 'User-Agent': UA } });
    const h = await r.text();
    const og = h.match(/og:image" content="([^"]+)"/i)?.[1];
    if (og) tries.unshift(og.startsWith('http') ? og : new URL(og, home).href);
    const apple = h.match(/apple-touch-icon[^>]+href="([^"]+)"/i)?.[1];
    if (apple) tries.unshift(apple.startsWith('http') ? apple : new URL(apple, home).href);
  } catch {}
  for (const u of tries) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA } });
      const ct = r.headers.get('content-type') || '';
      console.log(slug, r.status, ct.split(';')[0], u.slice(0, 85));
    } catch (e) {
      console.log(slug, 'ERR', u.slice(0, 85));
    }
  }
  console.log('---');
}
