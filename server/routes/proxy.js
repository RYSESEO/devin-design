import { Router } from 'express';
import db from '../db/index.js';
import { decrypt } from '../middleware/encryption.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All proxy routes require authentication
router.use(requireAuth);

/**
 * Get decrypted credentials for a connector
 */
function getCredentials(userId, connectorId) {
  const row = db.prepare(
    'SELECT value FROM user_state WHERE user_id = ? AND key = ?'
  ).get(userId, `connector_${connectorId}`);

  if (!row) return null;

  try {
    const encrypted = JSON.parse(row.value);
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Validate that the resolved URL stays within the expected origin.
 * Prevents SSRF by rejecting absolute URLs in the endpoint parameter
 * that would override the base URL.
 */
function validateProxyUrl(endpoint, baseUrl) {
  const resolved = new URL(endpoint, baseUrl);
  const base = new URL(baseUrl);
  if (resolved.origin !== base.origin) {
    return null;
  }
  return resolved;
}

// POST /api/proxy/shopify - Forward to Shopify Admin API
router.post('/shopify', async (req, res) => {
  const credentials = getCredentials(req.user.id, 'shopify');
  if (!credentials) {
    return res.status(400).json({ error: 'Connector not configured' });
  }

  const { endpoint, method = 'GET', params } = req.body;
  const { shopDomain, accessToken } = credentials;

  try {
    const baseUrl = `https://${shopDomain}.myshopify.com/admin/api/2024-01`;
    const url = validateProxyUrl(endpoint, baseUrl);
    if (!url) {
      return res.status(400).json({ error: 'Invalid endpoint: URL must stay within the target API origin' });
    }
    if (params && method === 'GET') {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const fetchOpts = {
      method,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    };
    if (method !== 'GET' && params) {
      fetchOpts.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), fetchOpts);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Shopify API', detail: err.message });
  }
});

// POST /api/proxy/github - Forward to GitHub API
router.post('/github', async (req, res) => {
  const credentials = getCredentials(req.user.id, 'github');
  if (!credentials) {
    return res.status(400).json({ error: 'Connector not configured' });
  }

  const { endpoint, method = 'GET', params } = req.body;
  const { token } = credentials;

  try {
    const baseUrl = 'https://api.github.com';
    const url = validateProxyUrl(endpoint, baseUrl);
    if (!url) {
      return res.status(400).json({ error: 'Invalid endpoint: URL must stay within the target API origin' });
    }

    const fetchOpts = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ryse-dashboard'
      }
    };
    if (method !== 'GET' && params) {
      fetchOpts.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), fetchOpts);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach GitHub API', detail: err.message });
  }
});

// POST /api/proxy/analytics - Forward to GA4 Data API
router.post('/analytics', async (req, res) => {
  const credentials = getCredentials(req.user.id, 'ga4');
  if (!credentials) {
    return res.status(400).json({ error: 'Connector not configured' });
  }

  const { endpoint, method = 'POST', params } = req.body;
  const { propertyId, accessToken } = credentials;

  try {
    const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
    const url = validateProxyUrl(endpoint || ':runReport', baseUrl);
    if (!url) {
      return res.status(400).json({ error: 'Invalid endpoint: URL must stay within the target API origin' });
    }

    const fetchOpts = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (params) {
      fetchOpts.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), fetchOpts);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Analytics API', detail: err.message });
  }
});

// POST /api/proxy/stripe - Forward to Stripe API
router.post('/stripe', async (req, res) => {
  const credentials = getCredentials(req.user.id, 'stripe');
  if (!credentials) {
    return res.status(400).json({ error: 'Connector not configured' });
  }

  const { endpoint, method = 'GET', params } = req.body;
  const { secretKey } = credentials;

  try {
    const baseUrl = 'https://api.stripe.com';
    const url = validateProxyUrl(endpoint, baseUrl);
    if (!url) {
      return res.status(400).json({ error: 'Invalid endpoint: URL must stay within the target API origin' });
    }

    const fetchOpts = {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    if (method !== 'GET' && params) {
      fetchOpts.body = new URLSearchParams(params).toString();
    }

    const response = await fetch(url.toString(), fetchOpts);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Stripe API', detail: err.message });
  }
});

// POST /api/proxy/search-console - Forward to Search Console API
router.post('/search-console', async (req, res) => {
  const credentials = getCredentials(req.user.id, 'search-console');
  if (!credentials) {
    return res.status(400).json({ error: 'Connector not configured' });
  }

  const { endpoint, method = 'POST', params } = req.body;
  const { siteUrl, accessToken } = credentials;

  try {
    const baseUrl = 'https://searchconsole.googleapis.com/webmasters/v3';
    const url = validateProxyUrl(endpoint || `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, baseUrl);
    if (!url) {
      return res.status(400).json({ error: 'Invalid endpoint: URL must stay within the target API origin' });
    }

    const fetchOpts = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (params) {
      fetchOpts.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), fetchOpts);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Search Console API', detail: err.message });
  }
});

export default router;
