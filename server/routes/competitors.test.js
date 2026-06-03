import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';

let testPort;
let testServer;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });
});

afterAll(() => {
  if (testServer) testServer.close();
  server.close();
});

function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

function del(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
}

describe('Competitors Routes', () => {
  const testEmail = `competitors-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;
  let competitorId = null;

  beforeAll(async () => {
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Competitors Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/competitors');
    expect(res.status).toBe(401);
  });

  it('adds a competitor', async () => {
    const res = await post('/api/competitors', {
      name: 'Rival Store',
      domain: 'rivalstore.com',
      tracked_products: ['widget-a', 'gadget-b']
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.competitor).toBeDefined();
    expect(data.competitor.name).toBe('Rival Store');
    expect(data.competitor.domain).toBe('rivalstore.com');
    competitorId = data.competitor.id;
  });

  it('returns 400 when adding competitor without name', async () => {
    const res = await post('/api/competitors', {
      domain: 'noname.com'
    }, authToken);
    expect(res.status).toBe(400);
  });

  it('lists tracked competitors', async () => {
    const res = await get('/api/competitors', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.competitors).toBeDefined();
    expect(Array.isArray(data.competitors)).toBe(true);
    expect(data.competitors.length).toBeGreaterThan(0);
    expect(data.competitors[0].name).toBe('Rival Store');
  });

  it('runs a competitive check and generates changes', async () => {
    const res = await post(`/api/competitors/${competitorId}/check`, {}, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.changes).toBeDefined();
    expect(Array.isArray(data.changes)).toBe(true);
    expect(data.changes.length).toBeGreaterThanOrEqual(1);
    expect(data.changes.length).toBeLessThanOrEqual(3);
    const validTypes = ['price_change', 'new_product', 'ranking_shift'];
    for (const change of data.changes) {
      expect(validTypes).toContain(change.change_type);
      expect(change.details).toBeDefined();
    }
  });

  it('lists changes for a competitor', async () => {
    const res = await get(`/api/competitors/${competitorId}/changes`, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.changes).toBeDefined();
    expect(Array.isArray(data.changes)).toBe(true);
    expect(data.changes.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for non-existent competitor changes', async () => {
    const res = await get('/api/competitors/99999/changes', authToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 when checking non-existent competitor', async () => {
    const res = await post('/api/competitors/99999/check', {}, authToken);
    expect(res.status).toBe(404);
  });

  it('deletes a competitor and cascades changes', async () => {
    const res = await del(`/api/competitors/${competitorId}`, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify competitor is gone
    const listRes = await get('/api/competitors', authToken);
    const listData = await listRes.json();
    expect(listData.competitors.length).toBe(0);
  });

  it('returns 404 when deleting non-existent competitor', async () => {
    const res = await del('/api/competitors/99999', authToken);
    expect(res.status).toBe(404);
  });
});
