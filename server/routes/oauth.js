import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { encrypt, decrypt } from '../middleware/encryption.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// OAuth routes accept auth via header OR query param (needed for page-navigation redirects)
function requireAuthOrQueryToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Most OAuth routes require authentication (callbacks handle auth differently)
router.use((req, res, next) => {
  // Callback routes authenticate via the state nonce (user_id stored in oauth_states)
  const isCallback = req.path === '/shopify/callback' || req.path === '/github/callback';
  if (isCallback) return next();
  return requireAuthOrQueryToken(req, res, next);
});

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,read_orders';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

/**
 * Resolve the application base URL.
 * Priority: APP_URL env var > RAILWAY_PUBLIC_DOMAIN > request origin detection > localhost fallback
 */
function getAppUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  // Auto-detect from request headers (handles proxies like Railway, Render, etc.)
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return 'http://localhost:5173';
}

/**
 * Validate shop domain format (alphanumeric + hyphens only)
 */
function isValidShop(shop) {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(shop) || /^[a-zA-Z0-9]$/.test(shop);
}

/**
 * Generate a random state nonce
 */
function generateState() {
  return crypto.randomBytes(24).toString('hex');
}

// GET /api/oauth/shopify/install - Initiate Shopify OAuth
router.get('/shopify/install', (req, res) => {
  const { shop } = req.query;

  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }

  if (!isValidShop(shop)) {
    return res.status(400).json({ error: 'Invalid shop format. Use alphanumeric characters and hyphens only.' });
  }

  const state = generateState();

  // Store state in oauth_states table with 10-minute expiry and shop for SSRF protection
  db.prepare(
    "INSERT INTO oauth_states (user_id, provider, state, shop, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))"
  ).run(req.user.id, 'shopify', state, shop);

  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/oauth/shopify/callback`;
  const authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SHOPIFY_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  res.redirect(authUrl);
});

// GET /api/oauth/shopify/callback - Handle Shopify OAuth callback
router.get('/shopify/callback', async (req, res) => {
  const { code, shop, state } = req.query;

  if (!state) {
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=missing_state`);
  }

  // Look up state nonce to identify the user (callback has no auth token)
  const stateRow = db.prepare(
    'SELECT * FROM oauth_states WHERE state = ? AND provider = ?'
  ).get(state, 'shopify');

  if (!stateRow) {
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=invalid_state`);
  }

  const userId = stateRow.user_id;

  // Check state expiry
  if (stateRow.expires_at && new Date(stateRow.expires_at) < new Date()) {
    db.prepare('DELETE FROM oauth_states WHERE id = ?').run(stateRow.id);
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=state_expired`);
  }

  // Delete state nonce (one-time use)
  db.prepare('DELETE FROM oauth_states WHERE id = ?').run(stateRow.id);

  if (!code) {
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=missing_code`);
  }

  if (!shop) {
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=missing_shop`);
  }

  // SSRF protection: verify shop matches the one stored during install
  if (stateRow.shop && stateRow.shop !== shop) {
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=shop_mismatch`);
  }

  // Defense-in-depth: validate shop format in callback as well
  if (!isValidShop(shop)) {
    return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=invalid_shop`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code
      })
    });

    if (!tokenResponse.ok) {
      return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=no_access_token`);
    }

    // Encrypt and store the token
    const encryptedToken = encrypt(accessToken);
    db.prepare(
      'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(userId, 'oauth_shopify_token', JSON.stringify(encryptedToken));

    // Store the shop domain
    db.prepare(
      'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(userId, 'oauth_shopify_shop', shop);

    res.redirect(`${getAppUrl(req)}?oauth=shopify&status=success`);
  } catch (err) {
    console.error('Shopify OAuth callback error:', err.message);
    res.redirect(`${getAppUrl(req)}?oauth=shopify&status=error&message=token_exchange_failed`);
  }
});

// GET /api/oauth/github/authorize - Initiate GitHub OAuth
router.get('/github/authorize', (req, res) => {
  const state = generateState();

  // Store state in oauth_states table with 10-minute expiry
  db.prepare(
    "INSERT INTO oauth_states (user_id, provider, state, expires_at) VALUES (?, ?, ?, datetime('now', '+10 minutes'))"
  ).run(req.user.id, 'github', state);

  const redirectUri = `${getAppUrl(req)}/api/oauth/github/callback`;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user&state=${state}`;

  res.redirect(authUrl);
});

// GET /api/oauth/github/callback - Handle GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state) {
    return res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=missing_state`);
  }

  // Look up state nonce to identify the user (callback has no auth token)
  const stateRow = db.prepare(
    'SELECT * FROM oauth_states WHERE state = ? AND provider = ?'
  ).get(state, 'github');

  if (!stateRow) {
    return res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=invalid_state`);
  }

  const userId = stateRow.user_id;

  // Check state expiry
  if (stateRow.expires_at && new Date(stateRow.expires_at) < new Date()) {
    db.prepare('DELETE FROM oauth_states WHERE id = ?').run(stateRow.id);
    return res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=state_expired`);
  }

  // Delete state nonce (one-time use)
  db.prepare('DELETE FROM oauth_states WHERE id = ?').run(stateRow.id);

  if (!code) {
    return res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=missing_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    });

    if (!tokenResponse.ok) {
      return res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=no_access_token`);
    }

    // Encrypt and store the token
    const encryptedToken = encrypt(accessToken);
    db.prepare(
      'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(userId, 'oauth_github_token', JSON.stringify(encryptedToken));

    res.redirect(`${getAppUrl(req)}?oauth=github&status=success`);
  } catch (err) {
    console.error('GitHub OAuth callback error:', err.message);
    res.redirect(`${getAppUrl(req)}?oauth=github&status=error&message=token_exchange_failed`);
  }
});

// GET /api/oauth/status - Check OAuth connection status
router.get('/status', (req, res) => {
  const shopifyToken = db.prepare(
    'SELECT value FROM user_state WHERE user_id = ? AND key = ?'
  ).get(req.user.id, 'oauth_shopify_token');

  const shopifyShop = db.prepare(
    'SELECT value FROM user_state WHERE user_id = ? AND key = ?'
  ).get(req.user.id, 'oauth_shopify_shop');

  const githubToken = db.prepare(
    'SELECT value FROM user_state WHERE user_id = ? AND key = ?'
  ).get(req.user.id, 'oauth_github_token');

  res.json({
    shopify: {
      connected: !!shopifyToken,
      shop: shopifyShop ? shopifyShop.value : null
    },
    github: {
      connected: !!githubToken
    }
  });
});

// DELETE /api/oauth/shopify/disconnect - Remove Shopify OAuth tokens
router.delete('/shopify/disconnect', (req, res) => {
  db.prepare('DELETE FROM user_state WHERE user_id = ? AND key = ?').run(req.user.id, 'oauth_shopify_token');
  db.prepare('DELETE FROM user_state WHERE user_id = ? AND key = ?').run(req.user.id, 'oauth_shopify_shop');
  res.json({ success: true });
});

// DELETE /api/oauth/github/disconnect - Remove GitHub OAuth tokens
router.delete('/github/disconnect', (req, res) => {
  db.prepare('DELETE FROM user_state WHERE user_id = ? AND key = ?').run(req.user.id, 'oauth_github_token');
  res.json({ success: true });
});

export default router;
