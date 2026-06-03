import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All report routes require authentication
router.use(requireAuth);

// POST /api/reports/generate - generate a report
router.post('/generate', (req, res) => {
  const { title, date_range } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  // Pull data from intelligence goals
  const goals = db.prepare(
    'SELECT * FROM intelligence_goals WHERE user_id = ?'
  ).all(req.user.id);

  // Pull data from revenue attribution
  const attribution = db.prepare(
    'SELECT source, channel, SUM(revenue) as total_revenue, COUNT(*) as order_count FROM revenue_attribution WHERE user_id = ? GROUP BY source, channel'
  ).all(req.user.id);

  // Pull data from alerts
  const alerts = db.prepare(
    'SELECT * FROM intelligence_alerts WHERE user_id = ?'
  ).all(req.user.id);

  const reportData = {
    generated_at: new Date().toISOString(),
    date_range: date_range || null,
    summary: {
      total_goals: goals.length,
      total_attribution_sources: attribution.length,
      total_alerts: alerts.length,
      total_revenue: attribution.reduce((sum, r) => sum + r.total_revenue, 0)
    },
    goals,
    attribution,
    alerts
  };

  const result = db.prepare(
    'INSERT INTO client_reports (user_id, title, report_data) VALUES (?, ?, ?)'
  ).run(req.user.id, title, JSON.stringify(reportData));

  const report = db.prepare('SELECT * FROM client_reports WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    ...report,
    report_data: JSON.parse(report.report_data)
  });
});

// GET /api/reports - list user's reports
router.get('/', (req, res) => {
  const reports = db.prepare(
    'SELECT id, user_id, workspace_id, title, created_at FROM client_reports WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(reports);
});

// GET /api/reports/:id - get specific report
router.get('/:id', (req, res) => {
  const report = db.prepare(
    'SELECT * FROM client_reports WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.json({
    ...report,
    report_data: JSON.parse(report.report_data)
  });
});

export default router;
