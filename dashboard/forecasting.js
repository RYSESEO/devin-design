/* ═══════════════════════════════════════════════════════════════
   Phase 4 — Demand Forecasting Panel
   Demand prediction chart, trend indicators, seasonality breakdown
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _forecastFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _forecastPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _forecastEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Forecasting Panel Controller ═══ */
var ForecastingPanel = {
  isOpen: false,
  _initialized: false,
  _chart: null,

  open: function() {
    var panel = document.getElementById('forecasting-panel');
    if (!panel) return;
    panel.classList.add('fc-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadDemand();
  },

  close: function() {
    var panel = document.getElementById('forecasting-panel');
    if (!panel) return;
    panel.classList.remove('fc-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('fc-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var seedBtn = document.getElementById('fc-seed-btn');
    if (seedBtn) {
      seedBtn.addEventListener('click', function() {
        seedBtn.disabled = true;
        seedBtn.textContent = 'Seeding...';
        _forecastPost('/api/forecasting/orders', {}).then(function() {
          seedBtn.textContent = 'Load Demo Data';
          seedBtn.disabled = false;
          self.loadDemand();
        }).catch(function() {
          seedBtn.textContent = 'Load Demo Data';
          seedBtn.disabled = false;
        });
      });
    }
  },

  loadDemand: function() {
    var self = this;
    _forecastFetch('/api/forecasting/demand').then(function(data) {
      self.renderChart(data);
      self.renderTrend(data);
      self.renderSeasonality(data);
    }).catch(function(err) {
      var body = document.getElementById('fc-chart-wrap');
      if (body) body.innerHTML = '<p class="fc-empty">No forecast data available. Click "Load Demo Data" to seed orders.</p>';
    });
  },

  renderChart: function(data) {
    var wrap = document.getElementById('fc-chart-wrap');
    if (!wrap) return;

    var predictions = data.predictions || [];
    if (predictions.length === 0) {
      wrap.innerHTML = '<p class="fc-empty">No predictions available.</p>';
      return;
    }

    wrap.innerHTML = '<canvas id="fc-demand-canvas"></canvas>';
    var canvas = document.getElementById('fc-demand-canvas');
    if (!canvas || !window.Chart) return;

    var labels = predictions.map(function(p) { return p.date; });
    var values = predictions.map(function(p) { return Math.round(p.predicted_quantity); });

    if (this._chart) { this._chart.destroy(); this._chart = null; }

    this._chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Predicted Demand',
          data: values,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168,85,247,0.1)',
          fill: true,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#a855f7',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) { return 'Qty: ' + ctx.raw; }
            }
          }
        },
        scales: {
          x: { display: true, grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 10 } } }
        }
      }
    });
  },

  renderTrend: function(data) {
    var el = document.getElementById('fc-trend');
    if (!el) return;

    var trend = data.trend || {};
    var slope = trend.slope || 0;
    var direction = slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat';
    var arrow = direction === 'up' ? '&#x2191;' : direction === 'down' ? '&#x2193;' : '&#x2192;';
    var colorClass = direction === 'up' ? 'fc-trend-up' : direction === 'down' ? 'fc-trend-down' : 'fc-trend-flat';

    el.innerHTML = '<div class="fc-trend-indicator ' + colorClass + '">' +
      '<span class="fc-trend-arrow">' + arrow + '</span>' +
      '<span class="fc-trend-value">' + slope.toFixed(2) + ' units/day</span>' +
      '<span class="fc-trend-label">Trend Direction</span>' +
      '</div>';
  },

  renderSeasonality: function(data) {
    var el = document.getElementById('fc-seasonality');
    if (!el) return;

    var seasonality = data.seasonality || {};
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    var html = '<div class="fc-season-grid">';

    days.forEach(function(day, i) {
      var index = seasonality[dayKeys[i]] || 1.0;
      var intensity = Math.min(Math.max((index - 0.5) / 1.0, 0), 1);
      var bg = 'rgba(168,85,247,' + (intensity * 0.8 + 0.1).toFixed(2) + ')';
      html += '<div class="fc-season-cell" style="background:' + bg + '" title="Index: ' + index.toFixed(2) + '">' +
        '<span class="fc-season-day">' + day + '</span>' +
        '<span class="fc-season-val">' + index.toFixed(2) + '</span>' +
        '</div>';
    });

    html += '</div>';
    el.innerHTML = html;
  }
};

/* ═══ Global init function ═══ */
window.initForecasting = function() {
  ForecastingPanel.toggle();
  return true;
};
