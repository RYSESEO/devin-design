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

function put(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
}

describe('Pricing Routes', () => {
  const testEmail = `pricing-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;
  let testId = null;

  beforeAll(async () => {
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Pricing Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/pricing/tests');
    expect(res.status).toBe(401);
  });

  it('creates a price test', async () => {
    const res = await post('/api/pricing/tests', {
      product_name: 'Premium Widget',
      original_price: 29.99,
      test_price: 34.99,
      product_id: 'widget-001'
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.test).toBeDefined();
    expect(data.test.product_name).toBe('Premium Widget');
    expect(data.test.original_price).toBe(29.99);
    expect(data.test.test_price).toBe(34.99);
    expect(data.test.status).toBe('active');
    testId = data.test.id;
  });

  it('returns 400 when creating test without required fields', async () => {
    const res = await post('/api/pricing/tests', {
      product_name: 'Widget Only'
    }, authToken);
    expect(res.status).toBe(400);
  });

  it('lists price tests', async () => {
    const res = await get('/api/pricing/tests', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tests).toBeDefined();
    expect(Array.isArray(data.tests)).toBe(true);
    expect(data.tests.length).toBeGreaterThan(0);
  });

  it('updates a price test with conversion data', async () => {
    const res = await put(`/api/pricing/tests/${testId}`, {
      conversion_original: 0.05,
      conversion_test: 0.045,
      status: 'completed'
    }, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.test.conversion_original).toBe(0.05);
    expect(data.test.conversion_test).toBe(0.045);
    expect(data.test.status).toBe('completed');
  });

  it('returns 404 when updating non-existent test', async () => {
    const res = await put('/api/pricing/tests/99999', {
      status: 'completed'
    }, authToken);
    expect(res.status).toBe(404);
  });

  it('returns recommendations from completed tests', async () => {
    const res = await get('/api/pricing/recommendations', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.recommendations).toBeDefined();
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBeGreaterThan(0);
    expect(data.recommendations[0]).toHaveProperty('product_name');
    expect(data.recommendations[0]).toHaveProperty('recommended_price');
    expect(data.recommendations[0]).toHaveProperty('expected_revenue_increase_pct');
    expect(data.recommendations[0]).toHaveProperty('confidence');
  });

  it('recommends price maximizing revenue', async () => {
    const res = await get('/api/pricing/recommendations', authToken);
    const data = await res.json();
    const rec = data.recommendations.find(r => r.product_name === 'Premium Widget');
    expect(rec).toBeDefined();
    // original: 29.99 * 0.05 = 1.4995, test: 34.99 * 0.045 = 1.57455
    // Test price has higher revenue
    expect(rec.recommended_price).toBe(34.99);
  });

  it('returns demo recommendations when no completed tests', async () => {
    const freshEmail = `pricing-fresh-${Date.now()}@example.com`;
    const regRes = await post('/api/auth/register', {
      email: freshEmail,
      password: testPassword,
      name: 'Fresh Pricing User'
    });
    const regData = await regRes.json();

    const res = await get('/api/pricing/recommendations', regData.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.recommendations).toBeDefined();
    expect(data.recommendations.length).toBeGreaterThan(0);
  });
});
