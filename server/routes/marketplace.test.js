import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';

let testPort;
let testServer;
let baseUrl;
let authToken;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });

  const email = `marketplace-test-${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123', name: 'Marketplace Test' })
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

function put(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
}

function del(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
}

describe('Marketplace Routes', () => {
  it('returns 401 without auth', async () => {
    const res = await get('/api/marketplace/plugins');
    expect(res.status).toBe(401);
  });

  it('lists seeded plugins (5 total)', async () => {
    const res = await get('/api/marketplace/plugins', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plugins).toBeDefined();
    expect(data.plugins.length).toBe(5);
    expect(data.total).toBe(5);
  });

  it('supports pagination', async () => {
    const res = await get('/api/marketplace/plugins?page=1&limit=2', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plugins.length).toBe(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(2);
  });

  it('gets a single plugin by id', async () => {
    const res = await get('/api/marketplace/plugins/1', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBeDefined();
    expect(data.author).toBe('RYSE Team');
  });

  it('returns 404 for non-existent plugin', async () => {
    const res = await get('/api/marketplace/plugins/999', authToken);
    expect(res.status).toBe(404);
  });

  describe('Install/Uninstall', () => {
    let pluginId = 1;

    it('installs a plugin', async () => {
      const res = await post(`/api/marketplace/plugins/${pluginId}/install`, {}, authToken);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.message).toBe('Plugin installed');
    });

    it('returns 409 if already installed', async () => {
      const res = await post(`/api/marketplace/plugins/${pluginId}/install`, {}, authToken);
      expect(res.status).toBe(409);
    });

    it('lists installed plugins', async () => {
      const res = await get('/api/marketplace/installed', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.installed.length).toBe(1);
      expect(data.installed[0].name).toBeDefined();
    });

    it('updates installed plugin config', async () => {
      const listRes = await get('/api/marketplace/installed', authToken);
      const listData = await listRes.json();
      const installedId = listData.installed[0].id;

      const res = await put(`/api/marketplace/installed/${installedId}`, {
        config: { refresh_interval: 30 },
        enabled: false
      }, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.enabled).toBe(0);
      expect(JSON.parse(data.config)).toEqual({ refresh_interval: 30 });
    });

    it('uninstalls a plugin', async () => {
      const res = await del(`/api/marketplace/plugins/${pluginId}/uninstall`, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Plugin uninstalled');
    });

    it('returns 404 when uninstalling non-installed plugin', async () => {
      const res = await del(`/api/marketplace/plugins/${pluginId}/uninstall`, authToken);
      expect(res.status).toBe(404);
    });
  });
});
