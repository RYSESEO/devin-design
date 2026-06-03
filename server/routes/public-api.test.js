import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';

let testPort;
let testServer;
let baseUrl;
let authToken;
let rawApiKey;
let apiKeyId;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });

  const email = `api-test-${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123', name: 'API Test' })
  });
  const data = await res.json();
  authToken = data.token;
});

afterAll(() => {
  if (testServer) testServer.close();
  server.close();
});

function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

function del(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
}

describe('Public API Routes', () => {
  describe('Key Management', () => {
    it('returns 401 without auth for key creation', async () => {
      const res = await post('/api/keys', { name: 'test' });
      expect(res.status).toBe(401);
    });

    it('creates an API key and returns raw key', async () => {
      const res = await post('/api/keys', { name: 'My Test Key', permissions: ['read', 'write'] }, authToken);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.key).toBeDefined();
      expect(data.key.length).toBe(64); // 32 bytes = 64 hex chars
      expect(data.name).toBe('My Test Key');
      expect(data.permissions).toEqual(['read', 'write']);
      rawApiKey = data.key;
      apiKeyId = data.id;
    });

    it('returns 400 without name', async () => {
      const res = await post('/api/keys', {}, authToken);
      expect(res.status).toBe(400);
    });

    it('lists keys without exposing raw key', async () => {
      const res = await get('/api/keys', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.keys.length).toBeGreaterThanOrEqual(1);
      const key = data.keys[0];
      expect(key.name).toBe('My Test Key');
      expect(key.key).toBeUndefined();
      expect(key.key_hash).toBeUndefined();
      expect(key.permissions).toEqual(['read', 'write']);
    });
  });

  describe('API v1 routes with API key', () => {
    it('returns 401 without API key header', async () => {
      const res = await fetch(`${baseUrl}/api/v1/metrics`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('API key required');
    });

    it('returns 401 with invalid API key', async () => {
      const res = await fetch(`${baseUrl}/api/v1/metrics`, {
        headers: { 'X-API-Key': 'invalid-key-here' }
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid or revoked API key');
    });

    it('returns metrics with valid API key', async () => {
      const res = await fetch(`${baseUrl}/api/v1/metrics`, {
        headers: { 'X-API-Key': rawApiKey }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.revenue).toBeDefined();
      expect(data.orders).toBeDefined();
    });

    it('returns orders with valid API key', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        headers: { 'X-API-Key': rawApiKey }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.orders).toBeDefined();
    });

    it('returns reports with valid API key', async () => {
      const res = await fetch(`${baseUrl}/api/v1/reports`, {
        headers: { 'X-API-Key': rawApiKey }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.reports).toBeDefined();
    });
  });

  describe('Key Revocation', () => {
    it('revokes an API key', async () => {
      const res = await del(`/api/keys/${apiKeyId}`, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('API key revoked');
    });

    it('returns 401 after key is revoked', async () => {
      const res = await fetch(`${baseUrl}/api/v1/metrics`, {
        headers: { 'X-API-Key': rawApiKey }
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid or revoked API key');
    });

    it('returns 404 when revoking non-existent key', async () => {
      const res = await del('/api/keys/99999', authToken);
      expect(res.status).toBe(404);
    });
  });
});
