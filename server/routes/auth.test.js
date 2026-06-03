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

function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

describe('Auth Routes', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  const testName = 'Test User';
  let authToken = null;
  let refreshTokenVal = null;

  describe('POST /api/auth/register', () => {
    it('creates user and returns token', async () => {
      const res = await post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        name: testName
      });
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.token).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);
      expect(data.user.name).toBe(testName);

      authToken = data.token;
      refreshTokenVal = data.refreshToken;
    });

    it('fails with duplicate email (409)', async () => {
      const res = await post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        name: testName
      });
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.error).toMatch(/already registered/i);
    });

    it('fails with short password (400)', async () => {
      const res = await post('/api/auth/register', {
        email: 'short@example.com',
        password: '1234567',
        name: 'Short'
      });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toMatch(/8 characters/);
    });

    it('fails with invalid email format (400)', async () => {
      const res = await post('/api/auth/register', {
        email: 'not-an-email',
        password: 'securepass123',
        name: 'Bad'
      });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toMatch(/email/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token with valid credentials', async () => {
      const res = await post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.token).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user.email).toBe(testEmail);

      authToken = data.token;
      refreshTokenVal = data.refreshToken;
    });

    it('returns 401 with wrong password', async () => {
      const res = await post('/api/auth/login', {
        email: testEmail,
        password: 'wrongpassword'
      });
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toBe('Invalid credentials');
    });

    it('returns 401 with non-existent email', async () => {
      const res = await post('/api/auth/login', {
        email: 'nobody@example.com',
        password: testPassword
      });
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user with valid token', async () => {
      const res = await get('/api/auth/me', authToken);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.email).toBe(testEmail);
      expect(data.name).toBe(testName);
      expect(data.created_at).toBeDefined();
    });

    it('returns 401 without token', async () => {
      const res = await get('/api/auth/me', null);
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await get('/api/auth/me', 'invalid-token-here');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns new token and new refresh token with valid refresh token', async () => {
      const res = await post('/api/auth/refresh', {
        refreshToken: refreshTokenVal
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.token).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      // Refresh token should be rotated (different from old one)
      expect(data.refreshToken).not.toBe(refreshTokenVal);
      authToken = data.token;
      // Update to new refresh token for subsequent tests
      refreshTokenVal = data.refreshToken;
    });

    it('returns 401 with the old (rotated) refresh token', async () => {
      // Use a login to get a fresh refresh token for this test
      const loginRes = await post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      });
      const loginData = await loginRes.json();
      const oldRefresh = loginData.refreshToken;

      // Use it once (rotates it)
      const refreshRes = await post('/api/auth/refresh', {
        refreshToken: oldRefresh
      });
      expect(refreshRes.status).toBe(200);
      const refreshData = await refreshRes.json();
      refreshTokenVal = refreshData.refreshToken;

      // Old token should no longer work
      const reuse = await post('/api/auth/refresh', {
        refreshToken: oldRefresh
      });
      expect(reuse.status).toBe(401);
    });

    it('returns 401 with invalid refresh token', async () => {
      const res = await post('/api/auth/refresh', {
        refreshToken: 'invalid-token'
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 without refresh token', async () => {
      const res = await post('/api/auth/refresh', {});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns success and invalidates refresh token', async () => {
      // Get a fresh refresh token via login
      const loginRes = await post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      });
      const loginData = await loginRes.json();
      const logoutRefresh = loginData.refreshToken;

      const res = await post('/api/auth/logout', {
        refreshToken: logoutRefresh
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify refresh token is invalid now
      const refreshRes = await post('/api/auth/refresh', {
        refreshToken: logoutRefresh
      });
      expect(refreshRes.status).toBe(401);
    });
  });
});
