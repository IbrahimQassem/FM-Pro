import test from 'node:test';
import assert from 'node:assert/strict';
import { servePublicWeb } from '../lib/public-web.js';
test('public renderer rejects mutations before any catalog access', async () => {
  const response = { headers: {}, statusCode: 0, set(key, value) { this.headers[key] = value; return this; }, status(value) { this.statusCode = value; return this; }, end() {} };
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await servePublicWeb({ method }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, 'GET, HEAD');
  }
});
