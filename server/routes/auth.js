import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_DAYS = 7;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.display_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check if user exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
  ).run(email, passwordHash, name || null);

  const user = { id: result.lastInsertRowid, email, display_name: name || null };
  const token = generateToken(user);

  // Create refresh token
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, refreshToken, expiresAt);

  res.status(201).json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.display_name }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);

  // Create refresh token
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, refreshToken, expiresAt);

  res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.display_name }
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const stored = db.prepare(
    'SELECT rt.*, u.email, u.display_name FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = ?'
  ).get(refreshToken);

  if (!stored) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  if (new Date(stored.expires_at) < new Date()) {
    // Clean up expired token
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  // Rotate: delete old token and issue a new one
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

  const user = { id: stored.user_id, email: stored.email, display_name: stored.display_name };
  const token = generateToken(user);

  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, newRefreshToken, expiresAt);

  res.json({ token, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }

  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.display_name,
    created_at: user.created_at
  });
});

export default router;
