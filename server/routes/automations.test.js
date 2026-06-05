import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';

let testPort;
let testServer;
let baseUrl;
let authToken;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });

  // Register a test user and get a token
  const email = `auto-test-${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123', name: 'Auto Test' })
  });
  const data = await res.json();
  authToken = data.token;
});

afterAll(() => {
  if (testServer) testServer.close();
  server.close();
});

function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

function put(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
}

function del(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
}

describe('Automations Routes', () => {
  describe('Authentication', () => {
    it('returns 401 without token on all endpoints', async () => {
      const endpoints = [
        '/api/automations/workflows',
        '/api/automations/templates',
        '/api/automations/leads',
        '/api/automations/notifications'
      ];

      for (const endpoint of endpoints) {
        const res = await get(endpoint, null);
        expect(res.status).toBe(401);
      }
    });

    it('returns 401 with invalid token', async () => {
      const res = await get('/api/automations/workflows', 'invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('Workflows CRUD', () => {
    let workflowId;

    it('POST /api/automations/workflows - creates a workflow', async () => {
      const res = await post('/api/automations/workflows', {
        name: 'Test Workflow',
        trigger_type: 'revenue_drop',
        trigger_config: { threshold: 10 },
        conditions: [{ field: 'revenue', operator: 'below', value: 1000 }],
        actions: [{ type: 'notify', config: { channel: 'slack' } }]
      }, authToken);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.workflow).toBeDefined();
      expect(data.workflow.name).toBe('Test Workflow');
      expect(data.workflow.trigger_type).toBe('revenue_drop');
      expect(data.workflow.trigger_config).toEqual({ threshold: 10 });
      expect(data.workflow.conditions).toEqual([{ field: 'revenue', operator: 'below', value: 1000 }]);
      expect(data.workflow.actions).toEqual([{ type: 'notify', config: { channel: 'slack' } }]);
      expect(data.workflow.enabled).toBe(1);
      workflowId = data.workflow.id;
    });

    it('POST /api/automations/workflows - requires name and trigger_type', async () => {
      const res = await post('/api/automations/workflows', {}, authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/name and trigger_type/);
    });

    it('GET /api/automations/workflows - lists workflows', async () => {
      const res = await get('/api/automations/workflows', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.workflows).toBeDefined();
      expect(Array.isArray(data.workflows)).toBe(true);
      expect(data.workflows.length).toBeGreaterThan(0);
      expect(data.workflows[0].name).toBe('Test Workflow');
    });

    it('PUT /api/automations/workflows/:id - updates a workflow', async () => {
      const res = await put(`/api/automations/workflows/${workflowId}`, {
        name: 'Updated Workflow',
        enabled: false
      }, authToken);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.workflow.name).toBe('Updated Workflow');
      expect(data.workflow.enabled).toBe(0);
    });

    it('PUT /api/automations/workflows/:id - returns 404 for non-existent', async () => {
      const res = await put('/api/automations/workflows/99999', {
        name: 'Does not exist'
      }, authToken);
      expect(res.status).toBe(404);
    });

    it('PUT /api/automations/workflows/:id - returns 400 with no fields', async () => {
      const res = await put(`/api/automations/workflows/${workflowId}`, {}, authToken);
      expect(res.status).toBe(400);
    });

    it('DELETE /api/automations/workflows/:id - soft deletes a workflow', async () => {
      const res = await del(`/api/automations/workflows/${workflowId}`, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify it no longer appears in list
      const listRes = await get('/api/automations/workflows', authToken);
      const listData = await listRes.json();
      const found = listData.workflows.find(w => w.id === workflowId);
      expect(found).toBeUndefined();
    });

    it('DELETE /api/automations/workflows/:id - returns 404 for already deleted', async () => {
      const res = await del(`/api/automations/workflows/${workflowId}`, authToken);
      expect(res.status).toBe(404);
    });
  });

  describe('Templates', () => {
    it('GET /api/automations/templates - returns 5 pre-built templates', async () => {
      const res = await get('/api/automations/templates', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.templates).toBeDefined();
      expect(data.templates.length).toBe(5);

      const names = data.templates.map(t => t.name);
      expect(names).toContain('Auto-discount slow movers');
      expect(names).toContain('Auto-tag high-value customers');
      expect(names).toContain('Abandoned cart followup');
      expect(names).toContain('Inventory reorder alert');
      expect(names).toContain('Revenue milestone celebration');
    });

    it('GET /api/automations/templates - templates have correct structure', async () => {
      const res = await get('/api/automations/templates', authToken);
      const data = await res.json();
      const template = data.templates[0];

      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.trigger_type).toBeDefined();
      expect(template.trigger_config).toBeDefined();
      expect(template.conditions).toBeDefined();
      expect(template.actions).toBeDefined();
      expect(Array.isArray(template.conditions)).toBe(true);
      expect(Array.isArray(template.actions)).toBe(true);
    });

    it('POST /api/automations/templates/:id/activate - creates workflow from template', async () => {
      // Get the first template
      const templatesRes = await get('/api/automations/templates', authToken);
      const templatesData = await templatesRes.json();
      const templateId = templatesData.templates[0].id;

      const res = await post(`/api/automations/templates/${templateId}/activate`, {}, authToken);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.workflow).toBeDefined();
      expect(data.workflow.name).toBe(templatesData.templates[0].name);
      expect(data.workflow.trigger_type).toBe(templatesData.templates[0].trigger_type);
    });

    it('POST /api/automations/templates/:id/activate - returns 404 for non-existent template', async () => {
      const res = await post('/api/automations/templates/99999/activate', {}, authToken);
      expect(res.status).toBe(404);
    });
  });

  describe('Leads', () => {
    let leadId;

    it('POST /api/automations/leads - creates a lead with calculated score', async () => {
      const res = await post('/api/automations/leads', {
        email: 'lead@example.com',
        name: 'Test Lead',
        source: 'website',
        page_visits: 10,
        email_opens: 5,
        purchases: 3,
        days_since_last_activity: 2
      }, authToken);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.lead).toBeDefined();
      expect(data.lead.email).toBe('lead@example.com');
      // Score = 10*2 + 5*5 + 3*20 + 2*(-1) = 20 + 25 + 60 - 2 = 103
      expect(data.lead.score).toBe(103);
      expect(data.lead.priority).toBe('hot');
      leadId = data.lead.id;
    });

    it('POST /api/automations/leads - requires email', async () => {
      const res = await post('/api/automations/leads', { name: 'No Email' }, authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/email/);
    });

    it('POST /api/automations/leads - cold lead with low engagement', async () => {
      const res = await post('/api/automations/leads', {
        email: 'cold@example.com',
        page_visits: 2,
        email_opens: 1,
        purchases: 0,
        days_since_last_activity: 30
      }, authToken);

      expect(res.status).toBe(201);
      const data = await res.json();
      // Score = 2*2 + 1*5 + 0*20 + 30*(-1) = 4 + 5 + 0 - 30 = -21, clamped to 0
      expect(data.lead.score).toBe(0);
      expect(data.lead.priority).toBe('cold');
    });

    it('POST /api/automations/leads - warm lead with moderate engagement', async () => {
      const res = await post('/api/automations/leads', {
        email: 'warm@example.com',
        page_visits: 15,
        email_opens: 3,
        purchases: 1,
        days_since_last_activity: 5
      }, authToken);

      expect(res.status).toBe(201);
      const data = await res.json();
      // Score = 15*2 + 3*5 + 1*20 + 5*(-1) = 30 + 15 + 20 - 5 = 60
      expect(data.lead.score).toBe(60);
      expect(data.lead.priority).toBe('warm');
    });

    it('GET /api/automations/leads - returns leads sorted by score', async () => {
      const res = await get('/api/automations/leads', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.leads).toBeDefined();
      expect(data.leads.length).toBeGreaterThanOrEqual(3);

      // Verify sorted by score descending
      for (let i = 1; i < data.leads.length; i++) {
        expect(data.leads[i - 1].score).toBeGreaterThanOrEqual(data.leads[i].score);
      }
    });

    it('PUT /api/automations/leads/:id - updates lead and recalculates score', async () => {
      const res = await put(`/api/automations/leads/${leadId}`, {
        purchases: 0,
        page_visits: 5,
        days_since_last_activity: 10
      }, authToken);

      expect(res.status).toBe(200);
      const data = await res.json();
      // Score = 5*2 + 5*5 + 0*20 + 10*(-1) = 10 + 25 + 0 - 10 = 25
      expect(data.lead.score).toBe(25);
      expect(data.lead.priority).toBe('cold');
    });

    it('PUT /api/automations/leads/:id - returns 404 for non-existent lead', async () => {
      const res = await put('/api/automations/leads/99999', { name: 'Nope' }, authToken);
      expect(res.status).toBe(404);
    });
  });

  describe('Notification Channels', () => {
    let channelId;

    it('POST /api/automations/notifications - creates a slack channel', async () => {
      const res = await post('/api/automations/notifications', {
        channel_type: 'slack',
        config: { webhook_url: 'https://hooks.slack.com/test' }
      }, authToken);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.channel).toBeDefined();
      expect(data.channel.channel_type).toBe('slack');
      expect(data.channel.config).toEqual({ webhook_url: 'https://hooks.slack.com/test' });
      expect(data.channel.enabled).toBe(1);
      channelId = data.channel.id;
    });

    it('POST /api/automations/notifications - requires channel_type', async () => {
      const res = await post('/api/automations/notifications', { config: {} }, authToken);
      expect(res.status).toBe(400);
    });

    it('POST /api/automations/notifications - validates channel_type', async () => {
      const res = await post('/api/automations/notifications', {
        channel_type: 'invalid',
        config: {}
      }, authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/slack, discord, or email/);
    });

    it('POST /api/automations/notifications - requires config', async () => {
      const res = await post('/api/automations/notifications', {
        channel_type: 'slack'
      }, authToken);
      expect(res.status).toBe(400);
    });

    it('GET /api/automations/notifications - lists channels', async () => {
      const res = await get('/api/automations/notifications', authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.channels).toBeDefined();
      expect(data.channels.length).toBeGreaterThan(0);
    });

    it('PUT /api/automations/notifications/:id - disables a channel', async () => {
      const res = await put(`/api/automations/notifications/${channelId}`, {
        enabled: false
      }, authToken);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.channel.enabled).toBe(0);
    });

    it('PUT /api/automations/notifications/:id - returns 404 for non-existent', async () => {
      const res = await put('/api/automations/notifications/99999', { enabled: false }, authToken);
      expect(res.status).toBe(404);
    });

    it('PUT /api/automations/notifications/:id - returns 400 with no fields', async () => {
      const res = await put(`/api/automations/notifications/${channelId}`, {}, authToken);
      expect(res.status).toBe(400);
    });

    it('POST /api/automations/notifications/test - tests email channel', async () => {
      // Create an email channel
      const createRes = await post('/api/automations/notifications', {
        channel_type: 'email',
        config: { email: 'test@example.com' }
      }, authToken);
      const createData = await createRes.json();
      const emailChannelId = createData.channel.id;

      const res = await post('/api/automations/notifications/test', {
        channel_id: emailChannelId
      }, authToken);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.channel_type).toBe('email');
    });

    it('POST /api/automations/notifications/test - requires channel_id', async () => {
      const res = await post('/api/automations/notifications/test', {}, authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/channel_id/);
    });

    it('POST /api/automations/notifications/test - returns 404 for non-existent channel', async () => {
      const res = await post('/api/automations/notifications/test', { channel_id: 99999 }, authToken);
      expect(res.status).toBe(404);
    });

    it('POST /api/automations/notifications/test - handles webhook failure gracefully', async () => {
      // Create a channel with a webhook URL that will fail (unresolvable host)
      const createRes = await post('/api/automations/notifications', {
        channel_type: 'discord',
        config: { webhook_url: 'http://this-host-does-not-exist-xyz.invalid/webhook' }
      }, authToken);
      const createData = await createRes.json();
      const failChannelId = createData.channel.id;

      const res = await post('/api/automations/notifications/test', {
        channel_id: failChannelId
      }, authToken);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.channel_type).toBe('discord');
    });
  });

  describe('Execute Workflow', () => {
    let execWorkflowId;

    beforeAll(async () => {
      // Create a workflow for execution tests
      const res = await post('/api/automations/workflows', {
        name: 'Exec Test Workflow',
        trigger_type: 'scheduled',
        conditions: [{ field: 'time', operator: 'equals', value: '09:00' }],
        actions: [{ type: 'notify', config: { channel: 'slack' } }]
      }, authToken);
      const data = await res.json();
      execWorkflowId = data.workflow.id;
    });

    it('POST /api/automations/execute/:id - executes a workflow', async () => {
      const res = await post(`/api/automations/execute/${execWorkflowId}`, {}, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result).toBeDefined();
      expect(data.result.status).toBe('completed');
      expect(data.result.workflow_name).toBe('Exec Test Workflow');
      expect(data.result.conditions_evaluated).toBe(1);
      expect(data.result.actions_executed).toBe(1);
    });

    it('POST /api/automations/execute/:id - increments run_count', async () => {
      // Execute again
      await post(`/api/automations/execute/${execWorkflowId}`, {}, authToken);

      // Check the workflow
      const listRes = await get('/api/automations/workflows', authToken);
      const listData = await listRes.json();
      const workflow = listData.workflows.find(w => w.id === execWorkflowId);
      expect(workflow.run_count).toBe(2);
      expect(workflow.last_run).toBeDefined();
    });

    it('POST /api/automations/execute/:id - returns 404 for non-existent workflow', async () => {
      const res = await post('/api/automations/execute/99999', {}, authToken);
      expect(res.status).toBe(404);
    });

    it('POST /api/automations/execute/:id - returns 400 for disabled workflow', async () => {
      // Disable the workflow
      await put(`/api/automations/workflows/${execWorkflowId}`, { enabled: false }, authToken);

      const res = await post(`/api/automations/execute/${execWorkflowId}`, {}, authToken);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/disabled/);
    });
  });

  describe('POST /api/automations/workflows/:id/preview', () => {
    it('returns preview for an existing workflow', async () => {
      const createRes = await post('/api/automations/workflows', {
        name: 'Preview Test',
        trigger_type: 'revenue_drop',
        conditions: [{ field: 'revenue', operator: '<', value: '1000' }],
        actions: [{ type: 'notify', config: { channel: '#sales' } }, { type: 'send_email', config: { to: 'team@example.com' } }]
      }, authToken);
      const { workflow } = await createRes.json();

      const res = await post(`/api/automations/workflows/${workflow.id}/preview`, {}, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.preview).toBeDefined();
      expect(data.preview.workflow_name).toBe('Preview Test');
      expect(data.preview.actions).toHaveLength(2);
      expect(data.preview.actions[0].preview_text).toContain('Would');
      expect(data.preview.summary).toContain('2 action(s)');
    });

    it('returns 404 for non-existent workflow', async () => {
      const res = await post('/api/automations/workflows/99999/preview', {}, authToken);
      expect(res.status).toBe(404);
    });

    it('works even for disabled workflows', async () => {
      const createRes = await post('/api/automations/workflows', {
        name: 'Disabled Preview',
        trigger_type: 'new_order',
        conditions: [],
        actions: [{ type: 'create_discount', config: {} }]
      }, authToken);
      const { workflow } = await createRes.json();

      // Disable it
      await put(`/api/automations/workflows/${workflow.id}`, { enabled: false }, authToken);

      // Preview should still work
      const res = await post(`/api/automations/workflows/${workflow.id}/preview`, {}, authToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.preview.actions).toHaveLength(1);
    });
  });
});
