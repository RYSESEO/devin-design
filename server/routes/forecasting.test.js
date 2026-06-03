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

describe('Forecasting Routes', () => {
  const testEmail = `forecasting-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;

  beforeAll(async () => {
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Forecasting Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/forecasting/demand');
    expect(res.status).toBe(401);
  });

  it('seeds order history via POST /api/forecasting/orders', async () => {
    const orders = [];
    const today = new Date();
    for (let d = 30; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      orders.push({
        product_name: 'Widget',
        quantity: 5 + Math.floor(d / 5),
        revenue: (5 + Math.floor(d / 5)) * 20,
        order_date: date.toISOString().split('T')[0]
      });
    }
    const res = await post('/api/forecasting/orders', { orders }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(orders.length);
  });

  it('returns 400 when orders array is empty', async () => {
    const res = await post('/api/forecasting/orders', { orders: [] }, authToken);
    expect(res.status).toBe(400);
  });

  it('returns demand predictions with dates and quantities', async () => {
    const res = await get('/api/forecasting/demand', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.predictions).toBeDefined();
    expect(Array.isArray(data.predictions)).toBe(true);
    expect(data.predictions.length).toBe(14);
    expect(data.predictions[0]).toHaveProperty('date');
    expect(data.predictions[0]).toHaveProperty('predicted_quantity');
    expect(data.predictions[0]).toHaveProperty('predicted_revenue');
  });

  it('returns trend info with slope and direction', async () => {
    const res = await get('/api/forecasting/demand', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.trend).toBeDefined();
    expect(data.trend).toHaveProperty('slope');
    expect(data.trend).toHaveProperty('direction');
    expect(['up', 'down', 'flat']).toContain(data.trend.direction);
  });

  it('returns seasonality index for each day of week', async () => {
    const res = await get('/api/forecasting/demand', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.seasonality).toBeDefined();
    expect(data.seasonality).toHaveProperty('monday');
    expect(data.seasonality).toHaveProperty('tuesday');
    expect(data.seasonality).toHaveProperty('wednesday');
    expect(data.seasonality).toHaveProperty('thursday');
    expect(data.seasonality).toHaveProperty('friday');
    expect(data.seasonality).toHaveProperty('saturday');
    expect(data.seasonality).toHaveProperty('sunday');
  });

  it('returns order history', async () => {
    const res = await get('/api/forecasting/history', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history).toBeDefined();
    expect(Array.isArray(data.history)).toBe(true);
    expect(data.history.length).toBeGreaterThan(0);
  });

  it('returns demo predictions when no data for new user', async () => {
    // Register a fresh user with no data
    const freshEmail = `forecasting-fresh-${Date.now()}@example.com`;
    const regRes = await post('/api/auth/register', {
      email: freshEmail,
      password: testPassword,
      name: 'Fresh User'
    });
    const regData = await regRes.json();

    const res = await get('/api/forecasting/demand', regData.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.predictions).toBeDefined();
    expect(data.predictions.length).toBe(14);
  });
});
