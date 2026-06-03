import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All workspace routes require authentication
router.use(requireAuth);

// GET /api/workspaces - list user's workspaces (owned or member of)
router.get('/', (req, res) => {
  const workspaces = db.prepare(`
    SELECT DISTINCT w.id, w.name, w.owner_id, w.created_at, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json(workspaces);
});

// POST /api/workspaces - create workspace
router.post('/', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = db.prepare(
    'INSERT INTO workspaces (name, owner_id) VALUES (?, ?)'
  ).run(name, req.user.id);

  const workspaceId = result.lastInsertRowid;

  // Auto-add creator as owner member
  db.prepare(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
  ).run(workspaceId, req.user.id, 'owner');

  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
  res.status(201).json(workspace);
});

// GET /api/workspaces/:id/members - list members (requires membership)
router.get('/:id/members', (req, res) => {
  const workspaceId = req.params.id;

  // Check membership
  const membership = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const members = db.prepare(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.created_at, u.email, u.display_name
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ?
  `).all(workspaceId);

  res.json(members);
});

// POST /api/workspaces/:id/members - add member (requires owner/admin role)
router.post('/:id/members', (req, res) => {
  const workspaceId = req.params.id;
  const { user_id, role } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Check requester has owner/admin role
  const membership = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, req.user.id);

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only owner or admin can add members' });
  }

  const memberRole = role || 'viewer';

  try {
    db.prepare(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
    ).run(workspaceId, user_id, memberRole);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'User is already a member' });
    }
    throw err;
  }

  const member = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, user_id);

  res.status(201).json(member);
});

// PUT /api/workspaces/:id/members/:userId - update role (requires owner role)
router.put('/:id/members/:userId', (req, res) => {
  const workspaceId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'role is required' });
  }

  // Check requester has owner role
  const membership = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, req.user.id);

  if (!membership || membership.role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can update roles' });
  }

  const target = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, targetUserId);

  if (!target) {
    return res.status(404).json({ error: 'Member not found' });
  }

  db.prepare(
    'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
  ).run(role, workspaceId, targetUserId);

  res.json({ message: 'Role updated', user_id: Number(targetUserId), role });
});

// DELETE /api/workspaces/:id/members/:userId - remove member (requires owner/admin role)
router.delete('/:id/members/:userId', (req, res) => {
  const workspaceId = req.params.id;
  const targetUserId = req.params.userId;

  // Check requester has owner/admin role
  const membership = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, req.user.id);

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only owner or admin can remove members' });
  }

  const target = db.prepare(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, targetUserId);

  if (!target) {
    return res.status(404).json({ error: 'Member not found' });
  }

  db.prepare(
    'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).run(workspaceId, targetUserId);

  res.json({ message: 'Member removed' });
});

export default router;
