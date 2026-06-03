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

/* ─── Period button toggle ────────────────────────────────── */
function initPeriodButtons() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
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
});
