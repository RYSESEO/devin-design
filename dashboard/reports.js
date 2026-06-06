/* ═══════════════════════════════════════════════════════════════
   Reports Panel
   Generate reports, list past reports, view report data
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _rptFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _rptPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _rptEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Reports Panel Controller ═══ */
var ReportsPanel = {
  isOpen: false,
  _initialized: false,
  _reports: [],

  open: function() {
    var panel = document.getElementById('reports-panel');
    if (!panel) return;
    panel.classList.add('rpt-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadReports();
  },

  close: function() {
    var panel = document.getElementById('reports-panel');
    if (!panel) return;
    panel.classList.remove('rpt-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;

    var closeBtn = document.getElementById('rpt-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { self.close(); });
    }

    var panel = document.getElementById('reports-panel');
    if (panel) {
      panel.addEventListener('click', function(e) {
        if (e.target === panel) self.close();
      });
    }

    // Generate report button
    var genBtn = document.getElementById('rpt-generate-btn');
    if (genBtn) {
      genBtn.addEventListener('click', function() {
        var titleInput = document.getElementById('rpt-title-input');
        var title = titleInput ? titleInput.value.trim() : '';
        if (!title) title = 'Report ' + new Date().toLocaleDateString();
        _rptPost('/api/reports/generate', { title: title }).then(function() {
          if (titleInput) titleInput.value = '';
          self.loadReports();
        }).catch(function(err) {
          console.error('Failed to generate report:', err);
        });
      });
    }
  },

  loadReports: function() {
    var self = this;
    _rptFetch('/api/reports').then(function(data) {
      self._reports = data.reports || [];
      self.renderReports();
    }).catch(function(err) {
      console.error('Failed to load reports:', err);
    });
  },

  renderReports: function() {
    var self = this;
    var container = document.getElementById('rpt-list');
    if (!container) return;

    var badgeHtml = '<span class="data-source-badge demo">Demo</span>';
    if (typeof ConnectorManager !== 'undefined' && !ConnectorManager.demoMode && typeof getLiveData === 'function') {
      var liveCheck = getLiveData('shopify_orders_chart', null);
      if (liveCheck) {
        badgeHtml = '<span class="data-source-badge live">Live</span>';
      }
    }

    if (self._reports.length === 0) {
      container.innerHTML = '<p class="rpt-empty">No reports generated yet.</p>';
      return;
    }

    container.innerHTML = self._reports.map(function(report) {
      return '<div class="rpt-item" data-report-id="' + report.id + '">' +
        '<div class="rpt-item-info">' +
          '<span class="rpt-item-title">' + _rptEscape(report.title) + ' ' + badgeHtml + '</span>' +
          '<span class="rpt-item-date">' + new Date(report.created_at).toLocaleDateString() + '</span>' +
        '</div>' +
        '<button class="rpt-btn rpt-btn-view" data-action="view" data-id="' + report.id + '">View</button>' +
      '</div>';
    }).join('');

    container.querySelectorAll('[data-action="view"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        self.viewReport(id);
      });
    });
  },

  viewReport: function(id) {
    var viewer = document.getElementById('rpt-viewer');
    if (!viewer) return;

    _rptFetch('/api/reports/' + id).then(function(data) {
      var report = data.report || data;
      var reportData = report.report_data;
      if (typeof reportData === 'string') {
        try { reportData = JSON.parse(reportData); } catch(e) { /* keep as string */ }
      }
      var json = JSON.stringify(reportData, null, 2);
      viewer.innerHTML =
        '<div class="rpt-viewer-header">' +
          '<h4>' + _rptEscape(report.title || 'Report') + '</h4>' +
          '<button class="rpt-btn rpt-btn-close-viewer" id="rpt-close-viewer">Close</button>' +
        '</div>' +
        '<pre class="rpt-json">' + _rptEscape(json) + '</pre>';
      viewer.style.display = 'block';

      var closeViewerBtn = document.getElementById('rpt-close-viewer');
      if (closeViewerBtn) {
        closeViewerBtn.addEventListener('click', function() {
          viewer.style.display = 'none';
        });
      }
    }).catch(function(err) {
      console.error('Failed to load report:', err);
    });
  }
};

/* ═══ Init function exposed on window ═══ */
window.initReports = function() {
  ReportsPanel.open();
  return true;
};
