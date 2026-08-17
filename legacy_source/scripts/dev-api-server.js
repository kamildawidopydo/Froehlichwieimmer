/**
 * Local API server for `npm run dev` (port 3001).
 * CRA proxies /api/* here — see craco.config.js.
 */
const http = require('http');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { API_ROUTES } = require('../server/lib/apiRoutes');

const PORT = Number(process.env.DEV_API_PORT) || 3001;
const HOST = '127.0.0.1';
const MAX_BODY = 55 * 1024 * 1024;

function createRes(nodeRes) {
  const headers = {};
  let statusCode = 200;
  let sent = false;

  const flush = () => {
    if (sent || nodeRes.headersSent) return;
    sent = true;
    const finalHeaders = { ...headers };
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }
    nodeRes.writeHead(statusCode, finalHeaders);
  };

  const res = {
    get headersSent() {
      return sent || nodeRes.headersSent;
    },
    setHeader(name, value) {
      if (!sent && !nodeRes.headersSent) {
        headers[name] = value;
      }
      return res;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(payload) {
      flush();
      nodeRes.end(JSON.stringify(payload));
    },
    send(payload) {
      flush();
      if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
        nodeRes.end(payload);
        return;
      }
      if (payload == null) {
        nodeRes.end();
        return;
      }
      if (typeof payload === 'object') {
        nodeRes.end(JSON.stringify(payload));
        return;
      }
      nodeRes.end(String(payload));
    },
    end(data) {
      flush();
      nodeRes.end(data);
    },
  };

  Object.defineProperty(res, 'statusCode', {
    get() {
      return statusCode;
    },
    set(code) {
      statusCode = code;
    },
  });

  return res;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseQuery(urlPathWithQuery) {
  const qIndex = urlPathWithQuery.indexOf('?');
  if (qIndex < 0) return {};
  const params = new URLSearchParams(urlPathWithQuery.slice(qIndex + 1));
  const query = {};
  for (const [key, value] of params.entries()) {
    if (query[key] === undefined) query[key] = value;
    else if (Array.isArray(query[key])) query[key].push(value);
    else query[key] = [query[key], value];
  }
  return query;
}

const server = http.createServer(async (req, res) => {
  const fullUrl = req.url || '';
  const urlPath = fullUrl.split('?')[0];

  if (req.method === 'GET' && urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  const loadHandler = API_ROUTES[urlPath];
  if (!loadHandler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  const allowGet = urlPath === '/api/unsplash-proxy';
  if (req.method !== 'POST' && !(allowGet && req.method === 'GET')) {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = {};
    if (req.method === 'POST') {
      const raw = await readBody(req);
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
      }
    }

    const handler = loadHandler();
    const mockReq = {
      method: req.method,
      body,
      query: parseQuery(fullUrl),
      headers: req.headers || {},
      socket: req.socket,
    };
    await handler(mockReq, createRes(res));
  } catch (err) {
    console.error('[dev-api-server]', urlPath, err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[dev-api-server] http://${HOST}:${PORT} (contract + email APIs)`);
});

server.on('error', (err) => {
  console.error('[dev-api-server] failed to start:', err.message);
  process.exit(1);
});
