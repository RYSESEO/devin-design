import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/pricing/tests - list user's price tests
router.get('/tests', (req, res) => {
  const userId = req.user.id;
  const tests = db.prepare('SELECT * FROM price_tests WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json({ tests });
});

// POST /api/pricing/tests - create a price test
router.post('/tests', (req, res) => {
  const userId = req.user.id;
  const { product_name, original_price, test_price, product_id } = req.body;

  if (!product_name || original_price == null || test_price == null) {
    return res.status(400).json({ error: 'product_name, original_price, and test_price are required' });
  }

  const result = db.prepare(
    'INSERT INTO price_tests (user_id, product_id, product_name, original_price, test_price) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, product_id || null, product_name, original_price, test_price);

  const test = db.prepare('SELECT * FROM price_tests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ test });
});

// PUT /api/pricing/tests/:id - update a price test
router.put('/tests/:id', (req, res) => {
  const userId = req.user.id;
  const testId = req.params.id;
  const { conversion_original, conversion_test, status } = req.body;

  const existing = db.prepare('SELECT * FROM price_tests WHERE id = ? AND user_id = ?').get(testId, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const updates = [];
  const values = [];

  if (conversion_original != null) {
    updates.push('conversion_original = ?');
    values.push(conversion_original);
  }
  if (conversion_test != null) {
    updates.push('conversion_test = ?');
    values.push(conversion_test);
  }
  if (status) {
    updates.push('status = ?');
    values.push(status);
    if (status === 'completed') {
      updates.push('ended_at = CURRENT_TIMESTAMP');
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(testId, userId);
  db.prepare(`UPDATE price_tests SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM price_tests WHERE id = ?').get(testId);
  res.json({ test: updated });
});

// GET /api/pricing/recommendations - recommendations from completed tests
router.get('/recommendations', (req, res) => {
  const userId = req.user.id;

  const completedTests = db.prepare(
    "SELECT * FROM price_tests WHERE user_id = ? AND status = 'completed'"
  ).all(userId);

  if (completedTests.length === 0) {
    return res.json({ recommendations: generateDemoRecommendations() });
  }

  const recommendations = completedTests.map(test => {
    const revenueOriginal = test.original_price * test.conversion_original;
    const revenueTest = test.test_price * test.conversion_test;

    const recommended_price = revenueTest > revenueOriginal ? test.test_price : test.original_price;
    const maxRevenue = Math.max(revenueOriginal, revenueTest);
    const minRevenue = Math.min(revenueOriginal, revenueTest);
    const increase_pct = minRevenue > 0 ? Math.round(((maxRevenue - minRevenue) / minRevenue) * 10000) / 100 : 0;

    // Confidence based on difference magnitude
    const diff = Math.abs(revenueTest - revenueOriginal);
    const avg = (revenueOriginal + revenueTest) / 2;
    const confidence = avg > 0 ? Math.min(0.95, Math.round((diff / avg) * 100) / 100 + 0.5) : 0.5;

    return {
      product_name: test.product_name,
      recommended_price,
      expected_revenue_increase_pct: increase_pct,
      confidence
    };
  });

  res.json({ recommendations });
});

// Helper: demo recommendations
function generateDemoRecommendations() {
  return [
    { product_name: 'Premium Widget', recommended_price: 34.99, expected_revenue_increase_pct: 12.5, confidence: 0.82 },
    { product_name: 'Classic Pack', recommended_price: 49.99, expected_revenue_increase_pct: 8.3, confidence: 0.75 },
    { product_name: 'Starter Bundle', recommended_price: 19.99, expected_revenue_increase_pct: 15.2, confidence: 0.68 },
    { product_name: 'Pro Toolkit', recommended_price: 79.99, expected_revenue_increase_pct: 6.7, confidence: 0.88 }
  ];
}

export default router;
