const UA = 'Mozilla/5.0 Chrome/120.0.0.0';
const r = await fetch('https://stockanalysis.com/ipos/calendar/', { headers: { 'User-Agent': UA } });
const h = await r.text();
console.log('status', r.status, 'len', h.length);
const imgs = [...h.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi)].slice(0, 15);
imgs.forEach((m) => console.log(m[1]));
const logoRefs = [...h.matchAll(/img\.stockanalysis\.com[^"'\s)]+/gi)].slice(0, 20);
console.log('logo refs', [...new Set(logoRefs.map((m) => m[0]))]);
