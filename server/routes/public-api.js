import { Router } from 'express';
import crypto from 'crypto';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApiKey } from '../middleware/apikey.js';

const router = Router();

// --- Key management routes (require auth) ---

// POST /api/keys - create API key
router.post('/keys', requireAuth, (req, res) => {
  const { name, permissions } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  // Generate a 32-byte random hex key
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const perms = permissions || ['read'];

  const result = db.prepare(
    'INSERT INTO api_keys (user_id, key_hash, name, permissions) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, keyHash, name, JSON.stringify(perms));

  res.status(201).json({
    id: result.lastInsertRowid,
    key: rawKey,
    name,
    permissions: perms
  });
});

// GET /api/keys - list user's API keys (no key values)
router.get('/keys', requireAuth, (req, res) => {
  const keys = db.prepare(
    'SELECT id, name, permissions, last_used, created_at, revoked_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);

  const parsed = keys.map(k => ({
    ...k,
    permissions: JSON.parse(k.permissions)
  }));

  res.json({ keys: parsed });
});

// DELETE /api/keys/:id - revoke key
router.delete('/keys/:id', requireAuth, (req, res) => {
  const key = db.prepare(
    'SELECT id FROM api_keys WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!key) {
    return res.status(404).json({ error: 'API key not found' });
  }

  db.prepare('UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').run(key.id);
  res.json({ message: 'API key revoked' });
});

// --- Public API routes (require API key) ---

// GET /api/v1/metrics - return user's KPI data
router.get('/v1/metrics', requireApiKey, (req, res) => {
  // Try to get from user_state
  const state = db.prepare(
    "SELECT value FROM user_state WHERE user_id = ? AND key = 'kpi_data'"
  ).get(req.apiUser.id);

  if (state && state.value) {
    return res.json(JSON.parse(state.value));
  }

  // Demo KPI data
  res.json({
    revenue: 48250,
    orders: 384,
    conversion_rate: 3.2,
    visitors: 12000,
    avg_order_value: 125.65
  });
});

// GET /api/v1/orders - return order history
router.get('/v1/orders', requireApiKey, (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM order_history WHERE user_id = ? ORDER BY order_date DESC LIMIT 100'
  ).all(req.apiUser.id);

  if (orders.length === 0) {
    return res.json({
      orders: [
        { product_name: 'Premium Widget', quantity: 2, revenue: 49.99, order_date: '2025-01-15' },
        { product_name: 'Basic Package', quantity: 1, revenue: 29.99, order_date: '2025-01-14' },
        { product_name: 'Pro Suite', quantity: 1, revenue: 99.99, order_date: '2025-01-13' }
      ],
      demo: true
    });
  }

  res.json({ orders, demo: false });
});

// GET /api/v1/reports - return generated reports
router.get('/v1/reports', requireApiKey, (req, res) => {
  const reports = db.prepare(
    'SELECT id, title, created_at FROM client_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.apiUser.id);

  if (reports.length === 0) {
    return res.json({
      reports: [
        { id: 1, title: 'Monthly Revenue Summary', created_at: '2025-01-01' },
        { id: 2, title: 'Q4 Performance Report', created_at: '2024-12-31' }
      ],
      demo: true
    });
  }

  res.json({ reports, demo: false });
});

export default router;
