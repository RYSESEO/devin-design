/* ─── Chart.js Global Config ──────────────────────────────── */
Chart.defaults.color = '#71717a';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(9,9,11,0.92)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };

const COLORS = {
  accent:  '#a855f7',
  accent2: '#6366f1',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  pink:    '#ec4899',
  teal:    '#14b8a6',
};

const DAYS_7 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ─── Helpers ─────────────────────────────────────────────── */
function gradient(ctx, c1, c2, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h || 220);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

function fadeGradient(ctx, color, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h || 220);
  g.addColorStop(0, color + '44');
  g.addColorStop(1, color + '00');
  return g;
}

/* ─── KPI Counter Animation ──────────────────────────────── */
function animateCounters() {
  document.querySelectorAll('.kpi-value').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    const duration = 1600;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const val = Math.round(target * ease);
      el.textContent = prefix + val.toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ─── Agent Usage Chart (Area + Line) ─────────────────────── */
function initAgentChart() {
  const ctx = document.getElementById('chart-agent-usage').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: DAYS_7,
      datasets: [
        {
          label: 'Sessions',
          data: [142, 168, 195, 178, 210, 188, 203],
          borderColor: COLORS.accent,
          backgroundColor: fadeGradient(ctx, COLORS.accent),
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.accent,
        },
        {
          label: 'Tasks Completed',
          data: [98, 124, 156, 138, 172, 149, 168],
          borderColor: COLORS.accent2,
          backgroundColor: fadeGradient(ctx, COLORS.accent2),
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.accent2,
        },
        {
          label: 'PRs Merged',
          data: [12, 18, 24, 15, 28, 20, 22],
          borderColor: COLORS.green,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.green,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    },
  });

  const legend = document.getElementById('agent-legend');
  legend.innerHTML = `
    <span style="--c:${COLORS.accent}"><span style="background:${COLORS.accent}" class="legend-dot"></span>Sessions</span>
    <span style="--c:${COLORS.accent2}"><span style="background:${COLORS.accent2}" class="legend-dot"></span>Tasks</span>
    <span style="--c:${COLORS.green}"><span style="background:${COLORS.green}" class="legend-dot"></span>PRs Merged</span>
  `;
  legend.querySelectorAll('.legend-dot').forEach(d => {
    Object.assign(d.style, { width: '8px', height: '8px', borderRadius: '3px', display: 'inline-block' });
  });
}

/* ─── Lead Sources Donut ──────────────────────────────────── */
function initLeadSources() {
  const ctx = document.getElementById('chart-lead-sources').getContext('2d');
  const theme = document.documentElement.getAttribute('data-theme') || 'default';
  const donutBorder = (THEME_CHART_COLORS[theme] || THEME_CHART_COLORS.default).donutBorder;
  const data = [
    { label: 'Organic Search', value: 142, color: COLORS.accent },
    { label: 'Paid Ads', value: 78, color: COLORS.blue },
    { label: 'Referral', value: 62, color: COLORS.teal },
    { label: 'Social', value: 48, color: COLORS.pink },
    { label: 'Direct', value: 32, color: COLORS.amber },
  ];
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderColor: donutBorder,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} leads` } } },
    },
  });

  const legend = document.getElementById('lead-legend');
  legend.innerHTML = data.map(d => `<li style="--c:${d.color}"><span style="background:${d.color};width:8px;height:8px;border-radius:50%;display:inline-block"></span>${d.label}</li>`).join('');
}

/* ─── Shopify Chart (Bar + Line combo) ────────────────────── */
function initShopifyChart() {
  const ctx = document.getElementById('chart-shopify').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: DAYS_7,
      datasets: [
        {
          label: 'Orders',
          data: [42, 58, 65, 48, 72, 55, 61],
          backgroundColor: gradient(ctx, COLORS.accent + 'cc', COLORS.accent2 + '66'),
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.55,
          yAxisID: 'y',
        },
        {
          label: 'Revenue',
          type: 'line',
          data: [4200, 5800, 7150, 4800, 8400, 6100, 6800],
          borderColor: COLORS.green,
          backgroundColor: 'transparent',
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: COLORS.green,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { position: 'left', beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'Orders', color: '#71717a', font: { size: 10 } } },
        y1: { position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: 'Revenue ($)', color: '#71717a', font: { size: 10 } }, ticks: { callback: v => '$' + (v / 1000).toFixed(1) + 'k' } },
      },
    },
  });
}

/* ─── Content Performance Chart ───────────────────────────── */
function initContentChart() {
  const ctx = document.getElementById('chart-content').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: DAYS_7,
      datasets: [
        {
          label: 'Page Views',
          data: [8200, 9400, 14200, 11800, 16400, 15200, 14220],
          borderColor: COLORS.pink,
          backgroundColor: fadeGradient(ctx, COLORS.pink),
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: 'Engagement',
          data: [3200, 4100, 5800, 4600, 6200, 5800, 5400],
          borderColor: COLORS.amber,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => (v / 1000).toFixed(0) + 'k' } },
      },
    },
  });
}

/* ─── Token Usage Donut ───────────────────────────────────── */
function initTokenChart() {
  const ctx = document.getElementById('chart-tokens').getContext('2d');
  const theme = document.documentElement.getAttribute('data-theme') || 'default';
  const donutBorder = (THEME_CHART_COLORS[theme] || THEME_CHART_COLORS.default).donutBorder;
  const data = [
    { label: 'Claude 3.5', value: 840000, color: COLORS.accent },
    { label: 'GPT-4o', value: 520000, color: COLORS.green },
    { label: 'Claude 3 Haiku', value: 380000, color: COLORS.teal },
    { label: 'GPT-4o mini', value: 210000, color: COLORS.amber },
  ];
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderColor: donutBorder,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        tooltip: {
          callbacks: { label: c => `${c.label}: ${(c.raw / 1000).toFixed(0)}k tokens` },
        },
      },
    },
  });

  const legend = document.getElementById('token-legend');
  legend.innerHTML = data.map(d => `<li><span style="background:${d.color};width:8px;height:8px;border-radius:50%;display:inline-block"></span>${d.label} - ${(d.value / 1000).toFixed(0)}k</li>`).join('');
}

/* ─── Animate channel bars on scroll ──────────────────────── */
function initBarAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.setAttribute('data-visible', '');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.bar-fill[data-animate]').forEach(el => observer.observe(el));
}

/* ─── Period button toggle (handled by initDateControls now) ─ */
function initPeriodButtons() {
  /* Legacy — period buttons now managed by initDateControls */
}

/* ─── Theme Switcher ──────────────────────────────────────── */
const THEME_CHART_COLORS = {
  default: {
    gridColor: 'rgba(255,255,255,0.04)',
    tickColor: '#71717a',
    tooltipBg: 'rgba(9,9,11,0.92)',
    tooltipBorder: 'rgba(255,255,255,0.1)',
    donutBorder: '#09090b',
  },
  glass: {
    gridColor: 'rgba(0,0,0,0.06)',
    tickColor: '#6a6a8a',
    tooltipBg: 'rgba(255,255,255,0.85)',
    tooltipBorder: 'rgba(0,0,0,0.08)',
    donutBorder: '#e8ecf4',
  },
  brutalist: {
    gridColor: 'rgba(0,0,0,0.08)',
    tickColor: '#333333',
    tooltipBg: '#ffffff',
    tooltipBorder: '#000000',
    donutBorder: '#ffffff',
  },
  cyberpunk: {
    gridColor: 'rgba(0,255,200,0.06)',
    tickColor: '#406050',
    tooltipBg: 'rgba(10,10,15,0.95)',
    tooltipBorder: 'rgba(0,255,200,0.2)',
    donutBorder: '#0a0a0f',
  },
};

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'default') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', theme);
  }

  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active');

  const tc = THEME_CHART_COLORS[theme] || THEME_CHART_COLORS.default;
  Chart.defaults.color = tc.tickColor;
  Chart.defaults.borderColor = tc.gridColor;
  Chart.defaults.plugins.tooltip.backgroundColor = tc.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor = tc.tooltipBorder;

  if (theme === 'glass' || theme === 'brutalist') {
    Chart.defaults.plugins.tooltip.titleColor = '#1a1a2e';
    Chart.defaults.plugins.tooltip.bodyColor = '#333';
  } else if (theme === 'cyberpunk') {
    Chart.defaults.plugins.tooltip.titleColor = '#00ffc8';
    Chart.defaults.plugins.tooltip.bodyColor = '#80c0a0';
  } else {
    Chart.defaults.plugins.tooltip.titleColor = '#fafafa';
    Chart.defaults.plugins.tooltip.bodyColor = '#a1a1aa';
  }

  rebuildCharts(tc);
  localStorage.setItem('ryse-theme', theme);
}

function rebuildCharts(tc) {
  Chart.helpers.each(Chart.instances, chart => chart.destroy());

  initAgentChart();
  initLeadSources();
  initShopifyChart();
  initContentChart();
  initTokenChart();
}

function initThemeSwitcher() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  const saved = localStorage.getItem('ryse-theme');
  if (saved && saved !== 'default') {
    applyTheme(saved);
  }
}

/* ─── Command Palette ─────────────────────────────────────── */
const CMD_COMMANDS = [
  { group: 'Navigation', label: 'Jump to KPIs', hint: 'Agent sessions, revenue, leads, content', key: '1', icon: '#', action: () => scrollToSection('section-kpi') },
  { group: 'Navigation', label: 'Jump to Agent Usage', hint: 'Usage charts and trends', key: '2', icon: '\u25B6', action: () => scrollToSection('section-agent-usage') },
  { group: 'Navigation', label: 'Jump to Shopify', hint: 'Orders, revenue, products', key: '3', icon: '\u25B6', action: () => scrollToSection('section-shopify') },
  { group: 'Navigation', label: 'Jump to Activity', hint: 'Feed, products, pipeline', key: '4', icon: '\u25B6', action: () => scrollToSection('section-activity') },
  { group: 'Navigation', label: 'Jump to Content', hint: 'Channels, tokens, stats', key: '5', icon: '\u25B6', action: () => scrollToSection('section-content') },
  { group: 'Themes', label: 'Switch to Default', hint: 'Dark theme with ambient orbs', icon: '\u263E', action: () => applyTheme('default') },
  { group: 'Themes', label: 'Switch to Liquid Glass', hint: 'Frosted translucent cards', icon: '\u2B21', action: () => applyTheme('glass') },
  { group: 'Themes', label: 'Switch to Brutalist', hint: 'Monospace, high contrast', icon: '\u25A0', action: () => applyTheme('brutalist') },
  { group: 'Themes', label: 'Switch to Cyberpunk', hint: 'Neon cyan & magenta', icon: '\u26A1', action: () => applyTheme('cyberpunk') },
  { group: 'Actions', label: 'Toggle Notifications', hint: 'Open/close notification panel', key: 'N', icon: '\uD83D\uDD14', action: () => toggleNotifications() },
  { group: 'Actions', label: 'Export as PNG', hint: 'Capture dashboard screenshot', key: 'E', icon: '\uD83D\uDCE5', action: () => exportDashboard() },
  { group: 'Actions', label: 'Keyboard Shortcuts', hint: 'Show all shortcuts', key: '?', icon: '\u2328', action: () => openShortcuts() },
  { group: 'Actions', label: 'Cycle Theme', hint: 'Next theme in sequence', key: 'T', icon: '\uD83C\uDFA8', action: () => cycleTheme() },
  { group: 'Period', label: 'Set 7 Days', hint: 'Show last 7 days', icon: '\uD83D\uDCC5', action: () => setPeriod('7d') },
  { group: 'Period', label: 'Set 30 Days', hint: 'Show last 30 days', icon: '\uD83D\uDCC5', action: () => setPeriod('30d') },
  { group: 'Period', label: 'Set 90 Days', hint: 'Show last 90 days', icon: '\uD83D\uDCC5', action: () => setPeriod('90d') },
];

let cmdActiveIndex = 0;

function fuzzyMatch(query, text) {
  query = query.toLowerCase();
  text = text.toLowerCase();
  if (!query) return true;
  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

function renderCmdResults(query) {
  const results = document.getElementById('cmd-results');
  const filtered = CMD_COMMANDS.filter(c => fuzzyMatch(query, c.label + ' ' + c.hint));
  let html = '';
  let lastGroup = '';
  filtered.forEach((c, i) => {
    if (c.group !== lastGroup) {
      html += `<li class="cmd-group-label">${c.group}</li>`;
      lastGroup = c.group;
    }
    html += `<li class="cmd-result${i === 0 ? ' active' : ''}" data-index="${i}">
      <span class="cmd-result-icon">${c.icon}</span>
      <div class="cmd-result-text">
        <div class="cmd-result-label">${c.label}</div>
        <div class="cmd-result-hint">${c.hint}</div>
      </div>
      ${c.key ? `<span class="cmd-result-kbd">${c.key}</span>` : ''}
    </li>`;
  });
  results.innerHTML = html;
  cmdActiveIndex = 0;
  results.querySelectorAll('.cmd-result').forEach((el, i) => {
    el.addEventListener('click', () => { executeCmdResult(filtered[i]); });
    el.addEventListener('mouseenter', () => {
      results.querySelectorAll('.cmd-result').forEach(r => r.classList.remove('active'));
      el.classList.add('active');
      cmdActiveIndex = i;
    });
  });
  return filtered;
}

function executeCmdResult(cmd) {
  const dialog = document.getElementById('cmd-dialog');
  dialog.close();
  document.getElementById('cmd-input').value = '';
  if (cmd && cmd.action) cmd.action();
}

function openCommandPalette() {
  const dialog = document.getElementById('cmd-dialog');
  if (dialog.open) return;
  dialog.showModal();
  const input = document.getElementById('cmd-input');
  input.value = '';
  input.focus();
  renderCmdResults('');
}

function closeCommandPalette() {
  const dialog = document.getElementById('cmd-dialog');
  if (dialog.open) dialog.close();
}

function initCommandPalette() {
  const dialog = document.getElementById('cmd-dialog');
  const input = document.getElementById('cmd-input');
  const trigger = document.getElementById('cmd-trigger');

  trigger.addEventListener('click', openCommandPalette);

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeCommandPalette();
  });

  input.addEventListener('input', () => {
    renderCmdResults(input.value);
  });

  input.addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('.cmd-result');
    const filtered = CMD_COMMANDS.filter(c => fuzzyMatch(input.value, c.label + ' ' + c.hint));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdActiveIndex = Math.min(cmdActiveIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === cmdActiveIndex));
      items[cmdActiveIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdActiveIndex = Math.max(cmdActiveIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === cmdActiveIndex));
      items[cmdActiveIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeCmdResult(filtered[cmdActiveIndex]);
    }
  });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Keyboard Shortcuts ──────────────────────────────────── */
const THEME_ORDER = ['default', 'glass', 'brutalist', 'cyberpunk'];

function cycleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'default';
  const idx = THEME_ORDER.indexOf(current);
  const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
  applyTheme(next);
}

function openShortcuts() {
  const dialog = document.getElementById('shortcuts-dialog');
  if (!dialog.open) dialog.showModal();
}

function closeShortcuts() {
  const dialog = document.getElementById('shortcuts-dialog');
  if (dialog.open) dialog.close();
}

function setPeriod(period) {
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
}

function exportDashboard() {
  const main = document.querySelector('.dashboard');
  const link = document.createElement('a');
  if (typeof html2canvas !== 'undefined') {
    html2canvas(main).then(canvas => {
      link.href = canvas.toDataURL('image/png');
      link.download = 'ryse-dashboard.png';
      link.click();
    });
  } else {
    alert('Export: html2canvas not loaded. Dashboard screenshot would be generated here.');
  }
}

let hoveredWidget = null;

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const cmdDialog = document.getElementById('cmd-dialog');
    const shortcutsDialog = document.getElementById('shortcuts-dialog');

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    if (e.key === 'Escape') {
      if (typeof Ecosystem !== 'undefined' && Ecosystem.isOpen) { Ecosystem.close(); return; }
      if (typeof Intelligence !== 'undefined' && Intelligence.isOpen) { Intelligence.close(); return; }
      if (typeof Toolkit !== 'undefined' && Toolkit.isOpen) { Toolkit.close(); return; }
      if (typeof SettingsPanel !== 'undefined' && SettingsPanel.isOpen) { SettingsPanel.close(); return; }
      const focusOverlay = document.getElementById('focus-overlay');
      if (!focusOverlay.hidden) { closeFocusMode(); return; }
      if (cmdDialog.open) { closeCommandPalette(); return; }
      if (shortcutsDialog.open) { closeShortcuts(); return; }
      closeNotifications();
      return;
    }

    if (cmdDialog.open || shortcutsDialog.open) return;

    switch (e.key) {
      case 't': case 'T': cycleTheme(); break;
      case '1': scrollToSection('section-kpi'); break;
      case '2': scrollToSection('section-agent-usage'); break;
      case '3': scrollToSection('section-shopify'); break;
      case '4': scrollToSection('section-activity'); break;
      case '5': scrollToSection('section-content'); break;
      case 'n': case 'N': toggleNotifications(); break;
      case 'e': case 'E': exportDashboard(); break;
      case 's': case 'S': if (typeof SettingsPanel !== 'undefined') SettingsPanel.toggle(); break;
      case 'd': case 'D': if (typeof Toolkit !== 'undefined') Toolkit.toggle(); break;
      case 'i': case 'I': if (typeof Intelligence !== 'undefined') Intelligence.toggle(); break;
      case 'p': case 'P': if (typeof Ecosystem !== 'undefined') Ecosystem.toggle(); break;
      case '?': openShortcuts(); break;
      case 'f': case 'F':
        if (hoveredWidget) openFocusMode(hoveredWidget);
        break;
    }
  });

  document.querySelectorAll('[data-widget]').forEach(card => {
    card.addEventListener('mouseenter', () => { hoveredWidget = card.dataset.widget; });
    card.addEventListener('mouseleave', () => { hoveredWidget = null; });
  });

  const shortcutsDialog = document.getElementById('shortcuts-dialog');
  document.getElementById('shortcuts-close').addEventListener('click', closeShortcuts);
  shortcutsDialog.addEventListener('click', (e) => {
    if (e.target === shortcutsDialog) closeShortcuts();
  });
}

/* ─── Focus Mode ──────────────────────────────────────────── */
function openFocusMode(widgetId) {
  const card = document.querySelector(`[data-widget="${widgetId}"]`);
  if (!card) return;
  const overlay = document.getElementById('focus-overlay');
  const body = document.getElementById('focus-body');
  const title = document.getElementById('focus-title');

  const h3 = card.querySelector('.card-header h3');
  title.textContent = h3 ? h3.textContent : widgetId;

  const clone = card.cloneNode(true);
  clone.querySelector('.card-header')?.remove();
  clone.querySelector('.expand-btn')?.remove();
  clone.style.background = 'transparent';
  clone.style.border = 'none';
  clone.style.boxShadow = 'none';
  clone.style.padding = '0';
  clone.style.animation = 'none';

  body.innerHTML = '';
  body.appendChild(clone);

  const canvases = clone.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    const newCanvas = document.createElement('canvas');
    newCanvas.id = canvas.id + '-focus';
    canvas.replaceWith(newCanvas);
  });

  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  rebuildFocusCharts(widgetId, clone);
}

function rebuildFocusCharts(widgetId, container) {
  const theme = document.documentElement.getAttribute('data-theme') || 'default';
  const tc = THEME_CHART_COLORS[theme] || THEME_CHART_COLORS.default;

  if (widgetId === 'agent-usage') {
    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: DAYS_7,
          datasets: [
            { label: 'Sessions', data: [142, 168, 195, 178, 210, 188, 203], borderColor: COLORS.accent, backgroundColor: fadeGradient(ctx, COLORS.accent, 500), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: COLORS.accent },
            { label: 'Tasks Completed', data: [98, 124, 156, 138, 172, 149, 168], borderColor: COLORS.accent2, backgroundColor: fadeGradient(ctx, COLORS.accent2, 500), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: COLORS.accent2 },
            { label: 'PRs Merged', data: [12, 18, 24, 15, 28, 20, 22], borderColor: COLORS.green, backgroundColor: 'transparent', fill: false, tension: 0.4, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: COLORS.green },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: tc.gridColor } } } },
      });
    }
  } else if (widgetId === 'shopify') {
    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: DAYS_7,
          datasets: [
            { label: 'Orders', data: [42, 58, 65, 48, 72, 55, 61], backgroundColor: gradient(ctx, COLORS.accent + 'cc', COLORS.accent2 + '66', 500), borderRadius: 6, borderSkipped: false, barPercentage: 0.55, yAxisID: 'y' },
            { label: 'Revenue', type: 'line', data: [4200, 5800, 7150, 4800, 8400, 6100, 6800], borderColor: COLORS.green, backgroundColor: 'transparent', tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: COLORS.green, yAxisID: 'y1' },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, grid: { color: tc.gridColor } }, y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { callback: v => '$' + (v / 1000).toFixed(1) + 'k' } } } },
      });
    }
  } else if (widgetId === 'content-perf') {
    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: DAYS_7,
          datasets: [
            { label: 'Page Views', data: [8200, 9400, 14200, 11800, 16400, 15200, 14220], borderColor: COLORS.pink, backgroundColor: fadeGradient(ctx, COLORS.pink, 500), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7 },
            { label: 'Engagement', data: [3200, 4100, 5800, 4600, 6200, 5800, 5400], borderColor: COLORS.amber, backgroundColor: 'transparent', fill: false, tension: 0.4, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 4, pointHoverRadius: 7 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: tc.gridColor }, ticks: { callback: v => (v / 1000).toFixed(0) + 'k' } } } },
      });
    }
  } else if (widgetId === 'lead-sources') {
    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (ctx) {
      const data = [
        { label: 'Organic Search', value: 142, color: COLORS.accent },
        { label: 'Paid Ads', value: 78, color: COLORS.blue },
        { label: 'Referral', value: 62, color: COLORS.teal },
        { label: 'Social', value: 48, color: COLORS.pink },
        { label: 'Direct', value: 32, color: COLORS.amber },
      ];
      new Chart(ctx, { type: 'doughnut', data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color), borderColor: tc.donutBorder, borderWidth: 3, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%' } });
    }
  } else if (widgetId === 'tokens') {
    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (ctx) {
      const data = [
        { label: 'Claude 3.5', value: 840000, color: COLORS.accent },
        { label: 'GPT-4o', value: 520000, color: COLORS.green },
        { label: 'Claude 3 Haiku', value: 380000, color: COLORS.teal },
        { label: 'GPT-4o mini', value: 210000, color: COLORS.amber },
      ];
      new Chart(ctx, { type: 'doughnut', data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color), borderColor: tc.donutBorder, borderWidth: 3, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%' } });
    }
  }
}

function closeFocusMode() {
  const overlay = document.getElementById('focus-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  const body = document.getElementById('focus-body');
  const canvases = body.querySelectorAll('canvas');
  canvases.forEach(c => {
    const chartInstance = Chart.getChart(c);
    if (chartInstance) chartInstance.destroy();
  });
  body.innerHTML = '';
}

function initFocusMode() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const widgetId = btn.dataset.expand;
      openFocusMode(widgetId);
    });
  });
  document.getElementById('focus-close').addEventListener('click', closeFocusMode);
}

/* ─── Notification Center ─────────────────────────────────── */
const NOTIFICATIONS = [
  { type: 'success', icon: '\u2705', title: 'Revenue Milestone', msg: 'Shopify revenue crossed $45k this week \u2014 new record!', time: '5 min ago' },
  { type: 'warning', icon: '\u26A0\uFE0F', title: 'Lead Volume Drop', msg: 'New leads down 12% vs previous week. Paid ads underperforming.', time: '1h ago' },
  { type: 'info', icon: '\uD83E\uDD16', title: 'Agent Milestone', msg: 'Devin completed 156 tasks and merged 23 PRs this period.', time: '2h ago' },
  { type: 'alert', icon: '\uD83D\uDEA8', title: 'Conversion Alert', msg: 'SEO Audit Pro conversion dropped from 82% to 72%.', time: '3h ago' },
  { type: 'success', icon: '\uD83D\uDCC8', title: 'Content Spike', msg: 'Blog views up 31% this week. Top post: "2025 SEO Guide".', time: '4h ago' },
];

let notifOpen = false;

function renderNotifications() {
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  const empty = document.getElementById('notif-empty');

  if (NOTIFICATIONS.length === 0) {
    list.innerHTML = '';
    badge.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  badge.hidden = false;
  badge.textContent = NOTIFICATIONS.length;

  list.innerHTML = NOTIFICATIONS.map((n, i) => `
    <li class="notif-item" data-index="${i}">
      <span class="notif-icon ${n.type}">${n.icon}</span>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </li>
  `).join('');
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  notifOpen = !notifOpen;
  panel.hidden = !notifOpen;
}

function closeNotifications() {
  const panel = document.getElementById('notif-panel');
  notifOpen = false;
  panel.hidden = true;
}

function initNotifications() {
  const bell = document.getElementById('notif-bell');
  const clear = document.getElementById('notif-clear');
  const wrap = document.getElementById('notif-wrap');

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotifications();
  });

  clear.addEventListener('click', () => {
    NOTIFICATIONS.length = 0;
    renderNotifications();
  });

  document.addEventListener('click', (e) => {
    if (notifOpen && !wrap.contains(e.target)) {
      closeNotifications();
    }
  });

  renderNotifications();
}

/* ─── Date Range Picker ───────────────────────────────────── */
let customRangeOpen = false;

function initDateControls() {
  const customBtn = document.getElementById('custom-range-btn');
  const dropdown = document.getElementById('custom-range-dropdown');
  const applyBtn = document.getElementById('range-apply');
  const compareBtn = document.getElementById('compare-toggle');
  const wrap = document.getElementById('custom-range-wrap');

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  document.getElementById('date-from').value = weekAgo.toISOString().split('T')[0];
  document.getElementById('date-to').value = today.toISOString().split('T')[0];

  customBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    customRangeOpen = !customRangeOpen;
    dropdown.hidden = !customRangeOpen;
  });

  applyBtn.addEventListener('click', () => {
    const from = document.getElementById('date-from').value;
    const to = document.getElementById('date-to').value;
    if (from && to) {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      customBtn.classList.add('active');
      customRangeOpen = false;
      dropdown.hidden = true;
    }
  });

  compareBtn.addEventListener('click', () => {
    compareBtn.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (customRangeOpen && !wrap.contains(e.target)) {
      customRangeOpen = false;
      dropdown.hidden = true;
    }
  });

  document.querySelectorAll('.date-controls .period-btn:not(#custom-range-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customRangeOpen = false;
      dropdown.hidden = true;
    });
  });
}

/* ─── Auto-Detect Color Scheme ────────────────────────────── */
function initAutoDetect() {
  const saved = localStorage.getItem('ryse-theme');
  if (saved) return;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('glass');
  }
}

/* ─── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  animateCounters();
  initAgentChart();
  initLeadSources();
  initShopifyChart();
  initContentChart();
  initTokenChart();
  initBarAnimations();
  initPeriodButtons();
  initThemeSwitcher();
  initCommandPalette();
  initKeyboardShortcuts();
  initFocusMode();
  initNotifications();
  initDateControls();
  initAutoDetect();
  if (typeof initConnectors === 'function') initConnectors();
  if (typeof initToolkit === 'function') initToolkit();
  if (typeof initIntelligence === 'function') initIntelligence();
  if (typeof initEcosystem === 'function') initEcosystem();
});
