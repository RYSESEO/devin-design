import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All template routes require authentication
router.use(requireAuth);

// GET /api/templates - list templates with optional category filter
router.get('/', (req, res) => {
  const { category } = req.query;

  let templates;
  if (category) {
    templates = db.prepare(
      'SELECT * FROM dashboard_templates WHERE category = ? ORDER BY install_count DESC'
    ).all(category);
  } else {
    templates = db.prepare(
      'SELECT * FROM dashboard_templates ORDER BY install_count DESC'
    ).all();
  }

  res.json({ templates });
});

// GET /api/templates/:id - get template with full layout_json
router.get('/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM dashboard_templates WHERE id = ?').get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// POST /api/templates/:id/apply - apply template to user's layout
router.post('/:id/apply', (req, res) => {
  const template = db.prepare('SELECT * FROM dashboard_templates WHERE id = ?').get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Save layout_json to user's state
  db.prepare(`
    INSERT INTO user_state (user_id, key, value, updated_at)
    VALUES (?, 'layout', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, template.layout_json);

  // Increment install_count
  db.prepare('UPDATE dashboard_templates SET install_count = install_count + 1 WHERE id = ?').run(template.id);

  res.json({ message: 'Template applied', layout: JSON.parse(template.layout_json) });
});

// POST /api/templates - create custom template
router.post('/', (req, res) => {
  const { name, description, layout_json } = req.body;

  if (!name || !layout_json) {
    return res.status(400).json({ error: 'name and layout_json are required' });
  }

  const layoutStr = typeof layout_json === 'string' ? layout_json : JSON.stringify(layout_json);

  const result = db.prepare(`
    INSERT INTO dashboard_templates (name, description, category, layout_json, is_custom, user_id)
    VALUES (?, ?, 'custom', ?, 1, ?)
  `).run(name, description || null, layoutStr, req.user.id);

  const template = db.prepare('SELECT * FROM dashboard_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

export default router;
