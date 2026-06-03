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

describe('SEO Routes', () => {
  const testEmail = `seo-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;

  beforeAll(async () => {
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'SEO Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/seo/opportunities');
    expect(res.status).toBe(401);
  });

  it('adds keyword ranking data', async () => {
    const keywords = [
      { keyword: 'best widgets', position: 15, clicks: 50, impressions: 2000, url: '/widgets', recorded_at: '2024-01-01' },
      { keyword: 'best widgets', position: 8, clicks: 120, impressions: 2500, url: '/widgets', recorded_at: '2024-01-15' },
      { keyword: 'cheap gadgets', position: 5, clicks: 30, impressions: 5000, url: '/gadgets', recorded_at: '2024-01-01' },
      { keyword: 'cheap gadgets', position: 5, clicks: 40, impressions: 5500, url: '/gadgets', recorded_at: '2024-01-15' },
      { keyword: 'premium tools', position: 20, clicks: 10, impressions: 3000, url: '/tools', recorded_at: '2024-01-01' },
      { keyword: 'premium tools', position: 18, clicks: 15, impressions: 3200, url: '/tools', recorded_at: '2024-01-15' }
    ];
    const res = await post('/api/seo/keywords', { keywords }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(keywords.length);
  });

  it('returns 400 when keywords array is empty', async () => {
    const res = await post('/api/seo/keywords', { keywords: [] }, authToken);
    expect(res.status).toBe(400);
  });

  it('identifies rising keywords in opportunities', async () => {
    const res = await get('/api/seo/opportunities', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.opportunities).toBeDefined();
    expect(Array.isArray(data.opportunities)).toBe(true);

    const rising = data.opportunities.filter(o => o.type === 'rising');
    expect(rising.length).toBeGreaterThan(0);
    // best widgets improved from 15 to 8
    const bestWidgets = rising.find(o => o.keyword === 'best widgets');
    expect(bestWidgets).toBeDefined();
    expect(bestWidgets.change).toBe(7); // 15 - 8
  });

  it('identifies low CTR opportunities', async () => {
    const res = await get('/api/seo/opportunities', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();

    const lowCtr = data.opportunities.filter(o => o.type === 'low_ctr');
    expect(lowCtr.length).toBeGreaterThan(0);
    // cheap gadgets has high impressions but low CTR
    const cheapGadgets = lowCtr.find(o => o.keyword === 'cheap gadgets');
    expect(cheapGadgets).toBeDefined();
    expect(cheapGadgets.ctr).toBeLessThan(3);
  });

  it('returns keyword trends with moving averages', async () => {
    const res = await get('/api/seo/trends', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.trends).toBeDefined();
    expect(Array.isArray(data.trends)).toBe(true);
    expect(data.trends.length).toBeGreaterThan(0);
    expect(data.trends[0]).toHaveProperty('keyword');
    expect(data.trends[0]).toHaveProperty('data');
    expect(data.trends[0].data[0]).toHaveProperty('date');
    expect(data.trends[0].data[0]).toHaveProperty('position');
  });

  it('returns demo opportunities when no data exists', async () => {
    const freshEmail = `seo-fresh-${Date.now()}@example.com`;
    const regRes = await post('/api/auth/register', {
      email: freshEmail,
      password: testPassword,
      name: 'Fresh SEO User'
    });
    const regData = await regRes.json();

    const res = await get('/api/seo/opportunities', regData.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.opportunities).toBeDefined();
    expect(data.opportunities.length).toBe(10);
  });
});
