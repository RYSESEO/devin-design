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

describe('Embeds Routes', () => {
  describe('GET /api/embeds/chart/:type', () => {
    it('returns HTML with canvas and Chart.js for line chart', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/chart/line?title=Revenue&data=[10,20,30]&labels=["Jan","Feb","Mar"]`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const html = await res.text();
      expect(html).toContain('<canvas');
      expect(html).toContain('chart.js');
      expect(html).toContain('Revenue');
    });

    it('returns HTML for bar chart', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/chart/bar`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('<canvas');
      expect(html).toContain("type: 'bar'");
    });

    it('returns HTML for pie chart', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/chart/pie`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('<canvas');
      expect(html).toContain("type: 'pie'");
    });

    it('returns KPI HTML without canvas', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/chart/kpi?data=[42500]&title=Total%20Revenue`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('42500');
      expect(html).toContain('Total Revenue');
      expect(html).toContain('kpi-value');
    });

    it('returns 400 for invalid chart type', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/chart/invalid`);
      expect(res.status).toBe(400);
    });

    it('uses custom color', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/chart/line?color=%23ff0000`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('#ff0000');
    });
  });

  describe('GET /api/embeds/snippet/:type', () => {
    it('returns JavaScript snippet for line chart', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/snippet/line?title=Sales`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/javascript');
      const js = await res.text();
      expect(js).toContain('createElement');
      expect(js).toContain('chart.js');
      expect(js).toContain('Sales');
    });

    it('returns JavaScript snippet for kpi', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/snippet/kpi?data=[99]&title=Score`);
      expect(res.status).toBe(200);
      const js = await res.text();
      expect(js).toContain('99');
      expect(js).toContain('Score');
    });

    it('returns 400 for invalid snippet type', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/snippet/invalid`);
      expect(res.status).toBe(400);
    });

    it('creates a self-contained snippet with Chart.js loader', async () => {
      const res = await fetch(`${baseUrl}/api/embeds/snippet/bar`);
      expect(res.status).toBe(200);
      const js = await res.text();
      expect(js).toContain('canvas');
      expect(js).toContain('Chart');
    });
  });
});
