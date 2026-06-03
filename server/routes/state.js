import { Router } from 'express';
import db from '../db/index.js';
import { encrypt, decrypt } from '../middleware/encryption.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All state routes require authentication
router.use(requireAuth);

// GET /api/state - Returns all user state
router.get('/', (req, res) => {
  const userId = req.user.id;

  const rows = db.prepare('SELECT key, value FROM user_state WHERE user_id = ?').all(userId);

  const state = {};
  for (const row of rows) {
    if (row.key.startsWith('connector_')) {
      // For connector entries, just indicate it's configured (don't send raw secrets)
      const connectorId = row.key.replace('connector_', '');
      if (!state.connectors) state.connectors = {};
      state.connectors[connectorId] = { connected: true };
    } else {
      try {
        state[row.key] = JSON.parse(row.value);
      } catch {
        state[row.key] = row.value;
      }
    }
  }

  res.json(state);
});

// PUT /api/state/layout - Save dashboard layout
router.put('/layout', (req, res) => {
  const userId = req.user.id;
  const { layout } = req.body;

  if (!layout) {
    return res.status(400).json({ error: 'layout is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO user_state (user_id, key, value, updated_at)
    VALUES (?, 'layout', ?, datetime('now'))
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run(userId, JSON.stringify(layout));

  res.json({ success: true });
});

// PUT /api/state/preferences - Save preferences
router.put('/preferences', (req, res) => {
  const userId = req.user.id;
  const prefs = req.body;

  if (!prefs || Object.keys(prefs).length === 0) {
    return res.status(400).json({ error: 'Preferences body is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO user_state (user_id, key, value, updated_at)
    VALUES (?, 'preferences', ?, datetime('now'))
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run(userId, JSON.stringify(prefs));

  res.json({ success: true });
});

// PUT /api/state/connectors - Save connector configuration (encrypted)
router.put('/connectors', (req, res) => {
  const userId = req.user.id;
  const { connectorId, credentials } = req.body;

  if (!connectorId || !credentials) {
    return res.status(400).json({ error: 'connectorId and credentials are required' });
  }

  const encrypted = encrypt(JSON.stringify(credentials));
  const stateKey = `connector_${connectorId}`;

  const stmt = db.prepare(`
    INSERT INTO user_state (user_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run(userId, stateKey, JSON.stringify(encrypted));

  res.json({ success: true });
});

// GET /api/state/chat-history - Return last 100 chat messages
router.get('/chat-history', (req, res) => {
  const userId = req.user.id;

  const messages = db.prepare(
    'SELECT id, role, content, created_at FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 100'
  ).all(userId);

  // Return in chronological order
  res.json(messages.reverse());
});

// POST /api/state/chat-history - Append a chat message
router.post('/chat-history', (req, res) => {
  const userId = req.user.id;
  const { role, content } = req.body;

  if (!role || !content) {
    return res.status(400).json({ error: 'role and content are required' });
  }

  if (!['user', 'assistant'].includes(role)) {
    return res.status(400).json({ error: 'role must be user or assistant' });
  }

  const stmt = db.prepare(
    'INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)'
  );
  const result = stmt.run(userId, role, content);

  res.status(201).json({ id: result.lastInsertRowid, role, content });
});

export default router;
