const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export class RealtimeClient {
  constructor() {
    this.ws = null;
    this.eventSource = null;
    this.subscriptions = new Map(); // channel -> Set<callback>
    this.reconnectDelay = INITIAL_RECONNECT_DELAY;
    this.reconnectTimer = null;
    this.mode = null; // 'ws' or 'sse'
    this.state = 'disconnected'; // 'connected', 'reconnecting', 'disconnected'
    this.stateListeners = new Set();
  }

  connect() {
    this.tryWebSocket();
  }

  tryWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.mode = 'ws';
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
        this.setState('connected');
        // Send subscription for all current channels
        const channels = Array.from(this.subscriptions.keys());
        if (channels.length > 0) {
          this.ws.send(JSON.stringify({ type: 'subscribe', channels }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch(msg.channel, msg.data);
        } catch (e) {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.state !== 'disconnected') {
          this.setState('reconnecting');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
        // Fall back to SSE on first failure
        if (this.mode === null) {
          this.trySSE();
        }
      };
    } catch (e) {
      this.trySSE();
    }
  }

  trySSE() {
    try {
      const channels = Array.from(this.subscriptions.keys());
      const channelsParam = channels.length > 0 ? channels.join(',') : 'kpi,activity,notifications';
      const url = `/api/stream?channels=${channelsParam}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.mode = 'sse';
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
        this.setState('connected');
      };

      this.eventSource.addEventListener('kpi', (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch('kpi', msg.data);
        } catch (e) { /* ignore */ }
      });

      this.eventSource.addEventListener('activity', (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch('activity', msg.data);
        } catch (e) { /* ignore */ }
      });

      this.eventSource.addEventListener('notifications', (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch('notifications', msg.data);
        } catch (e) { /* ignore */ }
      });

      this.eventSource.onerror = () => {
        this.eventSource.close();
        this.eventSource = null;
        this.setState('reconnecting');
        this.scheduleReconnect();
      };
    } catch (e) {
      this.setState('disconnected');
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
      if (this.mode === 'sse') {
        this.trySSE();
      } else {
        this.tryWebSocket();
      }
    }, this.reconnectDelay);
  }

  subscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(callback);

    // Notify the server of new subscription if connected via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channels: [channel] }));
    }
  }

  unsubscribe(channel, callback) {
    const subs = this.subscriptions.get(channel);
    if (subs) {
      if (callback) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscriptions.delete(channel);
        }
      } else {
        this.subscriptions.delete(channel);
      }
    }
  }

  disconnect() {
    this.setState('disconnected');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  dispatch(channel, data) {
    const subs = this.subscriptions.get(channel);
    if (subs) {
      for (const cb of subs) {
        try {
          cb(data);
        } catch (e) {
          // Don't let one handler break others
        }
      }
    }
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    for (const listener of this.stateListeners) {
      try {
        listener(newState);
      } catch (e) { /* ignore */ }
    }
  }

  onStateChange(callback) {
    this.stateListeners.add(callback);
  }

  offStateChange(callback) {
    this.stateListeners.delete(callback);
  }
}
