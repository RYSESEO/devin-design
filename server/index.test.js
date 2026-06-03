import { describe, it, expect, afterAll } from 'vitest';
import { app, server } from './index.js';

// Simple request helper without external dependencies
function request(app) {
  return {
    get(path) {
      return new Promise((resolve, reject) => {
        const PORT = 0; // random available port
        const testServer = app.listen(PORT, () => {
          const addr = testServer.address();
          fetch(`http://localhost:${addr.port}${path}`)
            .then(async (res) => {
              const body = await res.json().catch(() => null);
              testServer.close();
              resolve({ status: res.status, body });
            })
            .catch((err) => {
              testServer.close();
              reject(err);
            });
        });
      });
    }
  };
}

describe('Server', () => {
  afterAll(() => {
    server.close();
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
