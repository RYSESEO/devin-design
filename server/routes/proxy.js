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
 * Get OAuth credentials for a provider if the user has connected via OAuth.
 * Returns the decrypted access token or null.
 */
function getOAuthCredentials(userId, provider) {
  const tokenKey = `oauth_${provider}_token`;
  const row = db.prepare(
    'SELECT value FROM user_state WHERE user_id = ? AND key = ?'
  ).get(userId, tokenKey);

  if (!row) return null;

  try {
    const encrypted = JSON.parse(row.value);
    return decrypt(encrypted);
  } catch {
    return null;
  }
}

/**
 * Validate that the resolved URL stays within the expected origin.
 * Prevents SSRF by rejecting absolute URLs in the endpoint parameter
 * that would override the base URL.
 *
 * Ensures baseUrl has a trailing slash so that relative resolution
 * preserves the full base path (e.g. /admin/api/2024-10/).
 * Strips leading slashes from endpoint to prevent path-absolute
 * resolution that would discard the base path.
 */
function validateProxyUrl(endpoint, baseUrl) {
  // Reject protocol-relative URLs (e.g. //evil.com/path) which are SSRF vectors
  if (endpoint.startsWith('//')) {
    return null;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  const resolved = new URL(normalizedEndpoint, normalizedBase);
  const base = new URL(normalizedBase);
  if (resolved.origin !== base.origin) {
    return null;
  }
  return resolved;
}

// POST /api/proxy/shopify - Forward to Shopify Admin API
router.post('/shopify', async (req, res) => {
  // Check for OAuth token first, then fall back to manual connector credentials
  let shopDomain, accessToken;
  const oauthToken = getOAuthCredentials(req.user.id, 'shopify');
  if (oauthToken) {
    const shopRow = db.prepare(
      'SELECT value FROM user_state WHERE user_id = ? AND key = ?'
    ).get(req.user.id, 'oauth_shopify_shop');
    shopDomain = shopRow ? shopRow.value : null;
    accessToken = oauthToken;
  }

  if (!accessToken || !shopDomain) {
    const credentials = getCredentials(req.user.id, 'shopify');
    if (!credentials) {
      return res.status(400).json({ error: 'Connector not configured' });
    }
    shopDomain = credentials.shopDomain;
    accessToken = credentials.accessToken;
  }

  const { endpoint, method = 'GET', params } = req.body;

  if (!shopDomain || !accessToken) {
    return res.status(400).json({ error: 'Missing shop domain or access token. Please reconfigure the Shopify connector.' });
  }

  try {
    const baseUrl = `https://${shopDomain}.myshopify.com/admin/api/2024-10`;
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

    if (!response.ok) {
      console.error(`Shopify API error [${response.status}]: ${JSON.stringify(data)} (shop: ${shopDomain}, endpoint: ${endpoint})`);
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error(`Shopify proxy error: ${err.message} (shop: ${shopDomain}, endpoint: ${endpoint})`);
    res.status(502).json({ error: 'Failed to reach Shopify API', detail: err.message });
  }
});

// POST /api/proxy/github - Forward to GitHub API
router.post('/github', async (req, res) => {
  // Check for OAuth token first, then fall back to manual connector credentials
  let token;
  const oauthToken = getOAuthCredentials(req.user.id, 'github');
  if (oauthToken) {
    token = oauthToken;
  }

  if (!token) {
    const credentials = getCredentials(req.user.id, 'github');
    if (!credentials) {
      return res.status(400).json({ error: 'Connector not configured' });
    }
    token = credentials.token;
  }

  const { endpoint, method = 'GET', params } = req.body;

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

  if (!/^[0-9]+$/.test(String(propertyId || ''))) {
    return res.status(400).json({ error: 'Invalid GA4 property ID. Please reconfigure the connector.' });
  }

  try {
    const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
    const requestedEndpoint = endpoint || ':runReport';
    let url;
    if (requestedEndpoint.startsWith(':')) {
      // GA4 method-style endpoints (e.g. :runReport) attach directly to the
      // property resource with no path separator
      url = new URL(baseUrl + requestedEndpoint);
      if (url.origin !== new URL(baseUrl).origin) url = null;
    } else {
      url = validateProxyUrl(requestedEndpoint, baseUrl);
    }
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
    // All site-scoped Search Console endpoints live under /sites/{siteUrl}.
    // Prefix endpoints that omit it so callers can pass e.g. /searchAnalytics/query.
    let effectiveEndpoint = endpoint;
    if (!effectiveEndpoint) {
      effectiveEndpoint = `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    } else if (!effectiveEndpoint.replace(/^\/+/, '').startsWith('sites')) {
      effectiveEndpoint = `/sites/${encodeURIComponent(siteUrl)}/${effectiveEndpoint.replace(/^\/+/, '')}`;
    }
    const url = validateProxyUrl(effectiveEndpoint, baseUrl);
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
