import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createWebSocketServer } from './ws/index.js';
import { KpiStream, ActivityStream, NotificationStream, AlertStream } from './ws/streams.js';
import streamRouter from './routes/stream.js';
import authRouter from './routes/auth.js';
import stateRouter from './routes/state.js';
import proxyRouter from './routes/proxy.js';
import oauthRouter from './routes/oauth.js';
import intelligenceRouter from './routes/intelligence.js';
import automationsRouter from './routes/automations.js';
import storesRouter from './routes/stores.js';
import workspacesRouter from './routes/workspaces.js';
import reportsRouter from './routes/reports.js';
import billingRouter from './routes/billing.js';
import forecastingRouter from './routes/forecasting.js';
import seoRouter from './routes/seo.js';
import pricingRouter from './routes/pricing.js';
import churnRouter from './routes/churn.js';
import competitorsRouter from './routes/competitors.js';
import { optionalAuth } from './middleware/auth.js';
import db from './db/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting for auth endpoints
// NOTE: This rate limiter is in-process (plain Map) and resets on server restart.
// It does not persist across deploys or work across multiple instances.
// This is acceptable for a single-container SQLite deployment. If the app is
// horizontally scaled, replace with a durable store (e.g., Redis or SQLite-backed).
const authAttempts = new Map(); // key: IP, value: { count, resetTime }

function rateLimitAuth(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxAttempts = 5;

  const entry = authAttempts.get(ip);
  if (entry) {
    if (now > entry.resetTime) {
      authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (entry.count >= maxAttempts) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    } else {
      entry.count++;
    }
  } else {
    authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
  }
  next();
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttempts) {
    if (now > entry.resetTime) {
      authAttempts.delete(ip);
    }
  }
}, 300000);

// Clean up expired refresh tokens every hour (Issue: stale tokens accumulate)
setInterval(() => {
  try {
    db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
  } catch {
    // Silently ignore cleanup errors (e.g., during shutdown)
  }
}, 3600000);

// Clean up expired OAuth state nonces every 5 minutes
setInterval(() => {
  try {
    db.prepare("DELETE FROM oauth_states WHERE expires_at < datetime('now')").run();
  } catch { /* ignore */ }
}, 300000);

// Middleware
if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
  console.warn('[SECURITY WARNING] ENCRYPTION_KEY not set. Falling back to JWT_SECRET for encryption. Set a separate ENCRYPTION_KEY in production.');
}

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: corsOrigin !== '*' }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      formAction: ["'self'", "https://*.myshopify.com", "https://github.com"],
    }
  }
}));
app.use(cookieParser());
app.use(express.json({ limit: '16kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (with rate limiting on login/register)
app.use('/api/auth/login', rateLimitAuth);
app.use('/api/auth/register', rateLimitAuth);
app.use('/api/auth', authRouter);

// State routes (require auth - handled inside router)
app.use('/api/state', stateRouter);

// Proxy routes (require auth - handled inside router)
app.use('/api/proxy', proxyRouter);

// OAuth routes (require auth - handled inside router)
app.use('/api/oauth', oauthRouter);

// Intelligence routes (require auth - handled inside router)
app.use('/api/intelligence', intelligenceRouter);

// Automations routes (require auth - handled inside router)
app.use('/api/automations', automationsRouter);

// Stores routes (require auth - handled inside router)
app.use('/api/stores', storesRouter);

// Workspaces routes (require auth - handled inside router)
app.use('/api/workspaces', workspacesRouter);

// Reports routes (require auth - handled inside router)
app.use('/api/reports', reportsRouter);

// Billing routes (require auth - handled inside router)
app.use('/api/billing', billingRouter);

// Forecasting routes (require auth - handled inside router)
app.use('/api/forecasting', forecastingRouter);

// SEO routes (require auth - handled inside router)
app.use('/api/seo', seoRouter);

// Pricing routes (require auth - handled inside router)
app.use('/api/pricing', pricingRouter);

// Churn routes (require auth - handled inside router)
app.use('/api/churn', churnRouter);

// Competitors routes (require auth - handled inside router)
app.use('/api/competitors', competitorsRouter);

// Optional auth for other routes
app.use(optionalAuth);

// SSE stream route
app.use(streamRouter);

// Serve static files in production
const clientPath = path.join(__dirname, '..', 'dist', 'client');
app.use(express.static(clientPath));

// SPA fallback in production
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server setup
const { wss, broadcast, stopHeartbeat } = createWebSocketServer();

// Expose broadcast for use in route handlers (e.g., alert triggering)
app.locals.broadcast = broadcast;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

server.on('upgrade', (request, socket, head) => {
  if (request.url && request.url.startsWith('/ws')) {
    // Verify token from query string: /ws?token=<jwt>
    let token = null;
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      token = url.searchParams.get('token');
    } catch {
      // Malformed URL
    }

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start data streams (only in non-test environment)
let kpiStream, activityStream, notificationStream, alertStream;
if (process.env.NODE_ENV !== 'test') {
  kpiStream = new KpiStream(broadcast);
  activityStream = new ActivityStream(broadcast);
  notificationStream = new NotificationStream(broadcast);
  alertStream = new AlertStream(broadcast);
  kpiStream.start();
  activityStream.start();
  notificationStream.start();
}

// Start server only when not imported for testing
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app, server, broadcast, stopHeartbeat };
