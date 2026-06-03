// Vite entry point
// Import Chart.js from npm and expose it globally for backward compatibility
import Chart from 'chart.js/auto';
import { RealtimeClient } from './lib/realtime.js';
import { GridLayout } from './lib/grid-layout.js';
import { loadLayout } from './lib/layout-store.js';
import { login, register, logout, isAuthenticated, getUser, restoreSession } from './lib/auth.js';

window.Chart = Chart;

// Initialize realtime client after DOM is ready
function initRealtime() {
  const client = new RealtimeClient();

  // KPI updates
  client.subscribe('kpi', (data) => {
    updateKpiValue(data);
  });

  // Activity feed updates
  client.subscribe('activity', (data) => {
    prependActivityItem(data);
  });

  // Notification updates
  client.subscribe('notifications', (data) => {
    showNotification(data);
  });

  // Connection status indicator
  client.onStateChange((state) => {
    updateLiveIndicator(state);
  });

  client.connect();
  window.__realtimeClient = client;
}

function updateKpiValue(data) {
  const metricMap = {
    agents: 0,
    revenue: 1,
    leads: 2,
    views: 3
  };

  const index = metricMap[data.metric];
  if (index === undefined) return;

  const cards = document.querySelectorAll('.kpi-card');
  const card = cards[index];
  if (!card) return;

  const valueEl = card.querySelector('.kpi-value');
  const deltaEl = card.querySelector('.kpi-delta');
  if (!valueEl) return;

  // Animate from current to new value
  const prefix = data.prefix || '';
  const currentText = valueEl.textContent.replace(/[^0-9]/g, '');
  const current = parseInt(currentText, 10) || 0;
  const target = data.value;

  animateValue(valueEl, current, target, prefix);

  // Update delta
  if (deltaEl) {
    deltaEl.textContent = data.deltaPercent;
    deltaEl.className = 'kpi-delta ' + (data.delta.startsWith('+') ? 'positive' : 'negative');
  }

  // Pulse animation on card
  card.classList.add('kpi-card-pulse');
  setTimeout(() => {
    card.classList.remove('kpi-card-pulse');
  }, 600);
}

function animateValue(el, from, to, prefix) {
  const duration = 400;
  const start = performance.now();
  const diff = to - from;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + diff * eased);
    el.textContent = prefix + current.toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function prependActivityItem(data) {
  const feed = document.getElementById('agent-feed');
  if (!feed) return;

  const li = document.createElement('li');
  li.className = 'feed-item feed-item-enter';

  const targetHtml = data.target ? ` <code>${data.target}</code>` : '';
  li.innerHTML = `
    <span class="feed-dot dot-${data.dotColor}"></span>
    <div class="feed-body">
      <strong>${data.agent}</strong> ${data.action}${targetHtml}
      <time>${data.time}</time>
    </div>
  `;

  feed.insertBefore(li, feed.firstChild);

  // Remove enter animation class after animation completes
  setTimeout(() => {
    li.classList.remove('feed-item-enter');
  }, 500);

  // Cap visible items at 10
  const items = feed.querySelectorAll('.feed-item');
  if (items.length > 10) {
    for (let i = 10; i < items.length; i++) {
      items[i].remove();
    }
  }
}

function showNotification(data) {
  // Show toast notification in bottom-right
  showToast(data);

  // Update notification badge if it exists
  const badge = document.querySelector('.notification-badge, .notif-count');
  if (badge) {
    const current = parseInt(badge.textContent, 10) || 0;
    badge.textContent = current + 1;
    badge.style.display = 'flex';
  }
}

function showToast(data) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification toast-enter';
  toast.innerHTML = `
    <span class="toast-icon">${data.icon}</span>
    <div class="toast-content">
      <strong class="toast-title">${data.title}</strong>
      <p class="toast-msg">${data.msg}</p>
    </div>
  `;

  container.appendChild(toast);

  // Remove enter class after animation
  setTimeout(() => {
    toast.classList.remove('toast-enter');
  }, 300);

  // Auto-dismiss after 5s
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

function updateLiveIndicator(state) {
  const indicator = document.querySelector('.live-indicator');
  if (!indicator) return;

  const dot = indicator.querySelector('.live-dot');
  const textNode = indicator.childNodes[indicator.childNodes.length - 1];

  // Remove previous state classes
  indicator.classList.remove('live-state-connected', 'live-state-reconnecting', 'live-state-disconnected');

  switch (state) {
    case 'connected':
      indicator.classList.add('live-state-connected');
      if (dot) dot.className = 'live-dot';
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ' Live';
      }
      break;
    case 'reconnecting':
      indicator.classList.add('live-state-reconnecting');
      if (dot) dot.className = 'live-dot live-dot-amber';
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ' Reconnecting';
      }
      break;
    case 'disconnected':
      indicator.classList.add('live-state-disconnected');
      if (dot) dot.className = 'live-dot live-dot-red';
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ' Offline';
      }
      break;
  }
}

// Initialize layout manager
function initGridLayout() {
  const grid = new GridLayout('.dashboard');
  grid.bindKeyboard();

  // Apply saved layout
  const savedLayout = loadLayout();
  if (savedLayout) {
    grid.applyLayout(savedLayout);
  }

  // Wire toggle button
  const toggleBtn = document.getElementById('layout-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      grid.toggle();
    });
  }

  window.__gridLayout = grid;
}

// ═══ Auth UI Logic ═══
let authMode = 'login'; // 'login' or 'register'

function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showUserMenu(user) {
  const menu = document.getElementById('user-menu');
  const avatar = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  if (!menu) return;

  menu.hidden = false;
  const displayName = user.name || user.email.split('@')[0];
  if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = displayName;
}

function initAuthUI() {
  const form = document.getElementById('auth-form');
  const switchBtn = document.getElementById('auth-switch-btn');
  const switchText = document.getElementById('auth-switch-text');
  const title = document.getElementById('auth-title');
  const nameField = document.getElementById('auth-name-field');
  const submitBtn = document.getElementById('auth-submit');
  const errorEl = document.getElementById('auth-error');
  const userBtn = document.getElementById('user-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const logoutBtn = document.getElementById('user-logout');

  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      authMode = authMode === 'login' ? 'register' : 'login';
      if (authMode === 'register') {
        title.textContent = 'Create Account';
        nameField.style.display = 'block';
        submitBtn.textContent = 'Create Account';
        switchText.textContent = 'Already have an account?';
        switchBtn.textContent = 'Sign in';
      } else {
        title.textContent = 'Sign In';
        nameField.style.display = 'none';
        submitBtn.textContent = 'Sign In';
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = 'Create one';
      }
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = '';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const name = document.getElementById('auth-name').value.trim();

      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = '';
      }

      try {
        let user;
        if (authMode === 'register') {
          user = await register(email, password, name);
        } else {
          user = await login(email, password);
        }
        hideAuthOverlay();
        showUserMenu(user);
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
        }
      }
    });
  }

  // User menu dropdown toggle
  if (userBtn) {
    userBtn.addEventListener('click', () => {
      if (userDropdown) userDropdown.hidden = !userDropdown.hidden;
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (userDropdown && !userDropdown.hidden) {
      const menu = document.getElementById('user-menu');
      if (menu && !menu.contains(e.target)) {
        userDropdown.hidden = true;
      }
    }
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }
}

async function initApp() {
  initAuthUI();

  // Try to restore session
  const restored = await restoreSession();
  if (restored && isAuthenticated()) {
    hideAuthOverlay();
    showUserMenu(getUser());
  } else {
    showAuthOverlay();
  }

  // Always initialize dashboard features (they show beneath auth overlay)
  initRealtime();
  initGridLayout();
}

// Start after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
