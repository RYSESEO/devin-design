import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/churn/customers - add customer activity data
router.post('/customers', (req, res) => {
  const userId = req.user.id;
  const { customers } = req.body;

  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'customers array is required' });
  }

  const insert = db.prepare(
    'INSERT INTO customer_activity (user_id, customer_email, last_purchase_date, purchase_count, total_spent, avg_order_interval_days) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items) => {
    for (const c of items) {
      if (!c.customer_email) continue;
      insert.run(
        userId,
        c.customer_email,
        c.last_purchase_date || null,
        c.purchase_count || 0,
        c.total_spent || 0,
        c.avg_order_interval_days || 0
      );
    }
  });

  insertMany(customers);
  res.status(201).json({ success: true, count: customers.length });
});

// GET /api/churn/predictions - analyze customer churn risk
router.get('/predictions', (req, res) => {
  const userId = req.user.id;

  const customers = db.prepare(
    'SELECT * FROM customer_activity WHERE user_id = ?'
  ).all(userId);

  if (customers.length === 0) {
    return res.json(generateDemoPredictions());
  }

  const today = new Date();
  const predictions = customers.map(c => {
    const lastPurchase = c.last_purchase_date ? new Date(c.last_purchase_date) : null;
    const daysSince = lastPurchase
      ? Math.floor((today - lastPurchase) / (1000 * 60 * 60 * 24))
      : 999;
    const avgInterval = c.avg_order_interval_days || 30;

    let risk;
    if (daysSince > 2 * avgInterval) {
      risk = 'high';
    } else if (daysSince > 1.5 * avgInterval) {
      risk = 'medium';
    } else {
      risk = 'low';
    }

    return {
      customer_email: c.customer_email,
      risk,
      days_since_last_purchase: daysSince,
      avg_interval: avgInterval,
      purchase_count: c.purchase_count,
      total_spent: c.total_spent
    };
  });

  const summary = {
    total: predictions.length,
    high_risk: predictions.filter(p => p.risk === 'high').length,
    medium_risk: predictions.filter(p => p.risk === 'medium').length,
    low_risk: predictions.filter(p => p.risk === 'low').length
  };

  res.json({ predictions, summary });
});

// GET /api/churn/stats - summary stats
router.get('/stats', (req, res) => {
  const userId = req.user.id;

  const customers = db.prepare(
    'SELECT * FROM customer_activity WHERE user_id = ?'
  ).all(userId);

  if (customers.length === 0) {
    return res.json({
      total_customers: 0,
      at_risk_count: 0,
      average_lifetime_value: 0
    });
  }

  const today = new Date();
  let atRisk = 0;
  let totalSpent = 0;

  for (const c of customers) {
    totalSpent += c.total_spent || 0;
    const lastPurchase = c.last_purchase_date ? new Date(c.last_purchase_date) : null;
    const daysSince = lastPurchase
      ? Math.floor((today - lastPurchase) / (1000 * 60 * 60 * 24))
      : 999;
    const avgInterval = c.avg_order_interval_days || 30;
    if (daysSince > 1.5 * avgInterval) {
      atRisk++;
    }
  }

  res.json({
    total_customers: customers.length,
    at_risk_count: atRisk,
    average_lifetime_value: Math.round((totalSpent / customers.length) * 100) / 100
  });
});

// Helper: generate demo predictions
function generateDemoPredictions() {
  const names = [
    'alice@shop.com', 'bob@shop.com', 'carol@shop.com', 'dave@shop.com',
    'eve@shop.com', 'frank@shop.com', 'grace@shop.com', 'henry@shop.com',
    'iris@shop.com', 'jack@shop.com', 'kate@shop.com', 'leo@shop.com',
    'mia@shop.com', 'noah@shop.com', 'olivia@shop.com'
  ];

  const predictions = names.map((email, i) => {
    const avgInterval = 20 + Math.floor(Math.random() * 20);
    let daysSince, risk;
    if (i < 4) {
      daysSince = Math.floor(avgInterval * 2.5);
      risk = 'high';
    } else if (i < 8) {
      daysSince = Math.floor(avgInterval * 1.7);
      risk = 'medium';
    } else {
      daysSince = Math.floor(avgInterval * 0.8);
      risk = 'low';
    }
    return {
      customer_email: email,
      risk,
      days_since_last_purchase: daysSince,
      avg_interval: avgInterval,
      purchase_count: 3 + Math.floor(Math.random() * 15),
      total_spent: Math.round((50 + Math.random() * 500) * 100) / 100
    };
  });

  const summary = {
    total: predictions.length,
    high_risk: predictions.filter(p => p.risk === 'high').length,
    medium_risk: predictions.filter(p => p.risk === 'medium').length,
    low_risk: predictions.filter(p => p.risk === 'low').length
  };

  return { predictions, summary };
}

export default router;
