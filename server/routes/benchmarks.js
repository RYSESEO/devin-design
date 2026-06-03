import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All benchmark routes require authentication
router.use(requireAuth);

// POST /api/benchmarks/submit - submit metrics
router.post('/submit', (req, res) => {
  const { metrics } = req.body;

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return res.status(400).json({ error: 'metrics array is required' });
  }

  const insert = db.prepare(
    'INSERT INTO benchmark_data (user_id, metric, value, period) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      if (!item.metric || item.value === undefined || !item.period) {
        continue;
      }
      insert.run(req.user.id, item.metric, item.value, item.period);
    }
  });

  insertMany(metrics);
  res.status(201).json({ message: 'Metrics submitted', count: metrics.length });
});

// GET /api/benchmarks - get user's benchmark position
router.get('/', (req, res) => {
  // Get user's latest metric values
  const userMetrics = db.prepare(`
    SELECT metric, value, period FROM benchmark_data
    WHERE user_id = ? AND id IN (
      SELECT MAX(id) FROM benchmark_data WHERE user_id = ? GROUP BY metric
    )
  `).all(req.user.id, req.user.id);

  if (userMetrics.length === 0) {
    // Return demo benchmarks
    return res.json({
      benchmarks: [
        { metric: 'revenue', value: 12500, percentile: 65, total_participants: 50 },
        { metric: 'conversion_rate', value: 3.2, percentile: 72, total_participants: 50 },
        { metric: 'traffic', value: 8500, percentile: 58, total_participants: 50 }
      ],
      demo: true
    });
  }

  const benchmarks = userMetrics.map((um) => {
    // Count total distinct users who submitted this metric
    const totalRow = db.prepare(
      'SELECT COUNT(DISTINCT user_id) as total FROM benchmark_data WHERE metric = ?'
    ).get(um.metric);
    const total = totalRow.total;

    // Count users with lower values (using their latest submission)
    const lowerRow = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as lower_count FROM benchmark_data
      WHERE metric = ? AND user_id != ? AND value < ? AND id IN (
        SELECT MAX(id) FROM benchmark_data WHERE metric = ? GROUP BY user_id
      )
    `).get(um.metric, req.user.id, um.value, um.metric);

    const percentile = total > 1
      ? Math.round((lowerRow.lower_count / (total - 1)) * 100)
      : 50;

    return {
      metric: um.metric,
      value: um.value,
      percentile,
      total_participants: total
    };
  });

  res.json({ benchmarks, demo: false });
});

// GET /api/benchmarks/stats - aggregate stats
router.get('/stats', (req, res) => {
  const metrics = db.prepare(
    'SELECT DISTINCT metric FROM benchmark_data'
  ).all();

  if (metrics.length === 0) {
    // Return demo stats
    return res.json({
      stats: [
        { metric: 'revenue', avg: 15000, median: 12500, p25: 8000, p75: 20000 },
        { metric: 'conversion_rate', avg: 3.5, median: 3.2, p25: 2.1, p75: 4.8 },
        { metric: 'traffic', avg: 10000, median: 8500, p25: 5000, p75: 15000 }
      ],
      demo: true
    });
  }

  const stats = metrics.map(({ metric }) => {
    // Get all latest values per user for this metric
    const values = db.prepare(`
      SELECT value FROM benchmark_data
      WHERE metric = ? AND id IN (
        SELECT MAX(id) FROM benchmark_data WHERE metric = ? GROUP BY user_id
      )
      ORDER BY value ASC
    `).all(metric, metric).map(r => r.value);

    const n = values.length;
    const avg = values.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0
      ? (values[n / 2 - 1] + values[n / 2]) / 2
      : values[Math.floor(n / 2)];
    const p25 = values[Math.floor(n * 0.25)];
    const p75 = values[Math.floor(n * 0.75)];

    return { metric, avg: Math.round(avg * 100) / 100, median, p25, p75 };
  });

  res.json({ stats, demo: false });
});

export default router;
