import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt } from '../middleware/encryption.js';

const router = Router();

// All store routes require authentication
router.use(requireAuth);

// GET /api/stores - list user's stores
router.get('/', (req, res) => {
  const stores = db.prepare(
    'SELECT id, user_id, store_name, shop_domain, is_active, created_at FROM stores WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(stores);
});

// POST /api/stores - add a store
router.post('/', (req, res) => {
  const { store_name, shop_domain, credentials } = req.body;

  if (!store_name) {
    return res.status(400).json({ error: 'store_name is required' });
  }

  let credentialsEncrypted = null;
  if (credentials) {
    credentialsEncrypted = JSON.stringify(encrypt(credentials));
  }

  const result = db.prepare(
    'INSERT INTO stores (user_id, store_name, shop_domain, credentials_encrypted) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, store_name, shop_domain || null, credentialsEncrypted);

  const store = db.prepare('SELECT id, user_id, store_name, shop_domain, is_active, created_at FROM stores WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(store);
});

// PUT /api/stores/:id/activate - switch active store
router.put('/:id/activate', (req, res) => {
  const storeId = req.params.id;

  const store = db.prepare('SELECT * FROM stores WHERE id = ? AND user_id = ?').get(storeId, req.user.id);
  if (!store) {
    return res.status(404).json({ error: 'Store not found' });
  }

  // Deactivate all stores for this user
  db.prepare('UPDATE stores SET is_active = 0 WHERE user_id = ?').run(req.user.id);

  // Activate the requested store
  db.prepare('UPDATE stores SET is_active = 1 WHERE id = ?').run(storeId);

  res.json({ message: 'Store activated', store_id: Number(storeId) });
});

// DELETE /api/stores/:id - delete a store
router.delete('/:id', (req, res) => {
  const storeId = req.params.id;

  const store = db.prepare('SELECT * FROM stores WHERE id = ? AND user_id = ?').get(storeId, req.user.id);
  if (!store) {
    return res.status(404).json({ error: 'Store not found' });
  }

  db.prepare('DELETE FROM stores WHERE id = ?').run(storeId);
  res.json({ message: 'Store deleted' });
});

// GET /api/stores/aggregate - cross-store metrics
router.get('/aggregate', (req, res) => {
  const stores = db.prepare('SELECT id, store_name FROM stores WHERE user_id = ?').all(req.user.id);

  if (stores.length === 0) {
    return res.json({
      total_revenue: 0,
      total_orders: 0,
      best_store: null,
      worst_store: null,
      stores: []
    });
  }

  // Get revenue attribution data grouped by source (treating source as store identifier)
  const attribution = db.prepare(
    'SELECT source, SUM(revenue) as total_revenue, COUNT(*) as order_count FROM revenue_attribution WHERE user_id = ? GROUP BY source'
  ).all(req.user.id);

  const totalRevenue = attribution.reduce((sum, r) => sum + r.total_revenue, 0);
  const totalOrders = attribution.reduce((sum, r) => sum + r.order_count, 0);

  let bestStore = null;
  let worstStore = null;

  if (attribution.length > 0) {
    const sorted = [...attribution].sort((a, b) => b.total_revenue - a.total_revenue);
    bestStore = { source: sorted[0].source, revenue: sorted[0].total_revenue };
    worstStore = { source: sorted[sorted.length - 1].source, revenue: sorted[sorted.length - 1].total_revenue };
  }

  res.json({
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    best_store: bestStore,
    worst_store: worstStore,
    stores: stores.map(s => ({ id: s.id, store_name: s.store_name }))
  });
});

export default router;
