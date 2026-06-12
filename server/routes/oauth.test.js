import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { app, server } from '../index.js';
import db from '../db/index.js';

let testPort;
let testServer;
let baseUrl;
let authToken;
let userId;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });

  // Register a test user
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `oauth-test-${Date.now()}@example.com`,
      password: 'securepass123',
      name: 'OAuth Test User'
    })
  });
  const data = await res.json();
  authToken = data.token;
  userId = data.user.id;
});

afterAll(() => {
  if (testServer) testServer.close();
  server.close();
});

function get(path, token) {
  return fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: 'manual'
  });
}

function del(path, token) {
  return fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('OAuth Routes', () => {
  describe('GET /api/oauth/shopify/install', () => {
    it('redirects to Shopify OAuth URL with valid shop', async () => {
      const res = await get('/api/oauth/shopify/install?shop=test-store', authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('https://test-store.myshopify.com/admin/oauth/authorize');
      expect(location).toContain('client_id=');
      expect(location).toContain('scope=');
      expect(location).toContain('state=');
      expect(location).toContain('redirect_uri=');
    });

    it('returns 400 when shop is missing', async () => {
      const res = await get('/api/oauth/shopify/install', authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing shop');
    });

    it('returns 400 with invalid shop format', async () => {
      const res = await get('/api/oauth/shopify/install?shop=invalid_shop!@#', authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid shop format');
    });

    it('returns 400 with shop containing special characters', async () => {
      const res = await get('/api/oauth/shopify/install?shop=shop.domain.com', authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid shop format');
    });

    it('returns 401 without auth token', async () => {
      const res = await get('/api/oauth/shopify/install?shop=test-store', null);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/oauth/shopify/callback', () => {
    it('redirects with error for invalid state', async () => {
      const res = await get('/api/oauth/shopify/callback?code=test-code&shop=test-store&state=invalid-state', authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=error');
      expect(location).toContain('invalid_state');
    });

    it('redirects with error when code is missing', async () => {
      // Insert a valid state first
      const state = 'test-state-no-code-' + Date.now();
      db.prepare("INSERT INTO oauth_states (user_id, provider, state, shop, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))").run(userId, 'shopify', state, 'test-store');

      const res = await get(`/api/oauth/shopify/callback?shop=test-store&state=${state}`, authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=error');
      expect(location).toContain('missing_code');
    });

    it('exchanges code and stores token on valid callback', async () => {
      // Insert a valid state
      const state = 'test-state-valid-' + Date.now();
      db.prepare("INSERT INTO oauth_states (user_id, provider, state, shop, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))").run(userId, 'shopify', state, 'test-store');

      // Mock fetch for the token exchange
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, opts) => {
        if (typeof url === 'string' && url.includes('myshopify.com/admin/oauth/access_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'shpat_test_token_123' })
          });
        }
        // Fall through to original fetch for non-mocked URLs
        return originalFetch(url, opts);
      });

      const res = await originalFetch(`${baseUrl}/api/oauth/shopify/callback?code=test-code&shop=test-store&state=${state}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        redirect: 'manual'
      });

      global.fetch = originalFetch;

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=success');

      // Verify token was stored
      const tokenRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_shopify_token');
      expect(tokenRow).toBeTruthy();
      expect(tokenRow.value).toBeTruthy();
      // Verify it's encrypted (should be JSON with iv, encrypted, tag)
      const parsed = JSON.parse(tokenRow.value);
      expect(parsed.iv).toBeDefined();
      expect(parsed.encrypted).toBeDefined();
      expect(parsed.tag).toBeDefined();

      // Verify shop was stored
      const shopRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_shopify_shop');
      expect(shopRow).toBeTruthy();
      expect(shopRow.value).toBe('test-store');

      // Verify state was deleted (one-time use)
      const stateRow = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
      expect(stateRow).toBeUndefined();
    });
  });

  describe('GET /api/oauth/github/authorize', () => {
    it('redirects to GitHub OAuth URL', async () => {
      const res = await get('/api/oauth/github/authorize', authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('https://github.com/login/oauth/authorize');
      expect(location).toContain('client_id=');
      expect(location).toContain('scope=repo,user');
      expect(location).toContain('state=');
      expect(location).toContain('redirect_uri=');
    });

    it('returns 401 without auth token', async () => {
      const res = await get('/api/oauth/github/authorize', null);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/oauth/github/callback', () => {
    it('redirects with error for invalid state', async () => {
      const res = await get('/api/oauth/github/callback?code=test-code&state=invalid-state', authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=error');
      expect(location).toContain('invalid_state');
    });

    it('exchanges code and stores token on valid callback', async () => {
      // Insert a valid state
      const state = 'test-github-state-' + Date.now();
      db.prepare("INSERT INTO oauth_states (user_id, provider, state, expires_at) VALUES (?, ?, ?, datetime('now', '+10 minutes'))").run(userId, 'github', state);

      // Mock fetch for the token exchange
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, opts) => {
        if (typeof url === 'string' && url.includes('github.com/login/oauth/access_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'gho_test_token_456' })
          });
        }
        return originalFetch(url, opts);
      });

      const res = await originalFetch(`${baseUrl}/api/oauth/github/callback?code=test-code&state=${state}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        redirect: 'manual'
      });

      global.fetch = originalFetch;

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=success');

      // Verify token was stored encrypted
      const tokenRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_github_token');
      expect(tokenRow).toBeTruthy();
      const parsed = JSON.parse(tokenRow.value);
      expect(parsed.iv).toBeDefined();
      expect(parsed.encrypted).toBeDefined();
      expect(parsed.tag).toBeDefined();

      // Verify state was deleted
      const stateRow = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
      expect(stateRow).toBeUndefined();
    });
  });

  describe('GET /api/oauth/google/authorize', () => {
    it('redirects to Google OAuth URL', async () => {
      const res = await get('/api/oauth/google/authorize', authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=');
      expect(location).toContain('access_type=offline');
      expect(location).toContain('prompt=consent');
      expect(location).toContain('analytics.readonly');
      expect(location).toContain('webmasters.readonly');
      expect(location).toContain('state=');
    });

    it('returns 401 without auth token', async () => {
      const res = await get('/api/oauth/google/authorize', null);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/oauth/google/callback', () => {
    it('redirects with error for invalid state', async () => {
      const res = await get('/api/oauth/google/callback?code=test-code&state=invalid-state', authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=error');
      expect(location).toContain('invalid_state');
    });

    it('redirects with error when code is missing', async () => {
      const state = 'test-google-state-nocode-' + Date.now();
      db.prepare("INSERT INTO oauth_states (user_id, provider, state, expires_at) VALUES (?, ?, ?, datetime('now', '+10 minutes'))").run(userId, 'google', state);

      const res = await get(`/api/oauth/google/callback?state=${state}`, authToken);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=error');
      expect(location).toContain('missing_code');
    });

    it('exchanges code and stores access + refresh tokens on valid callback', async () => {
      const state = 'test-google-state-' + Date.now();
      db.prepare("INSERT INTO oauth_states (user_id, provider, state, expires_at) VALUES (?, ?, ?, datetime('now', '+10 minutes'))").run(userId, 'google', state);

      // Mock fetch for the token exchange
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, opts) => {
        if (typeof url === 'string' && url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              access_token: 'ya29.test_access_token',
              refresh_token: '1//test_refresh_token',
              expires_in: 3600
            })
          });
        }
        return originalFetch(url, opts);
      });

      const res = await originalFetch(`${baseUrl}/api/oauth/google/callback?code=test-code&state=${state}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        redirect: 'manual'
      });

      global.fetch = originalFetch;

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('status=success');

      // Verify access and refresh tokens were stored encrypted
      for (const key of ['oauth_google_token', 'oauth_google_refresh']) {
        const row = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, key);
        expect(row).toBeTruthy();
        const parsed = JSON.parse(row.value);
        expect(parsed.iv).toBeDefined();
        expect(parsed.encrypted).toBeDefined();
        expect(parsed.tag).toBeDefined();
      }

      // Expiry timestamp stored in the future
      const expiresRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_google_expires');
      expect(expiresRow).toBeTruthy();
      expect(parseInt(expiresRow.value, 10)).toBeGreaterThan(Date.now());

      // Verify state was deleted
      const stateRow = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
      expect(stateRow).toBeUndefined();
    });
  });

  describe('getGoogleAccessToken', () => {
    it('refreshes an expired access token using the stored refresh token', async () => {
      const { getGoogleAccessToken } = await import('./oauth.js');

      // Force the stored token to look expired
      db.prepare(
        'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
      ).run(userId, 'oauth_google_expires', String(Date.now() - 1000));

      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, opts) => {
        if (typeof url === 'string' && url.includes('oauth2.googleapis.com/token')) {
          const body = String(opts.body);
          expect(body).toContain('grant_type=refresh_token');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'ya29.refreshed_token', expires_in: 3600 })
          });
        }
        return originalFetch(url, opts);
      });

      const token = await getGoogleAccessToken(userId);
      global.fetch = originalFetch;

      expect(token).toBe('ya29.refreshed_token');

      // New expiry persisted in the future
      const expiresRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_google_expires');
      expect(parseInt(expiresRow.value, 10)).toBeGreaterThan(Date.now());
    });

    it('returns the stored token without refreshing when not expired', async () => {
      const { getGoogleAccessToken } = await import('./oauth.js');
      const token = await getGoogleAccessToken(userId);
      expect(token).toBe('ya29.refreshed_token');
    });

    it('returns null for a user with no Google connection', async () => {
      const { getGoogleAccessToken } = await import('./oauth.js');
      const token = await getGoogleAccessToken(999999);
      expect(token).toBeNull();
    });
  });

  describe('GET /api/oauth/status', () => {
    it('returns connection status for providers', async () => {
      const res = await get('/api/oauth/status', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.shopify).toBeDefined();
      expect(data.github).toBeDefined();
      expect(data.google).toBeDefined();
      expect(typeof data.shopify.connected).toBe('boolean');
      expect(typeof data.github.connected).toBe('boolean');
      expect(typeof data.google.connected).toBe('boolean');
    });

    it('shows connected state after tokens are stored', async () => {
      // Tokens were stored in previous tests, should show connected
      const res = await get('/api/oauth/status', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.shopify.connected).toBe(true);
      expect(data.shopify.shop).toBe('test-store');
      expect(data.github.connected).toBe(true);
      expect(data.google.connected).toBe(true);
    });

    it('returns 401 without auth token', async () => {
      const res = await get('/api/oauth/status', null);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/oauth/shopify/disconnect', () => {
    it('removes Shopify OAuth tokens', async () => {
      const res = await del('/api/oauth/shopify/disconnect', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify tokens are removed
      const tokenRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_shopify_token');
      expect(tokenRow).toBeUndefined();
      const shopRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_shopify_shop');
      expect(shopRow).toBeUndefined();
    });

    it('returns 401 without auth token', async () => {
      const res = await del('/api/oauth/shopify/disconnect', null);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/oauth/github/disconnect', () => {
    it('removes GitHub OAuth token', async () => {
      const res = await del('/api/oauth/github/disconnect', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify token is removed
      const tokenRow = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, 'oauth_github_token');
      expect(tokenRow).toBeUndefined();
    });

    it('shows disconnected state after removal', async () => {
      const res = await get('/api/oauth/status', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.shopify.connected).toBe(false);
      expect(data.github.connected).toBe(false);
    });
  });

  describe('DELETE /api/oauth/google/disconnect', () => {
    it('removes Google OAuth tokens, refresh token, and expiry', async () => {
      const res = await del('/api/oauth/google/disconnect', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      for (const key of ['oauth_google_token', 'oauth_google_refresh', 'oauth_google_expires']) {
        const row = db.prepare('SELECT value FROM user_state WHERE user_id = ? AND key = ?').get(userId, key);
        expect(row).toBeUndefined();
      }

      const status = await get('/api/oauth/status', authToken);
      const statusData = await status.json();
      expect(statusData.google.connected).toBe(false);
    });

    it('returns 401 without auth token', async () => {
      const res = await del('/api/oauth/google/disconnect', null);
      expect(res.status).toBe(401);
    });
  });
});
