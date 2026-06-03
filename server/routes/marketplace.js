import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All marketplace routes require authentication
router.use(requireAuth);

// GET /api/marketplace/plugins - list all plugins with pagination
router.get('/plugins', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const plugins = db.prepare(
    'SELECT * FROM marketplace_plugins ORDER BY install_count DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM marketplace_plugins').get().count;

  res.json({ plugins, total, page, limit });
});

// GET /api/marketplace/plugins/:id - get plugin details
router.get('/plugins/:id', (req, res) => {
  const plugin = db.prepare('SELECT * FROM marketplace_plugins WHERE id = ?').get(req.params.id);
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found' });
  }
  res.json(plugin);
});

// POST /api/marketplace/plugins/:id/install - install plugin for user
router.post('/plugins/:id/install', (req, res) => {
  const plugin = db.prepare('SELECT * FROM marketplace_plugins WHERE id = ?').get(req.params.id);
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found' });
  }

  // Check if already installed
  const existing = db.prepare(
    'SELECT id FROM installed_plugins WHERE user_id = ? AND plugin_id = ?'
  ).get(req.user.id, plugin.id);

  if (existing) {
    return res.status(409).json({ error: 'Plugin already installed' });
  }

  db.prepare(
    'INSERT INTO installed_plugins (user_id, plugin_id) VALUES (?, ?)'
  ).run(req.user.id, plugin.id);

  db.prepare(
    'UPDATE marketplace_plugins SET install_count = install_count + 1 WHERE id = ?'
  ).run(plugin.id);

  res.status(201).json({ message: 'Plugin installed', plugin_id: plugin.id });
});

// DELETE /api/marketplace/plugins/:id/uninstall - uninstall plugin
router.delete('/plugins/:id/uninstall', (req, res) => {
  const installed = db.prepare(
    'SELECT id FROM installed_plugins WHERE user_id = ? AND plugin_id = ?'
  ).get(req.user.id, req.params.id);

  if (!installed) {
    return res.status(404).json({ error: 'Plugin not installed' });
  }

  db.prepare('DELETE FROM installed_plugins WHERE id = ?').run(installed.id);
  db.prepare(
    'UPDATE marketplace_plugins SET install_count = MAX(0, install_count - 1) WHERE id = ?'
  ).run(req.params.id);

  res.json({ message: 'Plugin uninstalled' });
});

// GET /api/marketplace/installed - list user's installed plugins
router.get('/installed', (req, res) => {
  const installed = db.prepare(`
    SELECT ip.id, ip.plugin_id, ip.config, ip.enabled, ip.installed_at,
           mp.name, mp.description, mp.author, mp.version, mp.category, mp.config_schema
    FROM installed_plugins ip
    JOIN marketplace_plugins mp ON ip.plugin_id = mp.id
    WHERE ip.user_id = ?
    ORDER BY ip.installed_at DESC
  `).all(req.user.id);

  res.json({ installed });
});

// PUT /api/marketplace/installed/:id - update plugin config
router.put('/installed/:id', (req, res) => {
  const installed = db.prepare(
    'SELECT * FROM installed_plugins WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!installed) {
    return res.status(404).json({ error: 'Installed plugin not found' });
  }

  const { config, enabled } = req.body;
  const updates = [];
  const params = [];

  if (config !== undefined) {
    updates.push('config = ?');
    params.push(JSON.stringify(config));
  }
  if (enabled !== undefined) {
    updates.push('enabled = ?');
    params.push(enabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE installed_plugins SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM installed_plugins WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
