// Client-side auth module
// JWT stored in memory (not localStorage) for XSS safety
// Refresh token stored in localStorage (less sensitive)

let currentToken = null;
let currentUser = null;
let refreshTimer = null;

const REFRESH_TOKEN_KEY = 'ryse_refresh_token';

function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

function parseJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // convert to ms
  } catch {
    return 0;
  }
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  if (!currentToken) return;

  const expiry = parseJwtExpiry(currentToken);
  // Refresh 5 minutes before expiry
  const refreshAt = expiry - Date.now() - 5 * 60 * 1000;
  if (refreshAt <= 0) {
    // Already past refresh window, refresh now
    refreshToken();
    return;
  }

  refreshTimer = setTimeout(() => {
    refreshToken();
  }, refreshAt);
}

export async function register(email, password, name) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  currentToken = data.token;
  currentUser = data.user;
  storeRefreshToken(data.refreshToken);
  scheduleRefresh();
  return data.user;
}

export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  currentToken = data.token;
  currentUser = data.user;
  storeRefreshToken(data.refreshToken);
  scheduleRefresh();
  return data.user;
}

export async function logout() {
  const storedRefresh = getStoredRefreshToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh })
    });
  } catch {
    // Ignore network errors on logout
  }

  currentToken = null;
  currentUser = null;
  storeRefreshToken(null);
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  window.location.reload();
}

export async function refreshToken() {
  const storedRefresh = getStoredRefreshToken();
  if (!storedRefresh) {
    currentToken = null;
    currentUser = null;
    return null;
  }

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh })
    });

    if (!res.ok) {
      storeRefreshToken(null);
      currentToken = null;
      currentUser = null;
      return null;
    }

    const data = await res.json();
    currentToken = data.token;
    scheduleRefresh();
    return data.token;
  } catch {
    return null;
  }
}

export function getUser() {
  return currentUser;
}

export function getToken() {
  return currentToken;
}

export function isAuthenticated() {
  return currentToken !== null && currentUser !== null;
}

// Try to restore session from stored refresh token
export async function restoreSession() {
  const storedRefresh = getStoredRefreshToken();
  if (!storedRefresh) return false;

  const token = await refreshToken();
  if (!token) return false;

  // Fetch user profile
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      currentToken = null;
      storeRefreshToken(null);
      return false;
    }
    const user = await res.json();
    currentUser = { id: user.id, email: user.email, name: user.name };
    return true;
  } catch {
    currentToken = null;
    storeRefreshToken(null);
    return false;
  }
}
