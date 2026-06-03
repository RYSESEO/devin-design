/* ═══════════════════════════════════════════════════════════════
   Phase 4 — Competitor Movement Alerts Panel
   Tracked competitors, recent changes feed, add competitor form
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _compFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _compPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _compEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Competitor Alerts Panel Controller ═══ */
var CompetitorAlertsPanel = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('competitor-alerts-panel');
    if (!panel) return;
    panel.classList.add('comp-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadCompetitors();
  },

  close: function() {
    var panel = document.getElementById('competitor-alerts-panel');
    if (!panel) return;
    panel.classList.remove('comp-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('comp-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var form = document.getElementById('comp-add-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('comp-name').value.trim();
        var domain = document.getElementById('comp-domain').value.trim();
        if (!name || !domain) return;

        _compPost('/api/competitors', { name: name, domain: domain }).then(function() {
          form.reset();
          self.loadCompetitors();
        }).catch(function(err) {
          console.error('Failed to add competitor:', err);
        });
      });
    }
  },

  loadCompetitors: function() {
    var self = this;
    _compFetch('/api/competitors').then(function(data) {
      self.renderCompetitors(data);
      self.renderChanges(data);
    }).catch(function() {
      var el = document.getElementById('comp-list');
      if (el) el.innerHTML = '<p class="comp-empty">No competitors tracked.</p>';
    });
  },

  renderCompetitors: function(data) {
    var el = document.getElementById('comp-list');
    if (!el) return;
    var self = this;

    var competitors = data.competitors || data || [];
    if (!Array.isArray(competitors)) competitors = [];

    if (competitors.length === 0) {
      el.innerHTML = '<p class="comp-empty">No competitors tracked yet. Add one below.</p>';
      return;
    }

    var html = '<div class="comp-items">';
    competitors.forEach(function(c) {
      var lastChecked = c.last_checked ? new Date(c.last_checked).toLocaleDateString() : 'Never';
      html += '<div class="comp-item">' +
        '<div class="comp-item-info">' +
          '<span class="comp-item-name">' + _compEscape(c.name || '') + '</span>' +
          '<span class="comp-item-domain">' + _compEscape(c.domain || '') + '</span>' +
          '<span class="comp-item-checked">Last checked: ' + lastChecked + '</span>' +
        '</div>' +
        '<button class="comp-check-btn" data-comp-id="' + c.id + '">Check Now</button>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    // Bind check buttons
    el.querySelectorAll('.comp-check-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-comp-id');
        btn.disabled = true;
        btn.textContent = 'Checking...';
        _compPost('/api/competitors/' + id + '/check', {}).then(function() {
          btn.textContent = 'Check Now';
          btn.disabled = false;
          self.loadCompetitors();
        }).catch(function() {
          btn.textContent = 'Check Now';
          btn.disabled = false;
        });
      });
    });
  },

  renderChanges: function(data) {
    var el = document.getElementById('comp-changes-feed');
    if (!el) return;

    var competitors = data.competitors || data || [];
    if (!Array.isArray(competitors)) competitors = [];

    // Collect all changes across competitors
    var allChanges = [];
    competitors.forEach(function(c) {
      if (c.changes && Array.isArray(c.changes)) {
        c.changes.forEach(function(ch) {
          allChanges.push({
            competitor_name: c.name,
            change_type: ch.change_type,
            details: ch.details,
            detected_at: ch.detected_at
          });
        });
      }
    });

    if (allChanges.length === 0) {
      el.innerHTML = '<p class="comp-empty">No recent changes detected. Click "Check Now" on a competitor.</p>';
      return;
    }

    // Sort by date descending
    allChanges.sort(function(a, b) {
      return new Date(b.detected_at) - new Date(a.detected_at);
    });

    var icons = { price: '&#x1F4B0;', product: '&#x1F4E6;', ranking: '&#x1F4CA;' };
    var html = '<div class="comp-timeline">';
    allChanges.slice(0, 20).forEach(function(ch) {
      var icon = icons[ch.change_type] || '&#x1F514;';
      var date = ch.detected_at ? new Date(ch.detected_at).toLocaleString() : '';
      html += '<div class="comp-change-item">' +
        '<span class="comp-change-icon">' + icon + '</span>' +
        '<div class="comp-change-body">' +
          '<span class="comp-change-competitor">' + _compEscape(ch.competitor_name || '') + '</span>' +
          '<span class="comp-change-details">' + _compEscape(ch.details || ch.change_type || '') + '</span>' +
          '<span class="comp-change-date">' + date + '</span>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }
};

/* ═══ Global init function ═══ */
window.initCompetitorAlerts = function() {
  CompetitorAlertsPanel.toggle();
  return true;
};
