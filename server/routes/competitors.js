import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/competitors - list tracked competitors
router.get('/', (req, res) => {
  const userId = req.user.id;
  const competitors = db.prepare('SELECT * FROM competitors WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json({ competitors });
});

// POST /api/competitors - add competitor
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { name, domain, tracked_products } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = db.prepare(
    'INSERT INTO competitors (user_id, name, domain, tracked_products) VALUES (?, ?, ?, ?)'
  ).run(userId, name, domain || null, JSON.stringify(tracked_products || []));

  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ competitor });
});

// GET /api/competitors/:id/changes - list changes for a competitor
router.get('/:id/changes', (req, res) => {
  const userId = req.user.id;
  const competitorId = req.params.id;

  // Verify ownership
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ? AND user_id = ?').get(competitorId, userId);
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }

  const changes = db.prepare('SELECT * FROM competitor_changes WHERE competitor_id = ? ORDER BY detected_at DESC').all(competitorId);
  res.json({ changes });
});

// POST /api/competitors/:id/check - simulate a competitive check
router.post('/:id/check', (req, res) => {
  const userId = req.user.id;
  const competitorId = req.params.id;

  // Verify ownership
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ? AND user_id = ?').get(competitorId, userId);
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }

  // Generate 1-3 random changes
  const changeTypes = ['price_change', 'new_product', 'ranking_shift'];
  const numChanges = 1 + Math.floor(Math.random() * 3);
  const newChanges = [];

  const insert = db.prepare(
    'INSERT INTO competitor_changes (competitor_id, change_type, details) VALUES (?, ?, ?)'
  );

  for (let i = 0; i < numChanges; i++) {
    const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
    let details;

    switch (changeType) {
      case 'price_change':
        details = JSON.stringify({
          product: 'Product ' + (Math.floor(Math.random() * 10) + 1),
          old_price: Math.round((20 + Math.random() * 80) * 100) / 100,
          new_price: Math.round((20 + Math.random() * 80) * 100) / 100
        });
        break;
      case 'new_product':
        details = JSON.stringify({
          product_name: 'New Item ' + Math.floor(Math.random() * 100),
          price: Math.round((10 + Math.random() * 90) * 100) / 100,
          category: ['electronics', 'clothing', 'home', 'beauty'][Math.floor(Math.random() * 4)]
        });
        break;
      case 'ranking_shift':
        details = JSON.stringify({
          keyword: ['best deals', 'top products', 'premium quality', 'fast shipping'][Math.floor(Math.random() * 4)],
          old_position: Math.floor(Math.random() * 20) + 5,
          new_position: Math.floor(Math.random() * 10) + 1
        });
        break;
    }

    const result = insert.run(competitorId, changeType, details);
    newChanges.push({
      id: result.lastInsertRowid,
      competitor_id: Number(competitorId),
      change_type: changeType,
      details
    });
  }

  // Update last_checked
  db.prepare('UPDATE competitors SET last_checked = CURRENT_TIMESTAMP WHERE id = ?').run(competitorId);

  res.json({ changes: newChanges });
});

// DELETE /api/competitors/:id - delete competitor
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const competitorId = req.params.id;

  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ? AND user_id = ?').get(competitorId, userId);
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }

  // Delete changes first (cascade may not work with better-sqlite3 without PRAGMA)
  db.prepare('DELETE FROM competitor_changes WHERE competitor_id = ?').run(competitorId);
  db.prepare('DELETE FROM competitors WHERE id = ?').run(competitorId);

  res.json({ success: true });
});

export default router;
