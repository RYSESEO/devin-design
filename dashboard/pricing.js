/* ═══════════════════════════════════════════════════════════════
   Phase 4 — Pricing Optimization Panel
   Price A/B tests, recommendations, create test form
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _pricingFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _pricingPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _pricingEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Pricing Panel Controller ═══ */
var PricingPanel = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('pricing-panel');
    if (!panel) return;
    panel.classList.add('pr-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadTests();
    this.loadRecommendations();
  },

  close: function() {
    var panel = document.getElementById('pricing-panel');
    if (!panel) return;
    panel.classList.remove('pr-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('pr-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var form = document.getElementById('pr-create-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('pr-product-name').value.trim();
        var original = parseFloat(document.getElementById('pr-original-price').value);
        var test = parseFloat(document.getElementById('pr-test-price').value);
        if (!name || isNaN(original) || isNaN(test)) return;

        _pricingPost('/api/pricing/tests', {
          product_name: name,
          original_price: original,
          test_price: test
        }).then(function() {
          form.reset();
          self.loadTests();
        }).catch(function(err) {
          console.error('Failed to create test:', err);
        });
      });
    }
  },

  loadTests: function() {
    var self = this;
    _pricingFetch('/api/pricing/tests').then(function(data) {
      self.renderTests(data);
    }).catch(function() {
      var el = document.getElementById('pr-tests-list');
      if (el) el.innerHTML = '<p class="pr-empty">No price tests available.</p>';
    });
  },

  loadRecommendations: function() {
    var self = this;
    _pricingFetch('/api/pricing/recommendations').then(function(data) {
      self.renderRecommendations(data);
    }).catch(function() {
      var el = document.getElementById('pr-recommendations');
      if (el) el.innerHTML = '<p class="pr-empty">No recommendations available.</p>';
    });
  },

  renderTests: function(data) {
    var el = document.getElementById('pr-tests-list');
    if (!el) return;

    var tests = data.tests || data || [];
    if (!Array.isArray(tests)) tests = [];

    if (tests.length === 0) {
      el.innerHTML = '<p class="pr-empty">No active price tests. Create one below.</p>';
      return;
    }

    var html = '<div class="pr-tests">';
    tests.forEach(function(t) {
      var statusClass = t.status === 'active' ? 'pr-status-active' : 'pr-status-completed';
      html += '<div class="pr-test-card">' +
        '<div class="pr-test-info">' +
          '<span class="pr-test-name">' + _pricingEscape(t.product_name || 'Unknown') + '</span>' +
          '<span class="pr-test-prices">$' + (t.original_price || 0).toFixed(2) + ' &rarr; $' + (t.test_price || 0).toFixed(2) + '</span>' +
        '</div>' +
        '<span class="pr-status-badge ' + statusClass + '">' + _pricingEscape(t.status || 'active') + '</span>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  },

  renderRecommendations: function(data) {
    var el = document.getElementById('pr-recommendations');
    if (!el) return;

    var recs = data.recommendations || data || [];
    if (!Array.isArray(recs)) recs = [];

    if (recs.length === 0) {
      el.innerHTML = '<p class="pr-empty">Complete some price tests to get recommendations.</p>';
      return;
    }

    var html = '<div class="pr-recs">';
    recs.forEach(function(r) {
      var increase = r.expected_revenue_increase || 0;
      html += '<div class="pr-rec-card">' +
        '<div class="pr-rec-info">' +
          '<span class="pr-rec-product">' + _pricingEscape(r.product_name || 'Product') + '</span>' +
          '<span class="pr-rec-price">Recommended: $' + (r.recommended_price || 0).toFixed(2) + '</span>' +
        '</div>' +
        '<span class="pr-rec-increase">+' + increase.toFixed(1) + '% revenue</span>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }
};

/* ═══ Global init function ═══ */
window.initPricing = function() {
  PricingPanel.toggle();
  return true;
};
