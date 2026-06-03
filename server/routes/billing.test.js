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

function del(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
}

describe('Billing Routes', () => {
  const testEmail = `billing-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;

  beforeAll(async () => {
    // Register a test user
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Billing Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/billing/subscription');
    expect(res.status).toBe(401);
  });

  it('gets subscription (none - returns free plan)', async () => {
    const res = await get('/api/billing/subscription', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan).toBe('free');
    expect(data.status).toBe('active');
  });

  it('subscribes to a plan', async () => {
    const res = await post('/api/billing/subscribe', {
      plan: 'pro',
      stripe_customer_id: 'cus_test123',
      stripe_subscription_id: 'sub_test123'
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.plan).toBe('pro');
    expect(data.status).toBe('active');
    expect(data.stripe_customer_id).toBe('cus_test123');
  });

  it('fails to subscribe when already subscribed', async () => {
    const res = await post('/api/billing/subscribe', {
      plan: 'enterprise'
    }, authToken);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already exists/i);
  });

  it('updates subscription plan', async () => {
    const res = await put('/api/billing/subscription', {
      plan: 'enterprise'
    }, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan).toBe('enterprise');
  });

  it('fails to update without plan', async () => {
    const res = await put('/api/billing/subscription', {}, authToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/plan/i);
  });

  it('cancels subscription', async () => {
    const res = await del('/api/billing/subscription', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Subscription canceled');
  });

  it('fails to cancel when no active subscription', async () => {
    const res = await del('/api/billing/subscription', authToken);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/no active/i);
  });

  it('can subscribe again after canceling', async () => {
    const res = await post('/api/billing/subscribe', {
      plan: 'basic'
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.plan).toBe('basic');
    expect(data.status).toBe('active');
  });
});
