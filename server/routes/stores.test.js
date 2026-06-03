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

describe('Stores Routes', () => {
  const testEmail = `stores-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;
  let storeId = null;

  beforeAll(async () => {
    // Register a test user
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Store Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/stores');
    expect(res.status).toBe(401);
  });

  it('lists stores (empty initially)', async () => {
    const res = await get('/api/stores', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('adds a store', async () => {
    const res = await post('/api/stores', {
      store_name: 'My Shop',
      shop_domain: 'myshop.myshopify.com',
      credentials: 'secret-api-key'
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.store_name).toBe('My Shop');
    expect(data.shop_domain).toBe('myshop.myshopify.com');
    expect(data.is_active).toBe(0);
    storeId = data.id;
  });

  it('fails to add store without store_name', async () => {
    const res = await post('/api/stores', {
      shop_domain: 'nope.myshopify.com'
    }, authToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/store_name/i);
  });

  it('activates a store', async () => {
    const res = await put(`/api/stores/${storeId}/activate`, {}, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.store_id).toBe(storeId);
  });

  it('gets aggregate metrics', async () => {
    const res = await get('/api/stores/aggregate', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('total_revenue');
    expect(data).toHaveProperty('total_orders');
    expect(data).toHaveProperty('best_store');
    expect(data).toHaveProperty('worst_store');
    expect(data).toHaveProperty('stores');
  });

  it('deletes a store', async () => {
    const res = await del(`/api/stores/${storeId}`, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Store deleted');

    // Verify store is gone
    const listRes = await get('/api/stores', authToken);
    const stores = await listRes.json();
    expect(stores.length).toBe(0);
  });

  it('returns 404 when deleting non-existent store', async () => {
    const res = await del('/api/stores/99999', authToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 when activating non-existent store', async () => {
    const res = await put('/api/stores/99999/activate', {}, authToken);
    expect(res.status).toBe(404);
  });
});
