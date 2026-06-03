import { Router } from 'express';
import { KpiStream, ActivityStream, NotificationStream } from '../ws/streams.js';

const router = Router();

router.get('/api/stream', (req, res) => {
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
