import { WebSocketServer } from 'ws';

const HEARTBEAT_INTERVAL = 30000;

export function createWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  let heartbeatTimer = null;

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      for (const client of clients) {
        if (!client.isAlive) {
          client.terminate();
          clients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ping();
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function broadcast(channel, data) {
    const message = JSON.stringify({ channel, data });
    for (const client of clients) {
      if (client.readyState === 1 && client.subscribedChannels.has(channel)) {
        client.send(message);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.subscribedChannels = new Set();
    clients.add(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
          for (const ch of msg.channels) {
            ws.subscribedChannels.add(ch);
          }
        } else if (msg.type === 'unsubscribe' && Array.isArray(msg.channels)) {
          for (const ch of msg.channels) {
            ws.subscribedChannels.delete(ch);
          }
        }
      } catch (e) {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  startHeartbeat();

  return { wss, clients, broadcast, stopHeartbeat };
}
