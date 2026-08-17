/**
 * Helpers for Vercel /api serverless handlers (JSON body + response).
 */
function sendJson(res, statusCode, payload) {
  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  }
}

function parseRequestBody(req) {
  const body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === 'string' && body.trim()) {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return null;
}

function withApiHandler(handler) {
  return async function apiHandler(req, res) {
    try {
      const parsed = parseRequestBody(req);
      if (parsed === null && req.method === 'POST') {
        return sendJson(res, 400, { error: 'Invalid or missing JSON body' });
      }
      req.body = parsed || {};
      return await handler(req, res);
    } catch (err) {
      console.error('[api] unhandled error:', err);
      return sendJson(res, 500, {
        error: err?.message || 'Internal server error',
      });
    }
  };
}

module.exports = { sendJson, parseRequestBody, withApiHandler };
