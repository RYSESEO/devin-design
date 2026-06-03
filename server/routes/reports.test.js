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

describe('Reports Routes', () => {
  const testEmail = `reports-test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let authToken = null;
  let reportId = null;

  beforeAll(async () => {
    // Register a test user
    const res = await post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Report Test User'
    });
    const data = await res.json();
    authToken = data.token;
  });

  it('returns 401 without auth', async () => {
    const res = await get('/api/reports');
    expect(res.status).toBe(401);
  });

  it('generates a report', async () => {
    const res = await post('/api/reports/generate', {
      title: 'Monthly Performance Report',
      date_range: { start: '2024-01-01', end: '2024-01-31' }
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe('Monthly Performance Report');
    expect(data.report_data).toBeDefined();
    expect(data.report_data.summary).toBeDefined();
    expect(data.report_data.summary).toHaveProperty('total_goals');
    expect(data.report_data.summary).toHaveProperty('total_revenue');
    reportId = data.id;
  });

  it('fails to generate report without title', async () => {
    const res = await post('/api/reports/generate', {}, authToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/title/i);
  });

  it('lists reports', async () => {
    const res = await get('/api/reports', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].title).toBe('Monthly Performance Report');
  });

  it('gets a specific report', async () => {
    const res = await get(`/api/reports/${reportId}`, authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(reportId);
    expect(data.title).toBe('Monthly Performance Report');
    expect(data.report_data).toBeDefined();
    expect(data.report_data.generated_at).toBeDefined();
  });

  it('returns 404 for non-existent report', async () => {
    const res = await get('/api/reports/99999', authToken);
    expect(res.status).toBe(404);
  });

  it('generates report with no date_range', async () => {
    const res = await post('/api/reports/generate', {
      title: 'Quick Report'
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.report_data.date_range).toBeNull();
  });
});
