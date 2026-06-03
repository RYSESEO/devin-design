// State synchronization module
// Syncs state between browser (localStorage) and server when authenticated

import { getToken, isAuthenticated } from './auth.js';
import { API_BASE_URL } from './config.js';

const DEBOUNCE_MS = 500;
const debounceTimers = {};

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Debounced PUT to server for a given state key.
 * Silently fails if offline or unauthenticated.
 */
export function syncToServer(key, value) {
  if (!isAuthenticated()) return;

  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/state/${key}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(key === 'layout' ? { layout: value } : value)
      });
    } catch {
      // Silent fail if offline
    }
  }, DEBOUNCE_MS);
}

/**
 * Load all persisted state from the server.
 * Called on login/session restore.
 * @returns {object|null} Full state object or null on failure
 */
export async function loadFromServer() {
  if (!isAuthenticated()) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/state`, {
      headers: authHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Save layout to localStorage AND sync to server if authenticated.
 */
export function saveLayout(layout) {
  try {
    localStorage.setItem('ryse-layout', JSON.stringify(layout));
  } catch {
    // ignore
  }
  syncToServer('layout', layout);
}

/**
 * Save preferences to localStorage AND sync to server if authenticated.
 */
export function savePreferences(prefs) {
  try {
    localStorage.setItem('ryse-preferences', JSON.stringify(prefs));
  } catch {
    // ignore
  }
  syncToServer('preferences', prefs);
}

/**
 * Save connector configuration server-side (credentials go to the server only).
 */
export async function saveConnectorConfig(connectorId, credentials) {
  if (!isAuthenticated()) return;

  try {
    await fetch(`${API_BASE_URL}/api/state/connectors`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ connectorId, credentials })
    });
  } catch {
    // Silent fail
  }
}

/**
 * Load chat history from server.
 * @returns {Array} messages
 */
export async function loadChatHistory() {
  if (!isAuthenticated()) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/state/chat-history`, {
      headers: authHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Save a chat message to the server.
 */
export async function saveChatMessage(role, content) {
  if (!isAuthenticated()) return;

  try {
    await fetch(`${API_BASE_URL}/api/state/chat-history`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ role, content })
    });
  } catch {
    // Silent fail
  }
}
