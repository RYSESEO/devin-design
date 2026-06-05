import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All intelligence routes require authentication
router.use(requireAuth);

// --- Helper: check if user has Shopify connector configured ---
function hasShopifyConnector(userId) {
  const row = db.prepare(
    "SELECT value FROM user_state WHERE user_id = ? AND key = 'connector_shopify'"
  ).get(userId);
  return !!row;
}

// --- Helper: generate demo recommendations ---
function generateRecommendations(userId) {
  const hasShopify = hasShopifyConnector(userId);
  const recommendations = [];

  if (hasShopify) {
    recommendations.push({
      type: 'revenue',
      text: 'Revenue dropped 12% compared to last week. Consider running a flash sale to recover momentum.',
      metric: 'revenue',
      action: 'create_promotion'
    });
    recommendations.push({
      type: 'conversion',
      text: 'Conversion rate declined from 3.2% to 2.8%. Review checkout flow for friction points.',
      metric: 'conversion_rate',
      action: 'review_checkout'
    });
    recommendations.push({
      type: 'product',
      text: 'Product "Premium Widget" has 45% growth in views. Consider increasing ad spend.',
      metric: 'product_views',
      action: 'boost_product'
    });
    recommendations.push({
      type: 'pricing',
      text: 'Competitors are pricing similar items 15% higher. Opportunity to increase margins.',
      metric: 'pricing',
      action: 'adjust_pricing'
    });
    recommendations.push({
      type: 'inventory',
      text: 'Top seller "Classic Pack" has only 12 units left. Reorder to avoid stockout.',
      metric: 'inventory',
      action: 'reorder_stock'
    });
  } else {
    // Demo recommendations when no connectors configured
    recommendations.push({
      type: 'setup',
      text: 'Connect your Shopify store to unlock revenue insights and product recommendations.',
      metric: 'setup',
      action: 'connect_shopify'
    });
    recommendations.push({
      type: 'revenue',
      text: 'Based on demo data: Revenue shows a 12% weekly decline pattern. A promotional campaign could help.',
      metric: 'revenue',
      action: 'create_promotion'
    });
    recommendations.push({
      type: 'conversion',
      text: 'Demo insight: Conversion rates peak on Tuesdays. Schedule campaigns to maximize conversions.',
      metric: 'conversion_rate',
      action: 'schedule_campaign'
    });
    recommendations.push({
      type: 'product',
      text: 'Demo insight: Top-performing products drive 60% of revenue. Focus marketing on winners.',
      metric: 'product_performance',
      action: 'focus_marketing'
    });
    recommendations.push({
      type: 'pricing',
      text: 'Demo insight: A/B testing prices can increase margins by 8-15% without volume loss.',
      metric: 'pricing',
      action: 'ab_test_pricing'
    });
  }

  return recommendations;
}

// --- Helper: generate demo attribution data ---
function generateDemoAttribution() {
  return [
    { source: 'google', channel: 'organic', revenue: 12450.00, orders: 89, avg_order: 139.89 },
    { source: 'facebook', channel: 'paid_social', revenue: 8920.00, orders: 64, avg_order: 139.38 },
    { source: 'instagram', channel: 'social', revenue: 6340.00, orders: 45, avg_order: 140.89 },
    { source: 'email', channel: 'email', revenue: 5680.00, orders: 42, avg_order: 135.24 },
    { source: 'direct', channel: 'direct', revenue: 4230.00, orders: 31, avg_order: 136.45 },
    { source: 'tiktok', channel: 'paid_social', revenue: 3150.00, orders: 28, avg_order: 112.50 },
    { source: 'referral', channel: 'referral', revenue: 2100.00, orders: 15, avg_order: 140.00 }
  ];
}

// GET /api/intelligence/recommendations
router.get('/recommendations', (req, res) => {
  const userId = req.user.id;
  const recommendations = generateRecommendations(userId);
  res.json({ recommendations });
});

// GET /api/intelligence/goals
router.get('/goals', (req, res) => {
  const userId = req.user.id;
  const goals = db.prepare(
    'SELECT id, metric, target, current, label, deadline, created_at FROM intelligence_goals WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);

  const goalsWithProgress = goals.map(g => ({
    ...g,
    progress: g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0
  }));

  res.json({ goals: goalsWithProgress });
});

// POST /api/intelligence/goals
router.post('/goals', (req, res) => {
  const userId = req.user.id;
  const { metric, target, label, deadline, current } = req.body;

  if (!metric || target === undefined || target === null) {
    return res.status(400).json({ error: 'metric and target are required' });
  }

  if (typeof target !== 'number' || target < 0) {
    return res.status(400).json({ error: 'target must be a non-negative number' });
  }

  const stmt = db.prepare(
    'INSERT INTO intelligence_goals (user_id, metric, target, current, label, deadline) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(userId, metric, target, current || 0, label || null, deadline || null);

  const goal = db.prepare('SELECT * FROM intelligence_goals WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    goal: {
      ...goal,
      progress: goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0
    }
  });
});

// GET /api/intelligence/alerts
router.get('/alerts', (req, res) => {
  const userId = req.user.id;
  const alerts = db.prepare(
    'SELECT id, metric, condition, threshold, action_type, enabled, triggered_at, created_at FROM intelligence_alerts WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);

  res.json({ alerts });
});

// POST /api/intelligence/alerts
router.post('/alerts', (req, res) => {
  const userId = req.user.id;
  const { metric, condition, threshold, action_type } = req.body;

  if (!metric || !condition || threshold === undefined || threshold === null) {
    return res.status(400).json({ error: 'metric, condition, and threshold are required' });
  }

  if (!['above', 'below'].includes(condition)) {
    return res.status(400).json({ error: 'condition must be "above" or "below"' });
  }

  if (typeof threshold !== 'number') {
    return res.status(400).json({ error: 'threshold must be a number' });
  }

  const stmt = db.prepare(
    'INSERT INTO intelligence_alerts (user_id, metric, condition, threshold, action_type) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(userId, metric, condition, threshold, action_type || 'notify');

  const alert = db.prepare('SELECT * FROM intelligence_alerts WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ alert });
});

// PUT /api/intelligence/alerts/:id
router.put('/alerts/:id', (req, res) => {
  const userId = req.user.id;
  const alertId = req.params.id;
  const { enabled } = req.body;

  if (enabled === undefined || enabled === null) {
    return res.status(400).json({ error: 'enabled field is required' });
  }

  const existing = db.prepare(
    'SELECT * FROM intelligence_alerts WHERE id = ? AND user_id = ?'
  ).get(alertId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  db.prepare(
    'UPDATE intelligence_alerts SET enabled = ? WHERE id = ? AND user_id = ?'
  ).run(enabled ? 1 : 0, alertId, userId);

  const updated = db.prepare('SELECT * FROM intelligence_alerts WHERE id = ?').get(alertId);

  res.json({ alert: updated });
});

// GET /api/intelligence/attribution
router.get('/attribution', (req, res) => {
  const userId = req.user.id;
  const { start_date, end_date } = req.query;

  let attribution;
  let period;

  if (start_date && end_date) {
    attribution = db.prepare(
      `SELECT source, channel, SUM(revenue) as revenue, COUNT(*) as orders
       FROM revenue_attribution
       WHERE user_id = ? AND created_at >= ? AND created_at <= ?
       GROUP BY source, channel
       ORDER BY revenue DESC
       LIMIT 1000`
    ).all(userId, start_date, end_date);
    period = { start_date, end_date };
  } else {
    // Default to last 90 days when no date params provided
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 90);
    const defaultStartStr = defaultStart.toISOString().split('T')[0];
    const defaultEndStr = new Date().toISOString().split('T')[0];

    attribution = db.prepare(
      `SELECT source, channel, SUM(revenue) as revenue, COUNT(*) as orders
       FROM revenue_attribution
       WHERE user_id = ? AND created_at >= ?
       GROUP BY source, channel
       ORDER BY revenue DESC
       LIMIT 1000`
    ).all(userId, defaultStartStr);
    period = { start_date: defaultStartStr, end_date: defaultEndStr, default_window: '90 days' };
  }

  // If no real data, return demo data
  if (attribution.length === 0) {
    attribution = generateDemoAttribution();
  }

  res.json({ attribution, period });
});

// GET /api/intelligence/digest
router.get('/digest', (req, res) => {
  const userId = req.user.id;

  // Top 3 recommendations
  const recommendations = generateRecommendations(userId).slice(0, 3);

  // Goal progress
  const goals = db.prepare(
    'SELECT metric, target, current, label FROM intelligence_goals WHERE user_id = ?'
  ).all(userId);
  const goalProgress = goals.map(g => ({
    metric: g.metric,
    label: g.label,
    progress: g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0
  }));

  // Triggered alerts in last 24h
  const triggeredAlerts = db.prepare(
    "SELECT metric, condition, threshold, triggered_at FROM intelligence_alerts WHERE user_id = ? AND triggered_at IS NOT NULL AND triggered_at >= datetime('now', '-1 day')"
  ).all(userId);

  // Revenue summary from attribution
  const revenueSummary = db.prepare(
    'SELECT SUM(revenue) as total_revenue, COUNT(*) as total_orders FROM revenue_attribution WHERE user_id = ?'
  ).get(userId);

  res.json({
    digest: {
      generated_at: new Date().toISOString(),
      recommendations,
      goal_progress: goalProgress,
      triggered_alerts: triggeredAlerts,
      revenue_summary: {
        total_revenue: revenueSummary?.total_revenue || 0,
        total_orders: revenueSummary?.total_orders || 0
      }
    }
  });
});

// POST /api/intelligence/alerts/:id/trigger
router.post('/alerts/:id/trigger', (req, res) => {
  const userId = req.user.id;
  const alertId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM intelligence_alerts WHERE id = ? AND user_id = ?'
  ).get(alertId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  const now = new Date().toISOString();
  db.prepare(
    'UPDATE intelligence_alerts SET triggered_at = ? WHERE id = ? AND user_id = ?'
  ).run(now, alertId, userId);

  const updated = db.prepare('SELECT * FROM intelligence_alerts WHERE id = ?').get(alertId);

  // Broadcast alert trigger to WebSocket clients
  const broadcast = req.app.locals.broadcast;
  if (broadcast) {
    broadcast('alerts', {
      alertId: updated.id,
      metric: updated.metric,
      condition: updated.condition,
      threshold: updated.threshold,
      triggered_at: now
    });
  }

  res.json({ alert: updated, triggered: true });
});

// POST /api/intelligence/query - Natural language data query
router.post('/query', (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  const lower = question.toLowerCase();
  let result;

  // Rule-based intent detection (no external AI needed)
  if (/revenue|sales|shopify|orders|money/.test(lower)) {
    result = {
      intent: 'revenue',
      metric: 'shopify_revenue',
      chartType: 'line',
      title: 'Shopify Revenue',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [6200, 7400, 5800, 8400, 7100, 6900, 5900]
      },
      summary: 'Total revenue for the period: $47,832 (+24.1% vs previous period)',
      source: 'demo'
    };
  } else if (/lead|pipeline|conversion|funnel/.test(lower)) {
    result = {
      intent: 'leads',
      metric: 'lead_sources',
      chartType: 'bar',
      title: 'Lead Sources',
      data: {
        labels: ['Organic', 'Paid', 'Referral', 'Social', 'Direct'],
        values: [142, 78, 62, 48, 32]
      },
      summary: '362 total leads this period (+9.7%)',
      source: 'demo'
    };
  } else if (/agent|devin|session|pr|commit|deploy/.test(lower)) {
    result = {
      intent: 'agents',
      metric: 'agent_sessions',
      chartType: 'line',
      title: 'Agent Activity',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [156, 189, 201, 234, 178, 145, 181]
      },
      summary: '1,284 agent sessions this period (+18.4%)',
      source: 'demo'
    };
  } else if (/content|blog|view|engagement|post/.test(lower)) {
    result = {
      intent: 'content',
      metric: 'content_views',
      chartType: 'bar',
      title: 'Content Performance',
      data: {
        labels: ['Blog', 'YouTube', 'Social', 'Newsletter', 'Podcast'],
        values: [34200, 22100, 18600, 9400, 5120]
      },
      summary: '89,420 total content views (+31.2%)',
      source: 'demo'
    };
  } else if (/token|usage|spend|cost|model|claude|gpt/.test(lower)) {
    result = {
      intent: 'tokens',
      metric: 'token_usage',
      chartType: 'doughnut',
      title: 'Token Usage by Model',
      data: {
        labels: ['Claude 3.5 Sonnet', 'GPT-4o', 'Claude 3 Haiku', 'GPT-4o mini'],
        values: [840, 520, 380, 210]
      },
      summary: 'Total token spend: $2,140 for the 7-day period',
      source: 'demo'
    };
  } else if (/forecast|predict|project|next|future|trend/.test(lower)) {
    result = {
      intent: 'forecast',
      metric: 'forecast',
      chartType: 'line',
      title: '30-Day Forecast',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        values: [48000, 52000, 49000, 55000]
      },
      summary: 'Projected revenue next 30 days: ~$198,000 (+18% growth trajectory)',
      source: 'demo'
    };
  } else {
    result = {
      intent: 'unknown',
      metric: null,
      chartType: null,
      title: 'Help',
      data: null,
      summary: 'I can query: revenue, leads, agent activity, content, tokens, and forecasts. Try asking "Show me revenue for last week" or "What are my top lead sources?"',
      source: null
    };
  }

  res.json(result);
});

export default router;
