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

describe('Churn Routes', () => {
  const testEmail = `churn-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;

  beforeAll(async () => {
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Churn Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/churn/predictions');
    expect(res.status).toBe(401);
  });

  it('adds customer activity data', async () => {
    const today = new Date();
    const customers = [
      {
        customer_email: 'loyal@shop.com',
        last_purchase_date: new Date(today - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchase_count: 12,
        total_spent: 450.00,
        avg_order_interval_days: 14
      },
      {
        customer_email: 'atrisk@shop.com',
        last_purchase_date: new Date(today - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchase_count: 5,
        total_spent: 200.00,
        avg_order_interval_days: 20
      },
      {
        customer_email: 'churned@shop.com',
        last_purchase_date: new Date(today - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchase_count: 3,
        total_spent: 120.00,
        avg_order_interval_days: 15
      }
    ];
    const res = await post('/api/churn/customers', { customers }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(3);
  });

  it('returns 400 when customers array is empty', async () => {
    const res = await post('/api/churn/customers', { customers: [] }, authToken);
    expect(res.status).toBe(400);
  });

  it('returns predictions with correct risk levels', async () => {
    const res = await get('/api/churn/predictions', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.predictions).toBeDefined();
    expect(Array.isArray(data.predictions)).toBe(true);
    expect(data.predictions.length).toBe(3);

    const loyal = data.predictions.find(p => p.customer_email === 'loyal@shop.com');
    expect(loyal).toBeDefined();
    expect(loyal.risk).toBe('low');

    const atrisk = data.predictions.find(p => p.customer_email === 'atrisk@shop.com');
    expect(atrisk).toBeDefined();
    expect(atrisk.risk).toBe('medium');

    const churned = data.predictions.find(p => p.customer_email === 'churned@shop.com');
    expect(churned).toBeDefined();
    expect(churned.risk).toBe('high');
  });

  it('returns summary with risk counts', async () => {
    const res = await get('/api/churn/predictions', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(3);
    expect(data.summary.high_risk).toBe(1);
    expect(data.summary.medium_risk).toBe(1);
    expect(data.summary.low_risk).toBe(1);
  });

  it('returns stats with customer totals', async () => {
    const res = await get('/api/churn/stats', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total_customers).toBe(3);
    expect(data.at_risk_count).toBeGreaterThanOrEqual(1);
    expect(data.average_lifetime_value).toBeGreaterThan(0);
  });

  it('returns demo predictions when no data exists', async () => {
    const freshEmail = `churn-fresh-${Date.now()}@example.com`;
    const regRes = await post('/api/auth/register', {
      email: freshEmail,
      password: testPassword,
      name: 'Fresh Churn User'
    });
    const regData = await regRes.json();

    const res = await get('/api/churn/predictions', regData.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.predictions).toBeDefined();
    expect(data.predictions.length).toBe(15);
    expect(data.summary).toBeDefined();
  });
});
