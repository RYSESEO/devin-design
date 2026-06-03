import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All automation routes require authentication
router.use(requireAuth);

// --- Helper: calculate lead score ---
function calculateLeadScore(lead) {
  const pageVisits = lead.page_visits || 0;
  const emailOpens = lead.email_opens || 0;
  const purchases = lead.purchases || 0;
  const daysSinceLastActivity = lead.days_since_last_activity || 0;

  return pageVisits * 2 + emailOpens * 5 + purchases * 20 + daysSinceLastActivity * -1;
}

// --- Helper: determine priority from score ---
function getPriority(score) {
  if (score > 80) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// ==================== WORKFLOWS ====================

// GET /api/automations/workflows
router.get('/workflows', (req, res) => {
  const userId = req.user.id;
  const workflows = db.prepare(
    'SELECT id, name, trigger_type, trigger_config, conditions, actions, enabled, last_run, run_count, created_at FROM automations WHERE user_id = ? AND deleted = 0 ORDER BY created_at DESC'
  ).all(userId);

  const parsed = workflows.map(w => ({
    ...w,
    trigger_config: JSON.parse(w.trigger_config || '{}'),
    conditions: JSON.parse(w.conditions || '[]'),
    actions: JSON.parse(w.actions || '[]')
  }));

  res.json({ workflows: parsed });
});

// POST /api/automations/workflows
router.post('/workflows', (req, res) => {
  const userId = req.user.id;
  const { name, trigger_type, trigger_config, conditions, actions } = req.body;

  if (!name || !trigger_type) {
    return res.status(400).json({ error: 'name and trigger_type are required' });
  }

  const stmt = db.prepare(
    'INSERT INTO automations (user_id, name, trigger_type, trigger_config, conditions, actions) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    userId,
    name,
    trigger_type,
    JSON.stringify(trigger_config || {}),
    JSON.stringify(conditions || []),
    JSON.stringify(actions || [])
  );

  const workflow = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    workflow: {
      ...workflow,
      trigger_config: JSON.parse(workflow.trigger_config || '{}'),
      conditions: JSON.parse(workflow.conditions || '[]'),
      actions: JSON.parse(workflow.actions || '[]')
    }
  });
});

// PUT /api/automations/workflows/:id
router.put('/workflows/:id', (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM automations WHERE id = ? AND user_id = ? AND deleted = 0'
  ).get(workflowId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const { name, trigger_type, trigger_config, conditions, actions, enabled } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (trigger_type !== undefined) { updates.push('trigger_type = ?'); params.push(trigger_type); }
  if (trigger_config !== undefined) { updates.push('trigger_config = ?'); params.push(JSON.stringify(trigger_config)); }
  if (conditions !== undefined) { updates.push('conditions = ?'); params.push(JSON.stringify(conditions)); }
  if (actions !== undefined) { updates.push('actions = ?'); params.push(JSON.stringify(actions)); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(workflowId, userId);
  db.prepare(`UPDATE automations SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM automations WHERE id = ?').get(workflowId);

  res.json({
    workflow: {
      ...updated,
      trigger_config: JSON.parse(updated.trigger_config || '{}'),
      conditions: JSON.parse(updated.conditions || '[]'),
      actions: JSON.parse(updated.actions || '[]')
    }
  });
});

// DELETE /api/automations/workflows/:id (soft delete)
router.delete('/workflows/:id', (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM automations WHERE id = ? AND user_id = ? AND deleted = 0'
  ).get(workflowId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  db.prepare('UPDATE automations SET deleted = 1 WHERE id = ? AND user_id = ?').run(workflowId, userId);

  res.json({ success: true, message: 'Workflow deleted' });
});

// ==================== TEMPLATES ====================

// GET /api/automations/templates
router.get('/templates', (req, res) => {
  const templates = db.prepare(
    'SELECT id, name, description, category, trigger_type, trigger_config, conditions, actions, created_at FROM automation_templates ORDER BY id'
  ).all();

  const parsed = templates.map(t => ({
    ...t,
    trigger_config: JSON.parse(t.trigger_config || '{}'),
    conditions: JSON.parse(t.conditions || '[]'),
    actions: JSON.parse(t.actions || '[]')
  }));

  res.json({ templates: parsed });
});

// POST /api/automations/templates/:id/activate
router.post('/templates/:id/activate', (req, res) => {
  const userId = req.user.id;
  const templateId = req.params.id;

  const template = db.prepare('SELECT * FROM automation_templates WHERE id = ?').get(templateId);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const stmt = db.prepare(
    'INSERT INTO automations (user_id, name, trigger_type, trigger_config, conditions, actions) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    userId,
    template.name,
    template.trigger_type,
    template.trigger_config,
    template.conditions,
    template.actions
  );

  const workflow = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    workflow: {
      ...workflow,
      trigger_config: JSON.parse(workflow.trigger_config || '{}'),
      conditions: JSON.parse(workflow.conditions || '[]'),
      actions: JSON.parse(workflow.actions || '[]')
    }
  });
});

// ==================== LEADS ====================

// GET /api/automations/leads
router.get('/leads', (req, res) => {
  const userId = req.user.id;
  const leads = db.prepare(
    'SELECT id, email, name, score, source, page_visits, email_opens, purchases, days_since_last_activity, behavior_data, priority, created_at, updated_at FROM leads WHERE user_id = ? ORDER BY score DESC'
  ).all(userId);

  const parsed = leads.map(l => ({
    ...l,
    behavior_data: JSON.parse(l.behavior_data || '{}')
  }));

  res.json({ leads: parsed });
});

// POST /api/automations/leads
router.post('/leads', (req, res) => {
  const userId = req.user.id;
  const { email, name, source, page_visits, email_opens, purchases, days_since_last_activity, behavior_data } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const leadData = {
    page_visits: page_visits || 0,
    email_opens: email_opens || 0,
    purchases: purchases || 0,
    days_since_last_activity: days_since_last_activity || 0
  };

  const score = calculateLeadScore(leadData);
  const priority = getPriority(score);

  const stmt = db.prepare(
    'INSERT INTO leads (user_id, email, name, score, source, page_visits, email_opens, purchases, days_since_last_activity, behavior_data, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    userId,
    email,
    name || null,
    score,
    source || null,
    leadData.page_visits,
    leadData.email_opens,
    leadData.purchases,
    leadData.days_since_last_activity,
    JSON.stringify(behavior_data || {}),
    priority
  );

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    lead: {
      ...lead,
      behavior_data: JSON.parse(lead.behavior_data || '{}')
    }
  });
});

// PUT /api/automations/leads/:id
router.put('/leads/:id', (req, res) => {
  const userId = req.user.id;
  const leadId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM leads WHERE id = ? AND user_id = ?'
  ).get(leadId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const { name, source, page_visits, email_opens, purchases, days_since_last_activity, behavior_data } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (source !== undefined) { updates.push('source = ?'); params.push(source); }
  if (page_visits !== undefined) { updates.push('page_visits = ?'); params.push(page_visits); }
  if (email_opens !== undefined) { updates.push('email_opens = ?'); params.push(email_opens); }
  if (purchases !== undefined) { updates.push('purchases = ?'); params.push(purchases); }
  if (days_since_last_activity !== undefined) { updates.push('days_since_last_activity = ?'); params.push(days_since_last_activity); }
  if (behavior_data !== undefined) { updates.push('behavior_data = ?'); params.push(JSON.stringify(behavior_data)); }

  // Recalculate score based on updated fields
  const updatedData = {
    page_visits: page_visits !== undefined ? page_visits : existing.page_visits,
    email_opens: email_opens !== undefined ? email_opens : existing.email_opens,
    purchases: purchases !== undefined ? purchases : existing.purchases,
    days_since_last_activity: days_since_last_activity !== undefined ? days_since_last_activity : existing.days_since_last_activity
  };

  const score = calculateLeadScore(updatedData);
  const priority = getPriority(score);

  updates.push('score = ?'); params.push(score);
  updates.push('priority = ?'); params.push(priority);
  updates.push("updated_at = datetime('now')");

  params.push(leadId, userId);
  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);

  res.json({
    lead: {
      ...updated,
      behavior_data: JSON.parse(updated.behavior_data || '{}')
    }
  });
});

// ==================== NOTIFICATIONS ====================

// GET /api/automations/notifications
router.get('/notifications', (req, res) => {
  const userId = req.user.id;
  const channels = db.prepare(
    'SELECT id, channel_type, config, enabled, created_at FROM notification_channels WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);

  const parsed = channels.map(c => ({
    ...c,
    config: JSON.parse(c.config || '{}')
  }));

  res.json({ channels: parsed });
});

// POST /api/automations/notifications
router.post('/notifications', (req, res) => {
  const userId = req.user.id;
  const { channel_type, config } = req.body;

  if (!channel_type) {
    return res.status(400).json({ error: 'channel_type is required' });
  }

  if (!['slack', 'discord', 'email'].includes(channel_type)) {
    return res.status(400).json({ error: 'channel_type must be slack, discord, or email' });
  }

  if (!config) {
    return res.status(400).json({ error: 'config is required' });
  }

  const stmt = db.prepare(
    'INSERT INTO notification_channels (user_id, channel_type, config) VALUES (?, ?, ?)'
  );
  const result = stmt.run(userId, channel_type, JSON.stringify(config));

  const channel = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    channel: {
      ...channel,
      config: JSON.parse(channel.config || '{}')
    }
  });
});

// PUT /api/automations/notifications/:id
router.put('/notifications/:id', (req, res) => {
  const userId = req.user.id;
  const channelId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM notification_channels WHERE id = ? AND user_id = ?'
  ).get(channelId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Notification channel not found' });
  }

  const { enabled, config } = req.body;

  const updates = [];
  const params = [];

  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (config !== undefined) { updates.push('config = ?'); params.push(JSON.stringify(config)); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(channelId, userId);
  db.prepare(`UPDATE notification_channels SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(channelId);

  res.json({
    channel: {
      ...updated,
      config: JSON.parse(updated.config || '{}')
    }
  });
});

// POST /api/automations/notifications/test
router.post('/notifications/test', async (req, res) => {
  const userId = req.user.id;
  const { channel_id } = req.body;

  if (!channel_id) {
    return res.status(400).json({ error: 'channel_id is required' });
  }

  const channel = db.prepare(
    'SELECT * FROM notification_channels WHERE id = ? AND user_id = ?'
  ).get(channel_id, userId);

  if (!channel) {
    return res.status(404).json({ error: 'Notification channel not found' });
  }

  const config = JSON.parse(channel.config || '{}');
  const testPayload = {
    text: 'Test notification from Workflow Automation Hub',
    timestamp: new Date().toISOString()
  };

  if (channel.channel_type === 'email') {
    // For email, just log and return success
    return res.json({ success: true, message: 'Test email notification logged', channel_type: 'email' });
  }

  // For slack/discord, attempt HTTP POST to webhook URL
  const webhookUrl = config.webhook_url;
  if (!webhookUrl) {
    return res.status(400).json({ error: 'No webhook_url configured for this channel' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      return res.json({ success: true, message: 'Test notification sent successfully', channel_type: channel.channel_type });
    } else {
      return res.json({ success: false, message: `Webhook returned status ${response.status}`, channel_type: channel.channel_type });
    }
  } catch (err) {
    return res.json({ success: false, message: `Failed to send: ${err.message}`, channel_type: channel.channel_type });
  }
});

// ==================== EXECUTE WORKFLOW ====================

// POST /api/automations/execute/:id
router.post('/execute/:id', (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  const workflow = db.prepare(
    'SELECT * FROM automations WHERE id = ? AND user_id = ? AND deleted = 0'
  ).get(workflowId, userId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  if (!workflow.enabled) {
    return res.status(400).json({ error: 'Workflow is disabled' });
  }

  const actions = JSON.parse(workflow.actions || '[]');
  const conditions = JSON.parse(workflow.conditions || '[]');

  // Simulate execution
  const executionResult = {
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    trigger_type: workflow.trigger_type,
    conditions_evaluated: conditions.length,
    actions_executed: actions.length,
    status: 'completed',
    executed_at: new Date().toISOString()
  };

  // Update run count and last_run
  db.prepare(
    "UPDATE automations SET run_count = run_count + 1, last_run = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(workflowId, userId);

  res.json({ result: executionResult });
});

export default router;
