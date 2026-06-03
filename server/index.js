import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createWebSocketServer } from './ws/index.js';
import { KpiStream, ActivityStream, NotificationStream } from './ws/streams.js';
import streamRouter from './routes/stream.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

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

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start data streams (only in non-test environment)
let kpiStream, activityStream, notificationStream;
if (process.env.NODE_ENV !== 'test') {
  kpiStream = new KpiStream(broadcast);
  activityStream = new ActivityStream(broadcast);
  notificationStream = new NotificationStream(broadcast);
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
