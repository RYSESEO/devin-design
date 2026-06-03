import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/forecasting/orders - bulk add order history
router.post('/orders', (req, res) => {
  const userId = req.user.id;
  const { orders } = req.body;

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: 'orders array is required' });
  }

  const insert = db.prepare(
    'INSERT INTO order_history (user_id, store_id, product_id, product_name, quantity, revenue, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items) => {
    for (const order of items) {
      if (!order.product_name || !order.order_date) continue;
      insert.run(
        userId,
        order.store_id || null,
        order.product_id || null,
        order.product_name,
        order.quantity || 1,
        order.revenue || 0,
        order.order_date
      );
    }
  });

  insertMany(orders);
  res.status(201).json({ success: true, count: orders.length });
});

// GET /api/forecasting/demand - return demand predictions
router.get('/demand', (req, res) => {
  const userId = req.user.id;

  let rows = db.prepare(
    "SELECT order_date, SUM(quantity) as total_quantity, SUM(revenue) as total_revenue FROM order_history WHERE user_id = ? AND order_date >= date('now', '-90 days') GROUP BY order_date ORDER BY order_date"
  ).all(userId);

  // If no real data, generate demo data
  if (rows.length === 0) {
    const demoOrders = generateDemoOrders(userId);
    rows = demoOrders;
  }

  // Calculate linear regression on daily totals
  const n = rows.length;
  if (n === 0) {
    return res.json({ predictions: [], trend: { slope: 0, direction: 'flat' }, seasonality: {} });
  }

  // Convert dates to day indices
  const startDate = new Date(rows[0].order_date);
  const dataPoints = rows.map((row, i) => ({
    x: i,
    quantity: row.total_quantity,
    revenue: row.total_revenue,
    dayOfWeek: new Date(row.order_date).getDay()
  }));

  // Linear regression for quantity
  const { slope, intercept } = linearRegression(dataPoints.map(p => p.x), dataPoints.map(p => p.quantity));

  // Calculate day-of-week seasonality index
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const p of dataPoints) {
    dayTotals[p.dayOfWeek] += p.quantity;
    dayCounts[p.dayOfWeek] += 1;
  }

  const overallAvg = dataPoints.reduce((s, p) => s + p.quantity, 0) / n;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const seasonality = {};
  for (let i = 0; i < 7; i++) {
    const dayAvg = dayCounts[i] > 0 ? dayTotals[i] / dayCounts[i] : overallAvg;
    seasonality[dayNames[i]] = overallAvg > 0 ? Math.round((dayAvg / overallAvg) * 100) / 100 : 1;
  }

  // Revenue regression
  const { slope: revSlope, intercept: revIntercept } = linearRegression(dataPoints.map(p => p.x), dataPoints.map(p => p.revenue));

  // Project next 14 days
  const predictions = [];
  const lastDate = new Date(rows[rows.length - 1].order_date);
  for (let d = 1; d <= 14; d++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + d);
    const x = n - 1 + d;
    const dayOfWeek = futureDate.getDay();
    const seasonFactor = seasonality[dayNames[dayOfWeek]] || 1;

    const trendQty = slope * x + intercept;
    const trendRev = revSlope * x + revIntercept;

    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predicted_quantity: Math.max(0, Math.round(trendQty * seasonFactor)),
      predicted_revenue: Math.max(0, Math.round(trendRev * seasonFactor * 100) / 100)
    });
  }

  const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'flat';

  res.json({
    predictions,
    trend: { slope: Math.round(slope * 100) / 100, direction },
    seasonality
  });
});

// GET /api/forecasting/history - return raw order history (last 90 days)
router.get('/history', (req, res) => {
  const userId = req.user.id;
  const rows = db.prepare(
    "SELECT * FROM order_history WHERE user_id = ? AND order_date >= date('now', '-90 days') ORDER BY order_date DESC"
  ).all(userId);
  res.json({ history: rows });
});

// Helper: linear regression
function linearRegression(xs, ys) {
  const n = xs.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Helper: generate demo order data
function generateDemoOrders(userId) {
  const rows = [];
  const today = new Date();
  for (let d = 89; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dayOfWeek = date.getDay();
    // Weekend boost
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.4 : 1.0;
    // Slight upward trend
    const trendFactor = 1 + (90 - d) * 0.005;
    const baseQty = 8 + Math.floor(Math.random() * 5);
    const quantity = Math.round(baseQty * weekendFactor * trendFactor);
    const revenue = Math.round(quantity * (25 + Math.random() * 10) * 100) / 100;
    rows.push({
      order_date: date.toISOString().split('T')[0],
      total_quantity: quantity,
      total_revenue: revenue
    });
  }
  return rows;
}

export default router;
