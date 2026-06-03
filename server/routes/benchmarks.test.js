import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';

let testPort;
let testServer;
let baseUrl;
let authToken;
let authToken2;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });

  // Register two users for benchmark comparison
  const email1 = `bench-test-${Date.now()}@example.com`;
  const res1 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password: 'testpass123', name: 'Bench Test 1' })
  });
  const data1 = await res1.json();
  authToken = data1.token;

  const email2 = `bench-test2-${Date.now()}@example.com`;
  const res2 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password: 'testpass123', name: 'Bench Test 2' })
  });
  const data2 = await res2.json();
  authToken2 = data2.token;
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

describe('Benchmarks Routes', () => {
  it('returns 401 without auth', async () => {
    const res = await get('/api/benchmarks');
    expect(res.status).toBe(401);
  });

  it('returns demo benchmarks when no data exists', async () => {
    const res = await get('/api/benchmarks', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.demo).toBe(true);
    expect(data.benchmarks.length).toBeGreaterThan(0);
    expect(data.benchmarks[0].percentile).toBeDefined();
  });

  it('submits metrics', async () => {
    const res = await post('/api/benchmarks/submit', {
      metrics: [
        { metric: 'revenue', value: 15000, period: '2025-01' },
        { metric: 'conversion_rate', value: 3.5, period: '2025-01' }
      ]
    }, authToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.count).toBe(2);
  });

  it('returns 400 without metrics array', async () => {
    const res = await post('/api/benchmarks/submit', {}, authToken);
    expect(res.status).toBe(400);
  });

  it('submits metrics for second user', async () => {
    const res = await post('/api/benchmarks/submit', {
      metrics: [
        { metric: 'revenue', value: 10000, period: '2025-01' },
        { metric: 'conversion_rate', value: 2.5, period: '2025-01' }
      ]
    }, authToken2);
    expect(res.status).toBe(201);
  });

  it('returns benchmark with percentile after data submission', async () => {
    const res = await get('/api/benchmarks', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.demo).toBe(false);
    expect(data.benchmarks.length).toBe(2);

    const revBenchmark = data.benchmarks.find(b => b.metric === 'revenue');
    expect(revBenchmark).toBeDefined();
    expect(revBenchmark.percentile).toBeDefined();
    expect(revBenchmark.total_participants).toBeGreaterThanOrEqual(2);
    // User1 has 15000 vs User2 has 10000, so User1 should be at 100th percentile
    expect(revBenchmark.percentile).toBe(100);
  });

  it('returns demo stats when no broad data exists initially', async () => {
    // Stats endpoint should still work with existing data
    const res = await get('/api/benchmarks/stats', authToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats).toBeDefined();
    expect(data.stats.length).toBeGreaterThan(0);
    expect(data.stats[0].avg).toBeDefined();
    expect(data.stats[0].median).toBeDefined();
  });
});
