import crypto from 'crypto';
import db from '../db/index.js';

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const row = db.prepare(
    'SELECT id, user_id, permissions FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL'
  ).get(keyHash);

  if (!row) {
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }

  // Update last_used timestamp
  db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);

  req.apiUser = { id: row.user_id, permissions: JSON.parse(row.permissions) };
  next();
}

export function requirePermission(permission) {
  return function(req, res, next) {
    if (!req.apiUser || !req.apiUser.permissions) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (!req.apiUser.permissions.includes(permission)) {
      return res.status(403).json({ error: `API key lacks '${permission}' permission` });
    }
    next();
  };
}
