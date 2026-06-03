import { Router } from 'express';
import crypto from 'crypto';
import db from '../db/index.js';
import { encrypt, decrypt } from '../middleware/encryption.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All OAuth routes require authentication
router.use(requireAuth);

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,read_orders';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

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

  // Store state in oauth_states table
  db.prepare(
    'INSERT INTO oauth_states (user_id, provider, state) VALUES (?, ?, ?)'
  ).run(req.user.id, 'shopify', state);

  const redirectUri = `${APP_URL}/api/oauth/shopify/callback`;
  const authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SHOPIFY_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  res.redirect(authUrl);
});

// GET /api/oauth/shopify/callback - Handle Shopify OAuth callback
router.get('/shopify/callback', async (req, res) => {
  const { code, shop, state } = req.query;

  if (!state) {
    return res.redirect(`${APP_URL}?oauth=shopify&status=error&message=missing_state`);
  }

  // Validate state nonce
  const stateRow = db.prepare(
    'SELECT * FROM oauth_states WHERE state = ? AND user_id = ? AND provider = ?'
  ).get(state, req.user.id, 'shopify');

  if (!stateRow) {
    return res.redirect(`${APP_URL}?oauth=shopify&status=error&message=invalid_state`);
  }

  // Delete state nonce (one-time use)
  db.prepare('DELETE FROM oauth_states WHERE id = ?').run(stateRow.id);

  if (!code) {
    return res.redirect(`${APP_URL}?oauth=shopify&status=error&message=missing_code`);
  }

  if (!shop) {
    return res.redirect(`${APP_URL}?oauth=shopify&status=error&message=missing_shop`);
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
      return res.redirect(`${APP_URL}?oauth=shopify&status=error&message=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.redirect(`${APP_URL}?oauth=shopify&status=error&message=no_access_token`);
    }

    // Encrypt and store the token
    const encryptedToken = encrypt(accessToken);
    db.prepare(
      'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(req.user.id, 'oauth_shopify_token', JSON.stringify(encryptedToken));

    // Store the shop domain
    db.prepare(
      'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(req.user.id, 'oauth_shopify_shop', shop);

    res.redirect(`${APP_URL}?oauth=shopify&status=success`);
  } catch (err) {
    res.redirect(`${APP_URL}?oauth=shopify&status=error&message=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/oauth/github/authorize - Initiate GitHub OAuth
router.get('/github/authorize', (req, res) => {
  const state = generateState();

  // Store state in oauth_states table
  db.prepare(
    'INSERT INTO oauth_states (user_id, provider, state) VALUES (?, ?, ?)'
  ).run(req.user.id, 'github', state);

  const redirectUri = `${APP_URL}/api/oauth/github/callback`;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user&state=${state}`;

  res.redirect(authUrl);
});

// GET /api/oauth/github/callback - Handle GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state) {
    return res.redirect(`${APP_URL}?oauth=github&status=error&message=missing_state`);
  }

  // Validate state nonce
  const stateRow = db.prepare(
    'SELECT * FROM oauth_states WHERE state = ? AND user_id = ? AND provider = ?'
  ).get(state, req.user.id, 'github');

  if (!stateRow) {
    return res.redirect(`${APP_URL}?oauth=github&status=error&message=invalid_state`);
  }

  // Delete state nonce (one-time use)
  db.prepare('DELETE FROM oauth_states WHERE id = ?').run(stateRow.id);

  if (!code) {
    return res.redirect(`${APP_URL}?oauth=github&status=error&message=missing_code`);
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
      return res.redirect(`${APP_URL}?oauth=github&status=error&message=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.redirect(`${APP_URL}?oauth=github&status=error&message=no_access_token`);
    }

    // Encrypt and store the token
    const encryptedToken = encrypt(accessToken);
    db.prepare(
      'INSERT OR REPLACE INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(req.user.id, 'oauth_github_token', JSON.stringify(encryptedToken));

    res.redirect(`${APP_URL}?oauth=github&status=success`);
  } catch (err) {
    res.redirect(`${APP_URL}?oauth=github&status=error&message=${encodeURIComponent(err.message)}`);
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
