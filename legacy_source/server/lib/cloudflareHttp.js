/**
 * Adapt Vercel-style (req, res) handlers to Cloudflare Workers fetch().
 */

function parseQuery(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) {
    if (query[key] === undefined) {
      query[key] = value;
    } else if (Array.isArray(query[key])) {
      query[key].push(value);
    } else {
      query[key] = [query[key], value];
    }
  }
  return query;
}

function createNodeLikeRes() {
  const headers = new Headers();
  let statusCode = 200;
  let body = null;
  let sent = false;
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const finish = (payload) => {
    if (sent) return res;
    sent = true;
    body = payload;
    resolveDone();
    return res;
  };

  const res = {
    get headersSent() {
      return sent;
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(code) {
      statusCode = code;
    },
    setHeader(name, value) {
      if (!sent) headers.set(name, String(value));
      return res;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(payload) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
      }
      return finish(JSON.stringify(payload));
    },
    send(payload) {
      if (payload == null) return finish(null);
      if (typeof payload === 'object' && !Buffer.isBuffer(payload) && !(payload instanceof Uint8Array)) {
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json; charset=utf-8');
        }
        return finish(JSON.stringify(payload));
      }
      if (typeof payload === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'text/plain; charset=utf-8');
      }
      return finish(payload);
    },
    end(payload) {
      return finish(payload === undefined ? null : payload);
    },
  };

  return {
    res,
    done,
    toResponse() {
      return new Response(body, { status: statusCode, headers });
    },
  };
}

async function createNodeLikeReq(request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  const query = parseQuery(url.searchParams);

  let body = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.text();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        const err = new Error('Invalid JSON body');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const forwarded = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || '';
  return {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    query,
    body,
    socket: {
      remoteAddress: typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null,
    },
  };
}

/** Copy string bindings from Workers env into process.env for existing handlers. */
function applyWorkerEnv(env) {
  if (!env || typeof env !== 'object') return;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }
}

async function runVercelStyleHandler(handler, request) {
  const req = await createNodeLikeReq(request);
  const { res, done, toResponse } = createNodeLikeRes();
  await Promise.resolve(handler(req, res));
  if (!res.headersSent) {
    res.status(500).json({ error: 'Handler returned no response' });
  }
  await done;
  return toResponse();
}

module.exports = {
  applyWorkerEnv,
  runVercelStyleHandler,
  createNodeLikeReq,
  createNodeLikeRes,
};
