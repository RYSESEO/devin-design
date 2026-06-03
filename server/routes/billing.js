import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All billing routes require authentication
router.use(requireAuth);

// GET /api/billing/subscription - get current subscription
router.get('/subscription', (req, res) => {
  const subscription = db.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.user.id);

  if (!subscription) {
    return res.json({ plan: 'free', status: 'active' });
  }

  res.json(subscription);
});

// POST /api/billing/subscribe - create subscription
router.post('/subscribe', (req, res) => {
  const { plan, stripe_customer_id, stripe_subscription_id } = req.body;

  if (!plan) {
    return res.status(400).json({ error: 'plan is required' });
  }

  // Check if user already has an active subscription
  const existing = db.prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'"
  ).get(req.user.id);

  if (existing) {
    return res.status(409).json({ error: 'Active subscription already exists' });
  }

  const result = db.prepare(
    'INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, stripe_customer_id || null, stripe_subscription_id || null, plan, 'active');

  const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(subscription);
});

// PUT /api/billing/subscription - update plan
router.put('/subscription', (req, res) => {
  const { plan } = req.body;

  if (!plan) {
    return res.status(400).json({ error: 'plan is required' });
  }

  const existing = db.prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'"
  ).get(req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'No active subscription found' });
  }

  db.prepare('UPDATE subscriptions SET plan = ? WHERE id = ?').run(plan, existing.id);

  const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(existing.id);
  res.json(subscription);
});

// DELETE /api/billing/subscription - cancel subscription
router.delete('/subscription', (req, res) => {
  const existing = db.prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'"
  ).get(req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'No active subscription found' });
  }

  db.prepare("UPDATE subscriptions SET status = 'canceled' WHERE id = ?").run(existing.id);

  res.json({ message: 'Subscription canceled' });
});

export default router;
