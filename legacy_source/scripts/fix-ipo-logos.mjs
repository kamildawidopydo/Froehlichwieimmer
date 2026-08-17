import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const UA = 'Mozilla/5.0 Chrome/120.0.0.0';
const outDir = join('public', 'assets', 'ipo-logos');
mkdirSync(outDir, { recursive: true });

const items = [
  {
    file: 'anduril.png',
    urls: [
      'https://www.anduril.com/assets/favicon/apple-touch-icon.xxx1TpF2gg.png',
      'https://unavatar.io/anduril.com?fallback=false',
    ],
  },
  {
    file: 'databricks.png',
    urls: [
      'https://unavatar.io/databricks.com?fallback=false',
      'https://www.google.com/s2/favicons?domain=databricks.com&sz=128',
    ],
  },
  {
    file: 'figure-ai.png',
    urls: [
      'https://unavatar.io/figure.ai?fallback=false',
      'https://www.google.com/s2/favicons?domain=figure.ai&sz=128',
    ],
  },
];

for (const { file, urls } of items) {
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      const buf = Buffer.from(await r.arrayBuffer());
      if (!r.ok || buf.length < 200) continue;
      if (buf.subarray(0, 20).toString().includes('<!')) continue;
      writeFileSync(join(outDir, file), buf);
      console.log('saved', file, url, buf.length);
      break;
    } catch (e) {
      console.warn(file, url, e.message);
    }
  }
}
