/* ═══════════════════════════════════════════════════════════════
   Phase 5 — Benchmarks Panel
   Community benchmarks with percentile gauges and metric submission
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _benchFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _benchPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _benchEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Benchmarks Panel Controller ═══ */
var BenchmarksPanel = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('benchmarks-panel');
    if (!panel) return;
    panel.classList.add('bench-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadBenchmarks();
    this.loadStats();
  },

  close: function() {
    var panel = document.getElementById('benchmarks-panel');
    if (!panel) return;
    panel.classList.remove('bench-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('bench-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var submitBtn = document.getElementById('bench-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function() { self.submitMetrics(); });
    }
  },

  loadBenchmarks: function() {
    var self = this;
    _benchFetch('/api/benchmarks').then(function(data) {
      self.renderGauges(data.benchmarks || []);
    }).catch(function() {
      var el = document.getElementById('bench-gauges');
      if (el) el.innerHTML = '<p class="bench-empty">Submit your metrics to see benchmarks.</p>';
    });
  },

  loadStats: function() {
    var self = this;
    _benchFetch('/api/benchmarks/stats').then(function(data) {
      self.renderStats(data);
    }).catch(function() {
      var el = document.getElementById('bench-stats');
      if (el) el.innerHTML = '<p class="bench-empty">No community stats available yet.</p>';
    });
  },

  renderGauges: function(benchmarks) {
    var el = document.getElementById('bench-gauges');
    if (!el) return;

    if (!benchmarks.length) {
      el.innerHTML = '<p class="bench-empty">No benchmark data yet. Submit your metrics to see how you compare.</p>';
      return;
    }

    var html = '<div class="data-source-badge live" style="margin-bottom:10px">Your metrics vs community</div><div class="bench-gauge-grid">';
    benchmarks.forEach(function(b) {
      var percentile = b.percentile || 50;
      var topPercent = 100 - percentile;
      var colorClass = 'bench-gauge-red';
      if (topPercent <= 25) colorClass = 'bench-gauge-green';
      else if (topPercent <= 50) colorClass = 'bench-gauge-blue';
      else if (topPercent <= 75) colorClass = 'bench-gauge-amber';

      var fillWidth = Math.min(percentile, 100);

      html += '<div class="bench-gauge-card">' +
        '<h4 class="bench-gauge-label">' + _benchEscape(b.metric) + '</h4>' +
        '<div class="bench-gauge-bar">' +
          '<div class="bench-gauge-fill ' + colorClass + '" style="width:' + fillWidth + '%"></div>' +
        '</div>' +
        '<div class="bench-gauge-info">' +
          '<span class="bench-gauge-value">Your value: ' + (b.value || 0) + '</span>' +
          '<span class="bench-gauge-percentile ' + colorClass + '">Top ' + topPercent + '%</span>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  },

  renderStats: function(data) {
    var el = document.getElementById('bench-stats');
    if (!el) return;

    var stats = data.stats || [];
    if (!stats.length) {
      el.innerHTML = '<p class="bench-empty">No community averages available.</p>';
      return;
    }

    var html = '<div class="data-source-badge live" style="margin-bottom:10px">Community averages</div><div class="bench-stats-grid">';
    stats.forEach(function(s) {
      html += '<div class="bench-stat-card">' +
        '<span class="bench-stat-metric">' + _benchEscape(s.metric) + '</span>' +
        '<span class="bench-stat-avg">Avg: ' + (s.avg != null ? Number(s.avg).toFixed(2) : 'N/A') + '</span>' +
        '<span class="bench-stat-count">' + (s.count || 0) + ' participants</span>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  },

  submitMetrics: function() {
    var self = this;
    var revenueEl = document.getElementById('bench-revenue');
    var conversionEl = document.getElementById('bench-conversion');
    var trafficEl = document.getElementById('bench-traffic');

    var revenue = revenueEl ? parseFloat(revenueEl.value) : 0;
    var conversion = conversionEl ? parseFloat(conversionEl.value) : 0;
    var traffic = trafficEl ? parseFloat(trafficEl.value) : 0;

    var submitBtn = document.getElementById('bench-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

    var period = new Date().toISOString().slice(0, 7); // e.g. "2025-01"
    var metrics = [];
    if (revenue) metrics.push({ metric: 'revenue', value: revenue, period: period });
    if (conversion) metrics.push({ metric: 'conversion_rate', value: conversion, period: period });
    if (traffic) metrics.push({ metric: 'traffic', value: traffic, period: period });

    if (metrics.length === 0) {
      if (submitBtn) { submitBtn.textContent = 'Submit My Metrics'; submitBtn.disabled = false; }
      return;
    }

    _benchPost('/api/benchmarks/submit', { metrics: metrics }).then(function() {
      if (submitBtn) { submitBtn.textContent = 'Submitted!'; submitBtn.disabled = false; }
      setTimeout(function() { if (submitBtn) submitBtn.textContent = 'Submit My Metrics'; }, 2000);
      self.loadBenchmarks();
      self.loadStats();
    }).catch(function() {
      if (submitBtn) { submitBtn.textContent = 'Submit My Metrics'; submitBtn.disabled = false; }
    });
  }
};

/* ═══ Global init function ═══ */
window.initBenchmarks = function() {
  BenchmarksPanel.toggle();
  return true;
};
