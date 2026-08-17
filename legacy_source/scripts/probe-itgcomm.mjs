const UA = 'Mozilla/5.0 Chrome/120.0.0.0';

const r = await fetch('https://www.itgcomm.com/', { headers: { 'User-Agent': UA } });
const h = await r.text();
console.log('status', r.status);
const apple = h.match(/apple-touch-icon[^>]+href="([^"]+)"/i) || h.match(/href="([^"]+)"[^>]+apple-touch-icon/i);
const og = h.match(/og:image" content="([^"]+)"/i)?.[1];
const logos = [...h.matchAll(/src="([^"]*logo[^"]*)"/gi)].map((m) => m[1]);
console.log('apple', apple?.[1]);
console.log('og', og);
console.log('logos', logos.slice(0, 8));

for (const u of [
  'https://unavatar.io/itgcomm.com?fallback=false',
  'https://www.google.com/s2/favicons?domain=itgcomm.com&sz=128',
]) {
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  console.log(u, res.status, res.headers.get('content-type'), res.headers.get('content-length'));
}
