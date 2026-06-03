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

  const email = `templates-test-${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123', name: 'Templates Test' })
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

describe('Templates Routes', () => {
  it('returns 401 without auth', async () => {
    const res = await get('/api/templates');
    expect(res.status).toBe(401);
  });

  it('lists seeded templates (at least 4)', async () => {
    const res = await get('/api/templates', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.templates).toBeDefined();
    expect(data.templates.length).toBeGreaterThanOrEqual(4);
  });

  it('filters templates by category', async () => {
    const res = await get('/api/templates?category=commerce', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.templates.length).toBe(1);
    expect(data.templates[0].category).toBe('commerce');
  });

  it('gets a single template by id', async () => {
    const res = await get('/api/templates/1', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBeDefined();
    expect(data.layout_json).toBeDefined();
  });

  it('returns 404 for non-existent template', async () => {
    const res = await get('/api/templates/999', authToken);
    expect(res.status).toBe(404);
  });

  it('applies a template and saves layout to user state', async () => {
    const res = await post('/api/templates/1/apply', {}, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Template applied');
    expect(data.layout).toBeDefined();
    expect(data.layout.panels).toBeDefined();
  });

  it('creates a custom template', async () => {
    const uniqueName = `My Custom Template ${Date.now()}`;
    const res = await post('/api/templates', {
      name: uniqueName,
      description: 'A test template',
      layout_json: { panels: ['widget-a', 'widget-b'] }
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe(uniqueName);
    expect(data.is_custom).toBe(1);
    expect(data.user_id).toBeDefined();
  });

  it('returns 400 when creating template without name', async () => {
    const res = await post('/api/templates', {
      layout_json: { panels: [] }
    }, authToken);
    expect(res.status).toBe(400);
  });

  it('returns 400 when creating template without layout_json', async () => {
    const res = await post('/api/templates', {
      name: 'Missing Layout'
    }, authToken);
    expect(res.status).toBe(400);
  });
});
