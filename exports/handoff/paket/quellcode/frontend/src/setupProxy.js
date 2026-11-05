/**
 * Dev-only: Unsplash proxy on the CRA dev server.
 * Email/contract APIs run on port 3001 — see scripts/dev-api-server.js + craco.config.js.
 */
const ALLOWED = /^https:\/\/images\.unsplash\.com\//;

module.exports = function setupProxy(app) {
  app.get('/api/unsplash-proxy', async (req, res) => {
    const raw = typeof req.query.url === 'string' ? req.query.url : req.query.url?.[0];
    if (!raw) {
      return res.status(400).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Missing url query');
    }

    let upstream;
    try {
      upstream = decodeURIComponent(raw);
    } catch {
      return res.status(400).send('Invalid url encoding');
    }

    if (!ALLOWED.test(upstream)) {
      return res.status(403).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Only images.unsplash.com is allowed');
    }

    try {
      const upstreamRes = await fetch(upstream, {
        headers: {
          Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
          'User-Agent': 'Fröhlich Vermögensberatung-ImageProxy/1.0',
        },
        redirect: 'follow',
      });

      if (!upstreamRes.ok) {
        return res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Upstream fetch failed');
      }

      const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await upstreamRes.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.status(200).send(buffer);
    } catch (err) {
      console.error('[unsplash-proxy dev]', err);
      return res.status(500).send('Proxy error');
    }
  });
};
