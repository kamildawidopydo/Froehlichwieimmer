const r = await fetch('https://www.anduril.com', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const h = await r.text();
const apple = h.match(/<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"/i)
  || h.match(/href="([^"]+)"[^>]+rel="apple-touch-icon"/i);
const og = h.match(/og:image" content="([^"]+)"/i);
console.log('apple', apple?.[1]);
console.log('og', og?.[1]);
