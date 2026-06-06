/* ═══════════════════════════════════════════════════════════════
   Phase 4 — SEO Radar Panel
   Keyword opportunity table with trend indicators
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _seoFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _seoEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ SEO Radar Panel Controller ═══ */
var SeoRadarPanel = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('seo-radar-panel');
    if (!panel) return;
    panel.classList.add('seo-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadOpportunities();
  },

  close: function() {
    var panel = document.getElementById('seo-radar-panel');
    if (!panel) return;
    panel.classList.remove('seo-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('seo-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });
  },

  loadOpportunities: function() {
    var self = this;
    _seoFetch('/api/seo/opportunities').then(function(data) {
      self.renderTable(data);
    }).catch(function() {
      if (typeof getLiveData === 'function') {
        var scData = getLiveData('search_console', null);
        if (scData && Array.isArray(scData)) {
          self.renderTable({ opportunities: scData });
          var wrap = document.getElementById('seo-table-wrap');
          if (wrap) {
            wrap.insertAdjacentHTML('afterbegin', '<div class="data-source-badge live">Source: Search Console</div>');
          }
          return;
        }
      }
      var body = document.getElementById('seo-table-wrap');
      if (body) body.innerHTML = '<div class="data-source-badge demo">Source: Demo</div><p class="seo-empty">No SEO data available.</p>';
    });
  },

  renderTable: function(data) {
    var el = document.getElementById('seo-table-wrap');
    if (!el) return;

    var opportunities = data.opportunities || data || [];
    if (!Array.isArray(opportunities)) opportunities = [];

    if (opportunities.length === 0) {
      el.innerHTML = '<p class="seo-empty">No keyword opportunities found.</p>';
      return;
    }

    var html = '<table class="seo-table"><thead><tr>' +
      '<th>Keyword</th><th>Position</th><th>Change</th><th>Impressions</th><th>Clicks</th><th>CTR%</th><th>Type</th>' +
      '</tr></thead><tbody>';

    opportunities.forEach(function(kw) {
      var change = kw.change || 0;
      var arrow = change > 0 ? '&#x2191;' : change < 0 ? '&#x2193;' : '&#x2192;';
      var changeClass = change > 0 ? 'seo-rising' : change < 0 ? 'seo-falling' : '';
      var impressions = kw.impressions || 0;
      var clicks = kw.clicks || 0;
      var ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
      var type = kw.type || 'organic';
      var isRising = change > 0;
      var isLowCtr = parseFloat(ctr) < 2.0 && impressions > 100;
      var rowClass = isRising ? 'seo-row-rising' : isLowCtr ? 'seo-row-low-ctr' : '';

      html += '<tr class="' + rowClass + '">' +
        '<td class="seo-kw">' + _seoEscape(kw.keyword || '') + '</td>' +
        '<td>' + (kw.position || '-') + '</td>' +
        '<td class="' + changeClass + '">' + arrow + ' ' + Math.abs(change) + '</td>' +
        '<td>' + impressions.toLocaleString() + '</td>' +
        '<td>' + clicks.toLocaleString() + '</td>' +
        '<td>' + ctr + '%</td>' +
        '<td><span class="seo-type-badge seo-type-' + _seoEscape(type) + '">' + _seoEscape(type) + '</span></td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    el.innerHTML = html;
  }
};

/* ═══ Global init function ═══ */
window.initSeoRadar = function() {
  SeoRadarPanel.toggle();
  return true;
};
