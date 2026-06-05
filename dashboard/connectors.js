/* ═══════════════════════════════════════════════════════════════
   Phase 2 — Live Data Integration Framework
   Connector adapters, encrypted storage, normalized data store
   ═══════════════════════════════════════════════════════════════ */

/* ─── Encrypted Credential Storage ────────────────────────── */
const CredentialVault = (() => {
  const STORAGE_KEY = 'ryse-vault';
  const SALT = 'ryse-cmd-center-2025';

  async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(SALT), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function getPassphrase() {
    let p = sessionStorage.getItem('ryse-vk');
    if (!p) {
      p = crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
      sessionStorage.setItem('ryse-vk', p);
    }
    return p;
  }

  async function encrypt(data) {
    const key = await deriveKey(getPassphrase());
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
    return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) };
  }

  async function decrypt(envelope) {
    try {
      const key = await deriveKey(getPassphrase());
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(envelope.iv) },
        key,
        new Uint8Array(envelope.ct)
      );
      return JSON.parse(new TextDecoder().decode(pt));
    } catch {
      return {};
    }
  }

  return {
    async save(connectorId, credentials) {
      const all = await this.loadAll();
      all[connectorId] = credentials;
      const envelope = await encrypt(all);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    },

    async load(connectorId) {
      const all = await this.loadAll();
      return all[connectorId] || null;
    },

    async loadAll() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      try {
        return await decrypt(JSON.parse(raw));
      } catch {
        return {};
      }
    },

    async remove(connectorId) {
      const all = await this.loadAll();
      delete all[connectorId];
      if (Object.keys(all).length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        const envelope = await encrypt(all);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      }
    },

    async clear() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };
})();

/* ─── Auth Headers Helper ─────────────────────────────────── */
function getAuthHeaders() {
  const token = (typeof window.getToken === 'function') ? window.getToken() : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/* ─── Data Store (normalized) ─────────────────────────────── */
const DataStore = {
  _data: {},
  _listeners: [],

  set(key, value, source = 'demo') {
    this._data[key] = { value, source, updatedAt: Date.now() };
    this._notify(key);
  },

  get(key) {
    return this._data[key] || null;
  },

  getSource(key) {
    const entry = this._data[key];
    return entry ? entry.source : 'demo';
  },

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  },

  _notify(key) {
    this._listeners.forEach(fn => fn(key));
  }
};

/* ─── Base Connector ──────────────────────────────────────── */
class BaseConnector {
  constructor(id, name, icon, color, fields) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.color = color;
    this.fields = fields; // [{key, label, type, placeholder}]
    this.status = 'disconnected'; // disconnected | connecting | connected | error
    this.lastError = null;
    this.lastSync = null;
  }

  async connect(credentials) {
    this.status = 'connecting';
    this.lastError = null;
    ConnectorManager.notify();
    try {
      await CredentialVault.save(this.id, credentials);

      // Save to server for proxy access
      if (typeof window.saveConnectorConfig === 'function') {
        const serverCreds = this._mapCredentialsForServer(credentials);
        const serverId = this._getServerConnectorId();
        try {
          await window.saveConnectorConfig(serverId, serverCreds);
        } catch (saveErr) {
          this.status = 'error';
          this.lastError = 'Failed to save credentials to server: ' + (saveErr.message || 'Unknown error');
          ConnectorManager.notify();
          return;
        }
      }

      const ok = await this.testConnection(credentials);
      if (ok) {
        this.status = 'connected';
        this.lastSync = Date.now();
        await this.fetchData(credentials);
      } else {
        this.status = 'error';
        this.lastError = 'Connection test failed';
      }
    } catch (e) {
      this.status = 'error';
      this.lastError = e.message || 'Unknown error';
    }
    ConnectorManager.notify();
  }

  async disconnect() {
    await CredentialVault.remove(this.id);
    this.status = 'disconnected';
    this.lastError = null;
    this.lastSync = null;
    ConnectorManager.notify();
  }

  async testConnection(_credentials) { return true; }
  async fetchData(_credentials) {}

  _mapCredentialsForServer(credentials) {
    return credentials; // default: pass through
  }

  _getServerConnectorId() {
    return this.id; // default: use connector id
  }

  async tryRestore() {
    const creds = await CredentialVault.load(this.id);
    if (creds) {
      await this.connect(creds);
    }
  }
}

/* ─── Shopify Connector ───────────────────────────────────── */
class ShopifyConnector extends BaseConnector {
  constructor() {
    super('shopify', 'Shopify', '🛍️', '#96bf48', [
      { key: 'store', label: 'Store URL', type: 'text', placeholder: 'your-store (myshopify subdomain)' },
      { key: 'token', label: 'Admin API Token', type: 'password', placeholder: 'shpat_xxxxx...' },
    ]);
  }

  async testConnection(creds) {
    if (!creds.store || !creds.token) return false;
    try {
      const resp = await fetch('/api/proxy/shopify', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ endpoint: '/shop.json', method: 'GET' })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async fetchData(creds) {
    try {
      const headers = getAuthHeaders();

      const [ordersResp, productsResp] = await Promise.all([
        fetch('/api/proxy/shopify', {
          method: 'POST', headers,
          body: JSON.stringify({ endpoint: '/orders.json', method: 'GET', params: { status: 'any', limit: '50' } })
        }).catch(() => null),
        fetch('/api/proxy/shopify', {
          method: 'POST', headers,
          body: JSON.stringify({ endpoint: '/products.json', method: 'GET', params: { limit: '20' } })
        }).catch(() => null),
      ]);

      if (ordersResp?.ok) {
        const { orders } = await ordersResp.json();
        const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
        const dailyOrders = this._aggregateDaily(orders, 'created_at');
        const dailyRevenue = this._aggregateRevenue(orders, 'created_at', 'total_price');

        DataStore.set('shopify_revenue', totalRevenue, 'shopify');
        DataStore.set('shopify_orders_chart', { labels: dailyOrders.labels, orders: dailyOrders.values, revenue: dailyRevenue.values }, 'shopify');
        DataStore.set('shopify_order_count', orders.length, 'shopify');
      }

      if (productsResp?.ok) {
        const { products } = await productsResp.json();
        const topProducts = products.slice(0, 5).map(p => ({
          name: p.title,
          units: p.variants?.reduce((s, v) => s + (v.inventory_quantity || 0), 0) || 0,
          revenue: 0,
          image: p.image?.src || null,
        }));
        DataStore.set('shopify_products', topProducts, 'shopify');
      }
    } catch (e) {
      this.lastError = e.message;
    }
  }

  _mapCredentialsForServer(creds) {
    // Normalize store input: handle "store.myshopify.com", "store", "https://store.myshopify.com", "store.com"
    let shop = (creds.store || '').trim().toLowerCase();
    // Remove protocol if present
    shop = shop.replace(/^https?:\/\//, '');
    // Remove trailing slashes or paths
    shop = shop.split('/')[0];
    // Remove .myshopify.com suffix if present to get just the store name
    shop = shop.replace(/\.myshopify\.com$/, '');
    return { shopDomain: shop, accessToken: creds.token };
  }

  _aggregateDaily(items, dateField) {
    const days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    items.forEach(item => {
      const key = item[dateField]?.split('T')[0];
      if (key && days[key] !== undefined) days[key]++;
    });
    return { labels: Object.keys(days).map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' })), values: Object.values(days) };
  }

  _aggregateRevenue(items, dateField, amountField) {
    const days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    items.forEach(item => {
      const key = item[dateField]?.split('T')[0];
      if (key && days[key] !== undefined) days[key] += parseFloat(item[amountField] || 0);
    });
    return { labels: Object.keys(days).map(d => new Date(d).toLocaleDateString('en', { weekday: 'short' })), values: Object.values(days) };
  }
}

/* ─── GitHub Connector ────────────────────────────────────── */
class GitHubConnector extends BaseConnector {
  constructor() {
    super('github', 'GitHub', '🐙', '#333', [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxx...' },
      { key: 'owner', label: 'Owner / Org', type: 'text', placeholder: 'RYSESEO' },
    ]);
  }

  async testConnection(creds) {
    if (!creds.token) return false;
    try {
      const resp = await fetch('/api/proxy/github', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ endpoint: '/user', method: 'GET' })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async fetchData(creds) {
    try {
      const headers = getAuthHeaders();
      const owner = creds.owner || '';

      const [userResp, eventsResp] = await Promise.all([
        fetch('/api/proxy/github', {
          method: 'POST', headers,
          body: JSON.stringify({ endpoint: '/user', method: 'GET' })
        }),
        fetch('/api/proxy/github', {
          method: 'POST', headers,
          body: JSON.stringify({ endpoint: owner ? `/users/${owner}/events?per_page=30` : '/events?per_page=30', method: 'GET' })
        }).catch(() => null),
      ]);

      if (userResp.ok) {
        const user = await userResp.json();
        DataStore.set('github_user', { login: user.login, avatar: user.avatar_url, repos: user.public_repos }, 'github');
      }

      if (eventsResp?.ok) {
        const events = await eventsResp.json();
        const prs = events.filter(e => e.type === 'PullRequestEvent');
        const pushes = events.filter(e => e.type === 'PushEvent');
        const prsMerged = prs.filter(e => e.payload?.action === 'closed' && e.payload?.pull_request?.merged);
        const totalCommits = pushes.reduce((s, e) => s + (e.payload?.commits?.length || 0), 0);

        DataStore.set('github_activity', {
          prs_opened: prs.filter(e => e.payload?.action === 'opened').length,
          prs_merged: prsMerged.length,
          commits: totalCommits,
          events: events.slice(0, 6).map(e => ({
            type: e.type,
            repo: e.repo?.name || '',
            time: e.created_at,
            action: e.payload?.action || '',
          })),
        }, 'github');

        DataStore.set('agent_sessions', totalCommits + prs.length, 'github');
      }
    } catch (e) {
      this.lastError = e.message;
    }
  }
}

/* ─── Google Analytics 4 Connector ────────────────────────── */
class GA4Connector extends BaseConnector {
  constructor() {
    super('ga4', 'Google Analytics 4', '📊', '#f9ab00', [
      { key: 'propertyId', label: 'GA4 Property ID', type: 'text', placeholder: '123456789' },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' },
    ]);
  }

  async testConnection(creds) {
    if (!creds.propertyId || !creds.apiKey) return false;
    try {
      const resp = await fetch('/api/proxy/analytics', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          endpoint: ':runReport',
          method: 'POST',
          params: {
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            metrics: [{ name: 'activeUsers' }],
          }
        })
      });
      return resp.ok || resp.status === 403;
    } catch {
      return false;
    }
  }

  async fetchData(creds) {
    try {
      const headers = getAuthHeaders();

      const [usersResp, pagesResp] = await Promise.all([
        fetch('/api/proxy/analytics', {
          method: 'POST', headers,
          body: JSON.stringify({
            endpoint: ':runReport',
            method: 'POST',
            params: {
              dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
              dimensions: [{ name: 'date' }],
              metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'engagedSessions' }],
              orderBys: [{ dimension: { dimensionName: 'date' } }],
            }
          })
        }).catch(() => null),
        fetch('/api/proxy/analytics', {
          method: 'POST', headers,
          body: JSON.stringify({
            endpoint: ':runReport',
            method: 'POST',
            params: {
              dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
              dimensions: [{ name: 'sessionSource' }],
              metrics: [{ name: 'sessions' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 5,
            }
          })
        }).catch(() => null),
      ]);

      if (usersResp?.ok) {
        const data = await usersResp.json();
        const rows = data.rows || [];
        const labels = rows.map(r => {
          const d = r.dimensionValues[0].value;
          return new Date(d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8))
            .toLocaleDateString('en', { weekday: 'short' });
        });
        const views = rows.map(r => parseInt(r.metricValues[1]?.value || 0));
        const engagement = rows.map(r => parseInt(r.metricValues[2]?.value || 0));
        const totalViews = views.reduce((s, v) => s + v, 0);

        DataStore.set('content_views', totalViews, 'ga4');
        DataStore.set('content_chart', { labels, views, engagement }, 'ga4');
      }

      if (pagesResp?.ok) {
        const data = await pagesResp.json();
        const rows = data.rows || [];
        const sources = rows.map(r => ({
          label: r.dimensionValues[0].value,
          value: parseInt(r.metricValues[0].value),
        }));
        DataStore.set('lead_sources', sources, 'ga4');
      }
    } catch (e) {
      this.lastError = e.message;
    }
  }

  _mapCredentialsForServer(creds) {
    return { propertyId: creds.propertyId, accessToken: creds.apiKey };
  }
}

/* ─── Google Search Console Connector ─────────────────────── */
class SearchConsoleConnector extends BaseConnector {
  constructor() {
    super('gsc', 'Search Console', '🔍', '#4285f4', [
      { key: 'siteUrl', label: 'Site URL', type: 'text', placeholder: 'https://example.com' },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' },
    ]);
  }

  async testConnection(creds) {
    if (!creds.siteUrl || !creds.apiKey) return false;
    try {
      const resp = await fetch('/api/proxy/search-console', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ endpoint: '/sites', method: 'GET' })
      });
      return resp.ok || resp.status === 403;
    } catch {
      return false;
    }
  }

  async fetchData(creds) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const resp = await fetch('/api/proxy/search-console', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          endpoint: '/searchAnalytics/query',
          method: 'POST',
          params: {
            startDate,
            endDate,
            dimensions: ['date'],
            rowLimit: 7,
          }
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const rows = data.rows || [];
        DataStore.set('search_console', {
          clicks: rows.reduce((s, r) => s + r.clicks, 0),
          impressions: rows.reduce((s, r) => s + r.impressions, 0),
          ctr: rows.length ? (rows.reduce((s, r) => s + r.ctr, 0) / rows.length * 100).toFixed(1) : 0,
          position: rows.length ? (rows.reduce((s, r) => s + r.position, 0) / rows.length).toFixed(1) : 0,
          daily: rows.map(r => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
        }, 'gsc');
      }
    } catch (e) {
      this.lastError = e.message;
    }
  }

  _mapCredentialsForServer(creds) {
    return { siteUrl: creds.siteUrl, accessToken: creds.apiKey };
  }

  _getServerConnectorId() {
    return 'search-console';
  }
}

/* ─── Stripe Connector ────────────────────────────────────── */
class StripeConnector extends BaseConnector {
  constructor() {
    super('stripe', 'Stripe', '💳', '#635bff', [
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_xxxxx...' },
    ]);
  }

  async testConnection(creds) {
    if (!creds.secretKey) return false;
    try {
      const resp = await fetch('/api/proxy/stripe', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ endpoint: '/v1/balance', method: 'GET' })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async fetchData(creds) {
    try {
      const headers = getAuthHeaders();
      const since = Math.floor((Date.now() - 7 * 86400000) / 1000);

      const [balanceResp, chargesResp] = await Promise.all([
        fetch('/api/proxy/stripe', {
          method: 'POST', headers,
          body: JSON.stringify({ endpoint: '/v1/balance', method: 'GET' })
        }).catch(() => null),
        fetch('/api/proxy/stripe', {
          method: 'POST', headers,
          body: JSON.stringify({ endpoint: `/v1/charges?limit=50&created[gte]=${since}`, method: 'GET' })
        }).catch(() => null),
      ]);

      if (balanceResp?.ok) {
        const balance = await balanceResp.json();
        const total = balance.available?.reduce((s, b) => s + b.amount, 0) || 0;
        DataStore.set('stripe_balance', total / 100, 'stripe');
      }

      if (chargesResp?.ok) {
        const { data: charges } = await chargesResp.json();
        const revenue = charges.reduce((s, c) => s + (c.amount || 0), 0) / 100;
        const successful = charges.filter(c => c.status === 'succeeded').length;
        DataStore.set('stripe_revenue', revenue, 'stripe');
        DataStore.set('stripe_charges', { total: charges.length, successful, revenue }, 'stripe');
      }
    } catch (e) {
      this.lastError = e.message;
    }
  }
}

/* ─── Connector Manager ───────────────────────────────────── */
const ConnectorManager = {
  connectors: [],
  _listeners: [],
  demoMode: true,

  init() {
    this.connectors = [
      new ShopifyConnector(),
      new GitHubConnector(),
      new GA4Connector(),
      new SearchConsoleConnector(),
      new StripeConnector(),
    ];

    const savedMode = localStorage.getItem('ryse-demo-mode');
    this.demoMode = savedMode === null ? true : savedMode === 'true';
  },

  async restoreAll() {
    for (const c of this.connectors) {
      await c.tryRestore();
    }
    if (this.hasAnyConnected()) {
      this.demoMode = false;
      localStorage.setItem('ryse-demo-mode', 'false');
    }
  },

  get(id) {
    return this.connectors.find(c => c.id === id);
  },

  hasAnyConnected() {
    return this.connectors.some(c => c.status === 'connected');
  },

  getConnectedCount() {
    return this.connectors.filter(c => c.status === 'connected').length;
  },

  toggleDemoMode(force) {
    this.demoMode = force !== undefined ? force : !this.demoMode;
    localStorage.setItem('ryse-demo-mode', String(this.demoMode));
    this.notify();
  },

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  },

  notify() {
    this._listeners.forEach(fn => fn());
  }
};

/* ─── Settings Panel Controller ───────────────────────────── */
const SettingsPanel = {
  isOpen: false,
  activeTab: 'connections',

  open() {
    this.isOpen = true;
    this.render();
    document.getElementById('settings-panel').hidden = false;
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.isOpen = false;
    document.getElementById('settings-panel').hidden = true;
    document.body.style.overflow = '';
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  render() {
    const panel = document.getElementById('settings-connections');
    if (!panel) return;

    panel.innerHTML = ConnectorManager.connectors.map(c => `
      <div class="connector-card" data-connector="${c.id}">
        <div class="connector-header">
          <span class="connector-icon">${c.icon}</span>
          <div class="connector-info">
            <span class="connector-name">${c.name}</span>
            <span class="connector-status status-${c.status}">${this._statusLabel(c.status)}</span>
          </div>
          <div class="connector-actions">
            ${c.status === 'connected'
              ? `<button class="conn-btn conn-btn-disconnect" data-action="disconnect" data-id="${c.id}">Disconnect</button>
                 <button class="conn-btn conn-btn-sync" data-action="sync" data-id="${c.id}">Sync</button>`
              : `<button class="conn-btn conn-btn-connect" data-action="toggle-form" data-id="${c.id}">
                  ${c.status === 'error' ? 'Retry' : 'Connect'}
                </button>`
            }
          </div>
        </div>
        ${c.lastError ? `<div class="connector-error">${c.lastError}</div>` : ''}
        ${c.lastSync ? `<div class="connector-sync-time">Last synced: ${new Date(c.lastSync).toLocaleTimeString()}</div>` : ''}
        <div class="connector-form" id="form-${c.id}" hidden>
          ${(c.id === 'shopify' || c.id === 'github') ? `
            <div class="conn-oauth-section">
              <button class="conn-btn conn-btn-oauth" data-action="oauth" data-id="${c.id}">
                Connect with OAuth
              </button>
              <span class="conn-oauth-divider">or enter credentials manually:</span>
            </div>
          ` : ''}
          ${c.fields.map(f => `
            <div class="conn-field">
              <label>${f.label}</label>
              <input type="${f.type}" placeholder="${f.placeholder}" data-connector="${c.id}" data-field="${f.key}" />
            </div>
          `).join('')}
          <button class="conn-btn conn-btn-save" data-action="connect" data-id="${c.id}">Connect & Sync</button>
        </div>
      </div>
    `).join('');

    this._bindEvents();
  },

  _statusLabel(status) {
    const map = { disconnected: 'Not Connected', connecting: 'Connecting...', connected: 'Connected', error: 'Error' };
    return map[status] || status;
  },

  _bindEvents() {
    document.querySelectorAll('[data-action="toggle-form"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const form = document.getElementById(`form-${id}`);
        form.hidden = !form.hidden;
      });
    });

    document.querySelectorAll('[data-action="oauth"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (id === 'shopify') {
          initiateShopifyOAuth();
        } else if (id === 'github') {
          initiateGitHubOAuth();
        }
      });
    });

    document.querySelectorAll('[data-action="connect"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const connector = ConnectorManager.get(id);
        const creds = {};
        document.querySelectorAll(`input[data-connector="${id}"]`).forEach(inp => {
          creds[inp.dataset.field] = inp.value.trim();
        });
        await connector.connect(creds);
        this.render();
        updateDataSourceBadges();
        if (connector.status === 'connected' && !ConnectorManager.demoMode) {
          rebuildAllWidgets();
        }
      });
    });

    document.querySelectorAll('[data-action="disconnect"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await ConnectorManager.get(id).disconnect();
        this.render();
        updateDataSourceBadges();
      });
    });

    document.querySelectorAll('[data-action="sync"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const connector = ConnectorManager.get(id);
        const creds = await CredentialVault.load(id);
        if (creds) {
          await connector.fetchData(creds);
          connector.lastSync = Date.now();
          this.render();
          if (!ConnectorManager.demoMode) rebuildAllWidgets();
        }
      });
    });
  }
};

/* ─── Demo Mode Toggle ────────────────────────────────────── */
function initDemoModeToggle() {
  const toggle = document.getElementById('demo-mode-toggle');
  const label = document.getElementById('demo-mode-label');
  if (!toggle) return;

  function updateToggle() {
    toggle.checked = ConnectorManager.demoMode;
    label.textContent = ConnectorManager.demoMode ? 'Demo Data' : 'Live Data';
    label.className = ConnectorManager.demoMode ? 'demo-label demo' : 'demo-label live';
    updateDataSourceBadges();
  }

  toggle.addEventListener('change', () => {
    ConnectorManager.toggleDemoMode(toggle.checked);
    rebuildAllWidgets();
    updateToggle();
  });

  ConnectorManager.subscribe(updateToggle);
  updateToggle();
}

/* ─── Data Source Badges ──────────────────────────────────── */
function updateDataSourceBadges() {
  document.querySelectorAll('[data-source-badge]').forEach(badge => {
    const widget = badge.dataset.sourceBadge;
    if (ConnectorManager.demoMode) {
      badge.textContent = 'Demo';
      badge.className = 'source-badge source-demo';
    } else {
      const sourceMap = {
        'agents': DataStore.getSource('agent_sessions'),
        'revenue': DataStore.getSource('shopify_revenue') !== 'demo' ? DataStore.getSource('shopify_revenue') : DataStore.getSource('stripe_revenue'),
        'leads-kpi': DataStore.getSource('lead_sources'),
        'content-kpi': DataStore.getSource('content_views'),
        'agent-usage': DataStore.getSource('github_activity'),
        'lead-sources': DataStore.getSource('lead_sources'),
        'shopify': DataStore.getSource('shopify_orders_chart'),
        'content-perf': DataStore.getSource('content_chart'),
        'tokens': 'demo',
        'agent-feed': DataStore.getSource('github_activity'),
        'top-products': DataStore.getSource('shopify_products'),
        'pipeline': DataStore.getSource('lead_sources'),
        'channels': DataStore.getSource('content_chart'),
        'quick-stats': 'demo',
      };
      const source = sourceMap[widget] || 'demo';
      badge.textContent = source === 'demo' ? 'Demo' : 'Live';
      badge.className = source === 'demo' ? 'source-badge source-demo' : 'source-badge source-live';
    }
  });
}

/* ─── Wire Live Data to Widgets ───────────────────────────── */
function rebuildAllWidgets() {
  // This function is called from app.js context where rebuildCharts exists
  if (typeof rebuildCharts === 'function') {
    const theme = document.documentElement.getAttribute('data-theme') || 'default';
    const tc = THEME_CHART_COLORS[theme] || THEME_CHART_COLORS.default;
    rebuildCharts(tc);
  }
  updateDataSourceBadges();
}

/* ─── Get Live or Demo Data ───────────────────────────────── */
function getLiveData(key, demoFallback) {
  if (ConnectorManager.demoMode) return demoFallback;
  const entry = DataStore.get(key);
  return (entry && entry.source !== 'demo') ? entry.value : demoFallback;
}

/* ─── Init Settings Button ────────────────────────────────── */
function initSettingsPanel() {
  const btn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('settings-close');
  const overlay = document.getElementById('settings-panel');

  if (btn) btn.addEventListener('click', () => SettingsPanel.open());
  if (closeBtn) closeBtn.addEventListener('click', () => SettingsPanel.close());
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) SettingsPanel.close();
    });
  }

  // Add settings command to command palette
  if (typeof CMD_COMMANDS !== 'undefined') {
    CMD_COMMANDS.push(
      { group: 'Actions', label: 'Open Settings', hint: 'Manage data connections', key: 'S', icon: '⚙️', action: () => SettingsPanel.open() },
      { group: 'Actions', label: 'Toggle Demo Mode', hint: 'Switch between live and demo data', icon: '🔄', action: () => { ConnectorManager.toggleDemoMode(); rebuildAllWidgets(); } }
    );
  }
}

/* ─── Boot Connectors ─────────────────────────────────────── */
async function initConnectors() {
  ConnectorManager.init();
  initSettingsPanel();
  initDemoModeToggle();
  await ConnectorManager.restoreAll();
  updateDataSourceBadges();
  await checkOAuthStatus();
  handleOAuthRedirect();
  // After all connections restored, ensure dashboard reflects live state
  if (ConnectorManager.hasAnyConnected()) {
    ConnectorManager.toggleDemoMode(false);
    rebuildAllWidgets();
  }
}

/* ─── OAuth Integration ───────────────────────────────────── */
async function checkOAuthStatus() {
  const token = (typeof window.getToken === 'function') ? window.getToken() : null;
  if (!token) return;

  try {
    const r = await fetch('/api/oauth/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) return;
    const data = await r.json();
    if (!data) return;

    const fetchPromises = [];

    if (data.shopify && data.shopify.connected) {
      const shopify = ConnectorManager.get('shopify');
      if (shopify && shopify.status !== 'connected') {
        shopify.status = 'connected';
        shopify.lastSync = Date.now();
        ConnectorManager.notify();
        // Fetch live data using OAuth (server resolves token)
        fetchPromises.push(shopify.fetchData({}));
      }
    }
    if (data.github && data.github.connected) {
      const github = ConnectorManager.get('github');
      if (github && github.status !== 'connected') {
        github.status = 'connected';
        github.lastSync = Date.now();
        ConnectorManager.notify();
        // Fetch live data using OAuth (server resolves token)
        fetchPromises.push(github.fetchData({}));
      }
    }

    // Fetch data concurrently so a slow connector does not block the other
    if (fetchPromises.length > 0) {
      await Promise.allSettled(fetchPromises);
    }

    updateDataSourceBadges();
  } catch (e) {
    // Silently ignore OAuth status check failures
  }
}

function handleOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const oauth = params.get('oauth');
  const status = params.get('status');

  if (oauth && status === 'success') {
    if (oauth === 'shopify') {
      const shopify = ConnectorManager.get('shopify');
      if (shopify) {
        shopify.status = 'connected';
        shopify.lastSync = Date.now();
        ConnectorManager.notify();
      }
    } else if (oauth === 'github') {
      const github = ConnectorManager.get('github');
      if (github) {
        github.status = 'connected';
        github.lastSync = Date.now();
        ConnectorManager.notify();
      }
    }
    updateDataSourceBadges();
    // Clean up URL params
    const url = new URL(window.location);
    url.searchParams.delete('oauth');
    url.searchParams.delete('status');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url.pathname);
  }
}

function initiateShopifyOAuth() {
  const shop = prompt('Enter your Shopify store subdomain (e.g., my-store):');
  if (shop && shop.trim()) {
    const token = (typeof window.getToken === 'function') ? window.getToken() : null;
    if (!token) { alert('Please sign in first'); return; }
    window.location.href = `/api/oauth/shopify/install?shop=${encodeURIComponent(shop.trim())}&token=${encodeURIComponent(token)}`;
  }
}

function initiateGitHubOAuth() {
  const token = (typeof window.getToken === 'function') ? window.getToken() : null;
  if (!token) { alert('Please sign in first'); return; }
  window.location.href = `/api/oauth/github/authorize?token=${encodeURIComponent(token)}`;
}

function disconnectOAuth(provider) {
  const token = (typeof window.getToken === 'function') ? window.getToken() : null;
  if (!token) return;

  fetch(`/api/oauth/${provider}/disconnect`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.success) {
        const connector = ConnectorManager.get(provider);
        if (connector) {
          connector.status = 'disconnected';
          connector.lastSync = null;
          ConnectorManager.notify();
        }
        updateDataSourceBadges();
        SettingsPanel.render();
      }
    })
    .catch(() => {});
}
