import { Router } from 'express';
import { KpiStream, ActivityStream, NotificationStream } from '../ws/streams.js';
import { requireAuth } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const router = Router();

/**
 * Middleware that accepts auth via Authorization header or ?token= query param.
 * EventSource does not support custom headers, so token-in-query is the fallback.
 */
function requireAuthOrQueryToken(req, res, next) {
  // Try standard Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // Fallback: accept token from query parameter (for EventSource clients)
  const queryToken = req.query.token;
  if (queryToken) {
    try {
      const decoded = jwt.verify(queryToken, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
}

router.get('/api/stream', requireAuthOrQueryToken, (req, res) => {
  const channelsParam = req.query.channels || 'kpi,activity,notifications';
  const channels = channelsParam.split(',').map(c => c.trim());

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(':\n\n'); // Initial comment to establish connection

  const streams = [];

  function sendEvent(channel, data) {
    if (channels.includes(channel)) {
      res.write(`event: ${channel}\ndata: ${JSON.stringify({ channel, data })}\n\n`);
    }
  }

  if (channels.includes('kpi')) {
    const kpi = new KpiStream(sendEvent);
    kpi.start();
    streams.push(kpi);
  }

  if (channels.includes('activity')) {
    const activity = new ActivityStream(sendEvent);
    activity.start();
    streams.push(activity);
  }

  if (channels.includes('notifications')) {
    const notifications = new NotificationStream(sendEvent);
    notifications.start();
    streams.push(notifications);
  }

  // Send heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    for (const stream of streams) {
      stream.stop();
    }
  });
});

export default router;
