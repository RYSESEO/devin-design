/* ═══════════════════════════════════════════════════════════════
   Phase 4 — Churn Prediction Panel
   Customer risk levels, summary cards, at-risk list
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _churnFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _churnPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _churnEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Churn Panel Controller ═══ */
var ChurnPanel = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('churn-panel');
    if (!panel) return;
    panel.classList.add('ch-p-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadPredictions();
  },

  close: function() {
    var panel = document.getElementById('churn-panel');
    if (!panel) return;
    panel.classList.remove('ch-p-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('churn-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var seedBtn = document.getElementById('churn-seed-btn');
    if (seedBtn) {
      seedBtn.addEventListener('click', function() {
        seedBtn.disabled = true;
        seedBtn.textContent = 'Seeding...';
        var sampleCustomers = [
          { customer_email: 'alice@example.com', last_purchase_date: self._daysAgo(60), purchase_count: 5, total_spent: 450, avg_order_interval_days: 14 },
          { customer_email: 'bob@example.com', last_purchase_date: self._daysAgo(5), purchase_count: 12, total_spent: 1200, avg_order_interval_days: 10 },
          { customer_email: 'carol@example.com', last_purchase_date: self._daysAgo(45), purchase_count: 3, total_spent: 200, avg_order_interval_days: 20 },
          { customer_email: 'dave@example.com', last_purchase_date: self._daysAgo(90), purchase_count: 8, total_spent: 800, avg_order_interval_days: 15 },
          { customer_email: 'eve@example.com', last_purchase_date: self._daysAgo(2), purchase_count: 20, total_spent: 2500, avg_order_interval_days: 7 }
        ];

        Promise.all(sampleCustomers.map(function(c) {
          return _churnPost('/api/churn/customers', c);
        })).then(function() {
          seedBtn.textContent = 'Seed Demo Data';
          seedBtn.disabled = false;
          self.loadPredictions();
        }).catch(function() {
          seedBtn.textContent = 'Seed Demo Data';
          seedBtn.disabled = false;
        });
      });
    }
  },

  _daysAgo: function(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  },

  loadPredictions: function() {
    var self = this;
    _churnFetch('/api/churn/predictions').then(function(data) {
      self.renderSummary(data);
      self.renderTable(data);
    }).catch(function() {
      var el = document.getElementById('churn-summary');
      if (el) el.innerHTML = '<p class="churn-empty">No churn data available. Click "Seed Demo Data" to add customers.</p>';
    });
  },

  renderSummary: function(data) {
    var el = document.getElementById('churn-summary');
    if (!el) return;

    var predictions = data.predictions || [];
    var total = predictions.length;
    var high = 0, medium = 0, low = 0;
    predictions.forEach(function(p) {
      if (p.risk_level === 'high') high++;
      else if (p.risk_level === 'medium') medium++;
      else low++;
    });

    el.innerHTML = '<div class="churn-cards">' +
      '<div class="churn-card"><span class="churn-card-val">' + total + '</span><span class="churn-card-label">Total Customers</span></div>' +
      '<div class="churn-card churn-card-high"><span class="churn-card-val">' + high + '</span><span class="churn-card-label">High Risk</span></div>' +
      '<div class="churn-card churn-card-medium"><span class="churn-card-val">' + medium + '</span><span class="churn-card-label">Medium Risk</span></div>' +
      '<div class="churn-card churn-card-low"><span class="churn-card-val">' + low + '</span><span class="churn-card-label">Low Risk</span></div>' +
      '</div>';
  },

  renderTable: function(data) {
    var el = document.getElementById('churn-table-wrap');
    if (!el) return;

    var predictions = data.predictions || [];
    if (predictions.length === 0) {
      el.innerHTML = '<p class="churn-empty">No customer data.</p>';
      return;
    }

    var html = '<table class="churn-table"><thead><tr>' +
      '<th>Email</th><th>Risk Level</th><th>Days Since Purchase</th><th>Avg Interval</th><th>Total Spent</th>' +
      '</tr></thead><tbody>';

    predictions.forEach(function(c) {
      var badgeClass = 'churn-badge-' + (c.risk_level || 'low');
      var daysSince = c.days_since_purchase || 0;
      html += '<tr>' +
        '<td>' + _churnEscape(c.customer_email || '') + '</td>' +
        '<td><span class="churn-badge ' + badgeClass + '">' + _churnEscape(c.risk_level || 'low') + '</span></td>' +
        '<td>' + daysSince + '</td>' +
        '<td>' + (c.avg_order_interval_days || 0) + ' days</td>' +
        '<td>$' + (c.total_spent || 0).toFixed(2) + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    el.innerHTML = html;
  }
};

/* ═══ Global init function ═══ */
window.initChurn = function() {
  ChurnPanel.toggle();
  return true;
};
