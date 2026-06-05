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

  // Register a test user and get a token
  const email = `intel-test-${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123', name: 'Intel Test' })
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
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
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

describe('Intelligence Routes', () => {
  describe('Authentication', () => {
    it('returns 401 without token on all endpoints', async () => {
      const endpoints = [
        '/api/intelligence/recommendations',
        '/api/intelligence/goals',
        '/api/intelligence/alerts',
        '/api/intelligence/attribution',
        '/api/intelligence/digest'
      ];

      for (const endpoint of endpoints) {
        const res = await get(endpoint, null);
        expect(res.status).toBe(401);
      }
    });

    it('returns 401 with invalid token', async () => {
      const res = await get('/api/intelligence/recommendations', 'invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/intelligence/recommendations', () => {
    it('returns recommendations array (demo mode)', async () => {
      const res = await get('/api/intelligence/recommendations', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.recommendations.length).toBeGreaterThan(0);
    });

    it('each recommendation has required fields', async () => {
      const res = await get('/api/intelligence/recommendations', authToken);
      const data = await res.json();

      for (const rec of data.recommendations) {
        expect(rec.type).toBeDefined();
        expect(rec.text).toBeDefined();
        expect(rec.metric).toBeDefined();
        expect(rec.action).toBeDefined();
      }
    });
  });

  describe('GET/POST /api/intelligence/goals', () => {
    it('returns empty goals array initially', async () => {
      const res = await get('/api/intelligence/goals', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.goals).toBeDefined();
      expect(Array.isArray(data.goals)).toBe(true);
    });

    it('creates a goal with POST', async () => {
      const res = await post('/api/intelligence/goals', {
        metric: 'revenue',
        target: 50000,
        label: 'Monthly Revenue Goal',
        deadline: '2025-12-31'
      }, authToken);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.goal).toBeDefined();
      expect(data.goal.metric).toBe('revenue');
      expect(data.goal.target).toBe(50000);
      expect(data.goal.label).toBe('Monthly Revenue Goal');
      expect(data.goal.progress).toBe(0);
    });

    it('creates a goal with current progress', async () => {
      const res = await post('/api/intelligence/goals', {
        metric: 'leads',
        target: 100,
        current: 45,
        label: 'Lead Generation'
      }, authToken);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.goal.current).toBe(45);
      expect(data.goal.progress).toBe(45);
    });

    it('returns 400 without metric', async () => {
      const res = await post('/api/intelligence/goals', {
        target: 1000
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('returns 400 without target', async () => {
      const res = await post('/api/intelligence/goals', {
        metric: 'revenue'
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('returns 400 with negative target', async () => {
      const res = await post('/api/intelligence/goals', {
        metric: 'revenue',
        target: -100
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('GET returns created goals with progress', async () => {
      const res = await get('/api/intelligence/goals', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.goals.length).toBeGreaterThanOrEqual(2);

      for (const goal of data.goals) {
        expect(goal.progress).toBeDefined();
        expect(typeof goal.progress).toBe('number');
      }
    });
  });

  describe('GET/POST/PUT /api/intelligence/alerts', () => {
    let alertId;

    it('returns empty alerts array initially', async () => {
      const res = await get('/api/intelligence/alerts', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.alerts).toBeDefined();
      expect(Array.isArray(data.alerts)).toBe(true);
    });

    it('creates an alert with POST', async () => {
      const res = await post('/api/intelligence/alerts', {
        metric: 'revenue',
        condition: 'below',
        threshold: 1000,
        action_type: 'email'
      }, authToken);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.alert).toBeDefined();
      expect(data.alert.metric).toBe('revenue');
      expect(data.alert.condition).toBe('below');
      expect(data.alert.threshold).toBe(1000);
      expect(data.alert.action_type).toBe('email');
      expect(data.alert.enabled).toBe(1);
      alertId = data.alert.id;
    });

    it('creates alert with above condition', async () => {
      const res = await post('/api/intelligence/alerts', {
        metric: 'error_rate',
        condition: 'above',
        threshold: 5
      }, authToken);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.alert.condition).toBe('above');
      expect(data.alert.action_type).toBe('notify');
    });

    it('returns 400 without required fields', async () => {
      const res = await post('/api/intelligence/alerts', {
        metric: 'revenue'
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('returns 400 with invalid condition', async () => {
      const res = await post('/api/intelligence/alerts', {
        metric: 'revenue',
        condition: 'invalid',
        threshold: 100
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('returns 400 with non-numeric threshold', async () => {
      const res = await post('/api/intelligence/alerts', {
        metric: 'revenue',
        condition: 'below',
        threshold: 'abc'
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('GET returns created alerts', async () => {
      const res = await get('/api/intelligence/alerts', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.alerts.length).toBeGreaterThanOrEqual(2);
    });

    it('PUT toggles alert enabled state', async () => {
      const res = await put(`/api/intelligence/alerts/${alertId}`, {
        enabled: false
      }, authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.alert.enabled).toBe(0);
    });

    it('PUT re-enables alert', async () => {
      const res = await put(`/api/intelligence/alerts/${alertId}`, {
        enabled: true
      }, authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.alert.enabled).toBe(1);
    });

    it('PUT returns 404 for non-existent alert', async () => {
      const res = await put('/api/intelligence/alerts/99999', {
        enabled: false
      }, authToken);
      expect(res.status).toBe(404);
    });

    it('PUT returns 400 without enabled field', async () => {
      const res = await put(`/api/intelligence/alerts/${alertId}`, {}, authToken);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/intelligence/attribution', () => {
    it('returns attribution data (demo when no real data)', async () => {
      const res = await get('/api/intelligence/attribution', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.attribution).toBeDefined();
      expect(Array.isArray(data.attribution)).toBe(true);
      expect(data.attribution.length).toBeGreaterThan(0);
    });

    it('each attribution entry has source and channel', async () => {
      const res = await get('/api/intelligence/attribution', authToken);
      const data = await res.json();

      for (const entry of data.attribution) {
        expect(entry.source).toBeDefined();
        expect(entry.channel).toBeDefined();
        expect(entry.revenue).toBeDefined();
      }
    });

    it('accepts date range query params', async () => {
      const res = await get(
        '/api/intelligence/attribution?start_date=2025-01-01&end_date=2025-12-31',
        authToken
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.attribution).toBeDefined();
    });
  });

  describe('GET /api/intelligence/digest', () => {
    it('returns digest with all sections', async () => {
      const res = await get('/api/intelligence/digest', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.digest).toBeDefined();
      expect(data.digest.generated_at).toBeDefined();
      expect(data.digest.recommendations).toBeDefined();
      expect(Array.isArray(data.digest.recommendations)).toBe(true);
      expect(data.digest.recommendations.length).toBeLessThanOrEqual(3);
      expect(data.digest.goal_progress).toBeDefined();
      expect(data.digest.triggered_alerts).toBeDefined();
      expect(data.digest.revenue_summary).toBeDefined();
      expect(data.digest.revenue_summary.total_revenue).toBeDefined();
      expect(data.digest.revenue_summary.total_orders).toBeDefined();
    });

    it('digest includes goal progress from created goals', async () => {
      const res = await get('/api/intelligence/digest', authToken);
      const data = await res.json();

      expect(data.digest.goal_progress.length).toBeGreaterThan(0);
      for (const g of data.digest.goal_progress) {
        expect(g.metric).toBeDefined();
        expect(g.progress).toBeDefined();
      }
    });
  });

  describe('POST /api/intelligence/alerts/:id/trigger', () => {
    let alertId;

    beforeAll(async () => {
      const res = await post('/api/intelligence/alerts', {
        metric: 'conversion',
        condition: 'below',
        threshold: 2.5
      }, authToken);
      const data = await res.json();
      alertId = data.alert.id;
    });

    it('triggers an alert and records timestamp', async () => {
      const res = await post(`/api/intelligence/alerts/${alertId}/trigger`, {}, authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.triggered).toBe(true);
      expect(data.alert.triggered_at).toBeDefined();
      expect(data.alert.triggered_at).not.toBeNull();
    });

    it('returns 404 for non-existent alert', async () => {
      const res = await post('/api/intelligence/alerts/99999/trigger', {}, authToken);
      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await post(`/api/intelligence/alerts/${alertId}/trigger`, {}, null);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/intelligence/query', () => {
    it('returns chart data for revenue query', async () => {
      const res = await post('/api/intelligence/query', { question: 'Show me revenue for last week' }, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent).toBe('revenue');
      expect(data.chartType).toBe('line');
      expect(data.data).toBeDefined();
      expect(data.data.labels).toHaveLength(7);
      expect(data.data.values).toHaveLength(7);
      expect(data.summary).toContain('revenue');
    });

    it('returns chart data for leads query', async () => {
      const res = await post('/api/intelligence/query', { question: 'What are my lead sources?' }, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent).toBe('leads');
      expect(data.chartType).toBe('bar');
    });

    it('returns help for unknown queries', async () => {
      const res = await post('/api/intelligence/query', { question: 'What is the meaning of life?' }, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent).toBe('unknown');
      expect(data.data).toBeNull();
    });

    it('returns 400 for missing question', async () => {
      const res = await post('/api/intelligence/query', {}, authToken);
      expect(res.status).toBe(400);
    });
  });
});
