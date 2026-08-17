/**
 * Cloudflare Worker entry: /api/* → existing Vercel-style handlers; rest → static assets.
 * Must be ES Module format (export default) for Workers + nodejs_compat.
 */
const { API_ROUTES } = require('../server/lib/apiRoutes');
const { applyWorkerEnv, runVercelStyleHandler } = require('../server/lib/cloudflareHttp');

function jsonError(status, error) {
  return Response.json({ error }, { status });
}

export default {
  async fetch(request, env) {
    applyWorkerEnv(env);

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    // Apex → www (same as former vercel.json redirect)
    if (url.hostname === 'kapitalmitte.com') {
      url.hostname = 'www.kapitalmitte.com';
      return Response.redirect(url.toString(), 301);
    }

    if (pathname.startsWith('/api/')) {
      const loadHandler = API_ROUTES[pathname];
      if (!loadHandler) {
        return jsonError(404, 'Not found');
      }

      try {
        const handler = loadHandler();
        return await runVercelStyleHandler(handler, request);
      } catch (err) {
        console.error('[worker/api]', pathname, err);
        const status = err?.statusCode || 500;
        return jsonError(status, err?.message || 'Internal server error');
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return jsonError(404, 'Not found');
  },
};
