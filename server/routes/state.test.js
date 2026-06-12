import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';
import db from '../db/index.js';

let testPort;
let testServer;
let baseUrl;
let authToken = null;
let testUserId = null;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });

  // Register a test user to get a token
  const email = `state-test-${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123', name: 'State Tester' })
  });
  const data = await res.json();
  authToken = data.token;
  testUserId = data.user.id;
});

afterAll(() => {
  if (testServer) testServer.close();
  server.close();
});

function put(path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

function post(path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

describe('State Routes', () => {
  describe('PUT /api/state/layout', () => {
    it('saves layout for authenticated user', async () => {
      const layout = [{ id: 'card-1', section: 'main', order: 0, colSpan: 2, rowSpan: 1 }];
      const res = await put('/api/state/layout', { layout }, authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await put('/api/state/layout', { layout: [] }, null);
      expect(res.status).toBe(401);
    });

    it('returns 400 without layout body', async () => {
      const res = await put('/api/state/layout', {}, authToken);
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/state/preferences', () => {
    it('saves preferences for authenticated user', async () => {
      const prefs = { theme: 'cyberpunk', demoMode: true, period: '7d' };
      const res = await put('/api/state/preferences', prefs, authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await put('/api/state/preferences', { theme: 'dark' }, null);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/state/connectors', () => {
    it('saves connector config encrypted', async () => {
      const res = await put('/api/state/connectors', {
        connectorId: 'shopify',
        credentials: { shopDomain: 'myshop', accessToken: 'shpat_abc123' }
      }, authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify it is stored encrypted in DB
      const row = db.prepare(
        "SELECT value FROM user_state WHERE user_id = ? AND key = 'connector_shopify'"
      ).get(testUserId);
      expect(row).toBeDefined();

      const stored = JSON.parse(row.value);
      expect(stored).toHaveProperty('iv');
      expect(stored).toHaveProperty('encrypted');
      expect(stored).toHaveProperty('tag');
      // Credentials should NOT appear in plaintext
      expect(row.value).not.toContain('shpat_abc123');
    });

    it('returns 400 without connectorId', async () => {
      const res = await put('/api/state/connectors', { credentials: {} }, authToken);
      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await put('/api/state/connectors', {
        connectorId: 'github',
        credentials: { token: 'ghp_xxx' }
      }, null);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/state/connectors/:connectorId', () => {
    it('removes stored connector credentials', async () => {
      await put('/api/state/connectors', {
        connectorId: 'stripe',
        credentials: { secretKey: 'sk_test_abc' }
      }, authToken);

      const res = await fetch(`${baseUrl}/api/state/connectors/stripe`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const row = db.prepare(
        "SELECT value FROM user_state WHERE user_id = ? AND key = 'connector_stripe'"
      ).get(testUserId);
      expect(row).toBeUndefined();
    });

    it('returns 401 without auth', async () => {
      const res = await fetch(`${baseUrl}/api/state/connectors/stripe`, {
        method: 'DELETE'
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/state', () => {
    it('returns all user state', async () => {
      const res = await get('/api/state', authToken);
      expect(res.status).toBe(200);

      const state = await res.json();
      // layout was saved earlier
      expect(state.layout).toBeDefined();
      expect(Array.isArray(state.layout)).toBe(true);
      // preferences was saved earlier
      expect(state.preferences).toBeDefined();
      expect(state.preferences.theme).toBe('cyberpunk');
      // connectors are indicated but without raw secrets
      expect(state.connectors).toBeDefined();
      expect(state.connectors.shopify).toEqual({ connected: true });
    });

    it('returns 401 without auth', async () => {
      const res = await get('/api/state', null);
      expect(res.status).toBe(401);
    });
  });

  describe('Chat History', () => {
    it('POST /api/state/chat-history saves a message', async () => {
      const res = await post('/api/state/chat-history', {
        role: 'user',
        content: 'Hello there'
      }, authToken);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.role).toBe('user');
      expect(data.content).toBe('Hello there');
    });

    it('POST rejects invalid role', async () => {
      const res = await post('/api/state/chat-history', {
        role: 'system',
        content: 'not allowed'
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('POST rejects missing content', async () => {
      const res = await post('/api/state/chat-history', {
        role: 'user'
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('GET /api/state/chat-history returns messages', async () => {
      // Add another message
      await post('/api/state/chat-history', {
        role: 'assistant',
        content: 'Hello! How can I help?'
      }, authToken);

      const res = await get('/api/state/chat-history', authToken);
      expect(res.status).toBe(200);

      const messages = await res.json();
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThanOrEqual(2);
      // Should be in chronological order (oldest first based on id)
      const contents = messages.map(m => m.content);
      expect(contents).toContain('Hello there');
      expect(contents).toContain('Hello! How can I help?');
      const idx1 = contents.indexOf('Hello there');
      const idx2 = contents.indexOf('Hello! How can I help?');
      expect(idx2).toBeGreaterThan(idx1);
    });

    it('GET /api/state/chat-history respects 100 message limit', async () => {
      // Insert 100 more messages
      const stmt = db.prepare(
        'INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)'
      );
      for (let i = 0; i < 100; i++) {
        stmt.run(testUserId, 'user', `Message ${i}`);
      }

      const res = await get('/api/state/chat-history', authToken);
      const messages = await res.json();
      expect(messages.length).toBe(100);
    });

    it('returns 401 without auth', async () => {
      const res = await get('/api/state/chat-history', null);
      expect(res.status).toBe(401);
    });
  });

  describe('Proxy Routes - Connector Not Configured', () => {
    it('POST /api/proxy/shopify returns 400 when not configured', async () => {
      // Use a fresh user or a connector that is not set up
      const res = await post('/api/proxy/github', {
        endpoint: '/user/repos',
        method: 'GET'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Connector not configured');
    });

    it('POST /api/proxy/stripe returns 400 when not configured', async () => {
      const res = await post('/api/proxy/stripe', {
        endpoint: '/v1/charges',
        method: 'GET'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Connector not configured');
    });

    it('POST /api/proxy/analytics returns 400 when not configured', async () => {
      const res = await post('/api/proxy/analytics', {
        endpoint: ':runReport',
        method: 'POST'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Connector not configured');
    });

    it('POST /api/proxy/search-console returns 400 when not configured', async () => {
      const res = await post('/api/proxy/search-console', {
        endpoint: '/query',
        method: 'POST'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Connector not configured');
    });

    it('proxy routes return 401 without auth', async () => {
      const res = await post('/api/proxy/shopify', {
        endpoint: '/orders.json',
        method: 'GET'
      }, null);
      expect(res.status).toBe(401);
    });
  });

  describe('Proxy Routes - SSRF Rejection', () => {
    // Configure connectors so requests reach the URL validation layer
    beforeAll(async () => {
      // Configure GitHub connector
      await put('/api/state/connectors', {
        connectorId: 'github',
        credentials: { token: 'ghp_test_token_123' }
      }, authToken);

      // Configure Shopify connector
      await put('/api/state/connectors', {
        connectorId: 'shopify',
        credentials: { shopDomain: 'testshop', accessToken: 'shpat_test_123' }
      }, authToken);
    });

    it('POST /api/proxy/github rejects absolute URL to external origin', async () => {
      const res = await post('/api/proxy/github', {
        endpoint: 'https://evil.com/steal',
        method: 'GET'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Invalid endpoint');
    });

    it('POST /api/proxy/github rejects protocol-relative URL to external origin', async () => {
      const res = await post('/api/proxy/github', {
        endpoint: '//evil.com/steal-data',
        method: 'GET'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Invalid endpoint');
    });

    it('POST /api/proxy/shopify rejects absolute URL to external origin', async () => {
      const res = await post('/api/proxy/shopify', {
        endpoint: 'https://attacker.io/exfiltrate',
        method: 'GET'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Invalid endpoint');
    });

    it('POST /api/proxy/shopify rejects protocol-relative URL to external origin', async () => {
      const res = await post('/api/proxy/shopify', {
        endpoint: '//malicious.net/path',
        method: 'GET'
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Invalid endpoint');
    });
  });

  describe('Chat History - Content Length Limit', () => {
    it('POST /api/state/chat-history rejects content longer than 4096 characters', async () => {
      const longContent = 'x'.repeat(4097);
      const res = await post('/api/state/chat-history', {
        role: 'user',
        content: longContent
      }, authToken);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Content too long');
    });

    it('POST /api/state/chat-history accepts content at exactly 4096 characters', async () => {
      const maxContent = 'y'.repeat(4096);
      const res = await post('/api/state/chat-history', {
        role: 'user',
        content: maxContent
      }, authToken);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.content).toBe(maxContent);
    });
  });
});
