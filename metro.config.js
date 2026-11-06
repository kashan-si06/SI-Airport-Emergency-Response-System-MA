// Learn more: https://docs.expo.dev/guides/customizing-metro
const http = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Development only: forwards /__ens/* to the ENS Core API
 * (SI-ENS-BE, port 4100). Phones reach Metro over LAN or tunnel; routing
 * the dev API through the same address means no second port has to be
 * reachable through firewalls or VPNs. Has no effect on release builds.
 */
const DEV_API_PORT = Number(process.env.ENS_API_PORT || process.env.ENS_DEV_SERVER_PORT || 4100);
const PREFIX = '/__ens';

/**
 * Hop-by-hop headers describe a single connection and must not be forwarded
 * (RFC 9110 §7.6.1). Passing the API's `connection: keep-alive` /
 * `keep-alive: timeout=…` through to the browser advertises a socket Metro
 * may already have closed; Chrome then retries on dead sockets and fails with
 * ERR_TOO_MANY_RETRIES.
 */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function endToEnd(headers) {
  const listed = String(headers.connection || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (v !== undefined && !HOP_BY_HOP.has(key) && !listed.includes(key)) out[k] = v;
  }
  return out;
}

const previous = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const inner = previous ? previous(middleware, server) : middleware;
  return (req, res, next) => {
    if (!req.url || !req.url.startsWith(`${PREFIX}/`)) return inner(req, res, next);
    const started = Date.now();
    const path = req.url.slice(PREFIX.length);
    const client = `${req.socket.remoteAddress ?? '?'}${/Chrome|Mobile/.test(req.headers['user-agent'] ?? '') ? ' browser' : ''}`;
    // Logged on arrival so a request that later fails is still visible.
    console.log(`[ens-proxy] ${req.method} ${path.split('?')[0]} ← ${client} (received)`);
    const upstream = http.request(
      {
        host: 'localhost',
        port: DEV_API_PORT,
        method: req.method,
        path,
        agent: false,
        headers: {
          ...endToEnd(req.headers),
          host: `localhost:${DEV_API_PORT}`,
          'x-forwarded-host': req.headers['x-forwarded-host'] || req.headers.host,
          'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
          'x-forwarded-prefix': PREFIX,
          'x-forwarded-for': req.socket.remoteAddress ?? '',
        },
      },
      (up) => {
        res.writeHead(up.statusCode || 502, endToEnd(up.headers));
        up.pipe(res);
        // Path only — query strings carry OAuth codes and state.
        console.log(`[ens-proxy] ${req.method} ${path.split('?')[0]} ← ${client} → ${up.statusCode} ${Date.now() - started}ms`);
      },
    );
    upstream.on('error', () => {
      console.log(`[ens-proxy] ${req.method} ${path.split('?')[0]} ← ${client} → API unreachable on :${DEV_API_PORT}`);
      if (res.headersSent) return res.destroy();
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'api_down', message: 'ENS Core API is not running. Start it in SI-ENS-BE with: npm start' } }));
    });
    req.pipe(upstream);
  };
};

module.exports = config;
