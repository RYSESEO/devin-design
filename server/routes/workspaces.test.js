import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, server } from '../index.js';

let testPort;
let testServer;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      testPort = testServer.address().port;
      baseUrl = `http://localhost:${testPort}`;
      resolve();
    });
  });
});

afterAll(() => {
  if (testServer) testServer.close();
  server.close();
});

function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
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

describe('Workspaces Routes', () => {
  const ownerEmail = `ws-owner-${Date.now()}@example.com`;
  const memberEmail = `ws-member-${Date.now()}@example.com`;
  const viewerEmail = `ws-viewer-${Date.now()}@example.com`;
  const testPassword = 'securepass123';
  let ownerToken = null;
  let memberToken = null;
  let viewerToken = null;
  let ownerId = null;
  let memberId = null;
  let viewerId = null;
  let workspaceId = null;

  beforeAll(async () => {
    // Register owner
    const ownerRes = await post('/api/auth/register', {
      email: ownerEmail,
      password: testPassword,
      name: 'Workspace Owner'
    });
    const ownerData = await ownerRes.json();
    ownerToken = ownerData.token;
    ownerId = ownerData.user.id;

    // Register member
    const memberRes = await post('/api/auth/register', {
      email: memberEmail,
      password: testPassword,
      name: 'Workspace Member'
    });
    const memberData = await memberRes.json();
    memberToken = memberData.token;
    memberId = memberData.user.id;

    // Register viewer
    const viewerRes = await post('/api/auth/register', {
      email: viewerEmail,
      password: testPassword,
      name: 'Workspace Viewer'
    });
    const viewerData = await viewerRes.json();
    viewerToken = viewerData.token;
    viewerId = viewerData.user.id;
  });

  it('creates a workspace', async () => {
    const res = await post('/api/workspaces', { name: 'Test Workspace' }, ownerToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Test Workspace');
    expect(data.owner_id).toBe(ownerId);
    workspaceId = data.id;
  });

  it('fails to create workspace without name', async () => {
    const res = await post('/api/workspaces', {}, ownerToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it('lists workspaces for owner', async () => {
    const res = await get('/api/workspaces', ownerToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].role).toBe('owner');
  });

  it('adds a member with admin role', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/members`, {
      user_id: memberId,
      role: 'admin'
    }, ownerToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.role).toBe('admin');
    expect(data.user_id).toBe(memberId);
  });

  it('adds a viewer member', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/members`, {
      user_id: viewerId,
      role: 'viewer'
    }, ownerToken);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.role).toBe('viewer');
  });

  it('lists members (requires membership)', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/members`, ownerToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(3); // owner, admin, viewer
  });

  it('viewer cannot add members', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/members`, {
      user_id: 99999,
      role: 'viewer'
    }, viewerToken);
    expect(res.status).toBe(403);
  });

  it('owner updates member role', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/members/${viewerId}`, {
      role: 'admin'
    }, ownerToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.role).toBe('admin');
  });

  it('non-owner cannot update roles', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/members/${viewerId}`, {
      role: 'viewer'
    }, memberToken);
    expect(res.status).toBe(403);
  });

  it('admin can remove members', async () => {
    const res = await del(`/api/workspaces/${workspaceId}/members/${viewerId}`, memberToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Member removed');
  });

  it('non-member cannot list members', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/members`, viewerToken);
    expect(res.status).toBe(403);
  });

  it('returns 409 when adding duplicate member', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/members`, {
      user_id: memberId,
      role: 'viewer'
    }, ownerToken);
    expect(res.status).toBe(409);
  });
});
