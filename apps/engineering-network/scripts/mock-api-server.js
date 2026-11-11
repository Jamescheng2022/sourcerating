import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { envelope, queryNearby, searchMock } from '../src/services/mockApi.js';
import { createContactSandbox, ContractError } from '../src/services/contactSandbox.js';

const origins = new Set(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']);
export function createMockServer() {
  const contacts = createContactSandbox();
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Atlas-Data-Mode', 'MOCK');
    const send = (status, value) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) throw new ContractError(403, 'LOOPBACK_HOST_REQUIRED');
      const origin = req.headers.origin;
      if (origin && !origins.has(origin)) throw new ContractError(403, 'ORIGIN_DENIED');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
        return send(204, null);
      }
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
      if (req.method === 'GET' && route === '/api/atlas/v1/health') return send(200, envelope({ storage: 'VOLATILE_MEMORY', outbound_delivery: false }, { status: 'MOCK_READY' }));
      if (req.method === 'GET' && route === '/api/atlas/v1/search') return send(200, searchMock(Object.fromEntries(url.searchParams)));
      if (req.method === 'GET' && route.startsWith('/api/atlas/v1/contact_requests/')) return send(200, contacts.read(token, route.split('/').pop()));
      if (req.method !== 'POST' || !['/api/atlas/v1/nearby/query', '/api/atlas/v1/contact_requests'].includes(route)) return send(404, envelope(null, { error: 'NOT_FOUND' }));
      if (!req.headers['content-type']?.startsWith('application/json')) throw new ContractError(415, 'JSON_REQUIRED');
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 8192) throw new ContractError(413, 'BODY_TOO_LARGE');
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ContractError(400, 'INVALID_JSON'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ContractError(400, 'INVALID_BODY');
      if (route.endsWith('/nearby/query')) return send(200, queryNearby(body));
      const result = contacts.create(token, body, req.headers['idempotency-key']);
      return send(result.replayed ? 200 : 201, result);
    } catch (error) {
      return send(error.status || (error instanceof TypeError ? 400 : 500), envelope(null, { error: error.status || error instanceof TypeError ? error.message : 'INTERNAL_ERROR' }));
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createMockServer();
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.listen(43142, '127.0.0.1', () => console.log('MOCK ONLY sandbox: http://127.0.0.1:43142; no delivery; volatile memory'));
}
