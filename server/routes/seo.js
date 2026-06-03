import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/seo/keywords - add keyword ranking data
router.post('/keywords', (req, res) => {
  const userId = req.user.id;
  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'keywords array is required' });
  }

  const insert = db.prepare(
    'INSERT INTO keyword_rankings (user_id, keyword, position, clicks, impressions, url, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items) => {
    for (const kw of items) {
      if (!kw.keyword || !kw.recorded_at) continue;
      insert.run(
        userId,
        kw.keyword,
        kw.position || null,
        kw.clicks || 0,
        kw.impressions || 0,
        kw.url || null,
        kw.recorded_at
      );
    }
  });

  insertMany(keywords);
  res.status(201).json({ success: true, count: keywords.length });
});

// GET /api/seo/opportunities - analyze rankings for opportunities
router.get('/opportunities', (req, res) => {
  const userId = req.user.id;

  const rows = db.prepare(
    'SELECT keyword, position, clicks, impressions, recorded_at FROM keyword_rankings WHERE user_id = ? ORDER BY keyword, recorded_at'
  ).all(userId);

  if (rows.length === 0) {
    return res.json({ opportunities: generateDemoOpportunities() });
  }

  // Group by keyword
  const byKeyword = {};
  for (const row of rows) {
    if (!byKeyword[row.keyword]) byKeyword[row.keyword] = [];
    byKeyword[row.keyword].push(row);
  }

  const opportunities = [];
  for (const [keyword, entries] of Object.entries(byKeyword)) {
    if (entries.length < 2) continue;

    const latest = entries[entries.length - 1];
    const earliest = entries[0];

    const positionChange = earliest.position - latest.position; // positive = improvement
    const totalClicks = entries.reduce((s, e) => s + e.clicks, 0);
    const totalImpressions = entries.reduce((s, e) => s + e.impressions, 0);
    const ctr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;

    // Rising keyword (position improved)
    if (positionChange > 0) {
      opportunities.push({
        keyword,
        current_position: latest.position,
        previous_position: earliest.position,
        change: positionChange,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr,
        type: 'rising'
      });
    }

    // High impressions but low CTR (< 3%)
    if (totalImpressions > 100 && ctr < 3) {
      opportunities.push({
        keyword,
        current_position: latest.position,
        previous_position: earliest.position,
        change: positionChange,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr,
        type: 'low_ctr'
      });
    }
  }

  res.json({ opportunities });
});

// GET /api/seo/trends - keyword position trends (moving average)
router.get('/trends', (req, res) => {
  const userId = req.user.id;

  const rows = db.prepare(
    'SELECT keyword, position, recorded_at FROM keyword_rankings WHERE user_id = ? ORDER BY keyword, recorded_at'
  ).all(userId);

  if (rows.length === 0) {
    return res.json({ trends: [] });
  }

  // Group by keyword
  const byKeyword = {};
  for (const row of rows) {
    if (!byKeyword[row.keyword]) byKeyword[row.keyword] = [];
    byKeyword[row.keyword].push(row);
  }

  // Top keywords by number of data points
  const sorted = Object.entries(byKeyword).sort((a, b) => b[1].length - a[1].length).slice(0, 10);

  const trends = sorted.map(([keyword, entries]) => {
    // 3-point moving average
    const movingAvg = [];
    for (let i = 0; i < entries.length; i++) {
      const window = entries.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((s, e) => s + e.position, 0) / window.length;
      movingAvg.push({
        date: entries[i].recorded_at,
        position: Math.round(avg * 10) / 10
      });
    }
    return { keyword, data: movingAvg };
  });

  res.json({ trends });
});

// Helper: demo opportunities
function generateDemoOpportunities() {
  const keywords = [
    { keyword: 'best shopify apps', current_position: 12, previous_position: 25, impressions: 5400, clicks: 120, type: 'rising' },
    { keyword: 'ecommerce analytics', current_position: 8, previous_position: 15, impressions: 3200, clicks: 85, type: 'rising' },
    { keyword: 'shopify seo tools', current_position: 18, previous_position: 30, impressions: 2800, clicks: 45, type: 'rising' },
    { keyword: 'online store optimization', current_position: 5, previous_position: 5, impressions: 8900, clicks: 210, type: 'low_ctr' },
    { keyword: 'product page seo', current_position: 7, previous_position: 7, impressions: 6500, clicks: 140, type: 'low_ctr' },
    { keyword: 'ecommerce growth', current_position: 14, previous_position: 22, impressions: 4100, clicks: 65, type: 'rising' },
    { keyword: 'shopify conversion rate', current_position: 9, previous_position: 9, impressions: 7200, clicks: 180, type: 'low_ctr' },
    { keyword: 'store analytics dashboard', current_position: 6, previous_position: 11, impressions: 2100, clicks: 55, type: 'rising' },
    { keyword: 'ecommerce automation', current_position: 11, previous_position: 11, impressions: 5600, clicks: 95, type: 'low_ctr' },
    { keyword: 'dropshipping tools', current_position: 20, previous_position: 35, impressions: 9200, clicks: 150, type: 'rising' }
  ];

  return keywords.map(kw => ({
    ...kw,
    change: kw.previous_position - kw.current_position,
    ctr: Math.round((kw.clicks / kw.impressions) * 10000) / 100
  }));
}

export default router;
