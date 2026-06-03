/* ═══════════════════════════════════════════════════════════════
   Phase 5 — Marketplace Panel
   Plugin grid, install/uninstall, installed plugins with config
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _marketFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _marketPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _marketDelete(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'DELETE', headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _marketEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Marketplace Panel Controller ═══ */
var MarketplacePanel = {
  isOpen: false,
  _initialized: false,
  _installedIds: [],
  _activeTab: 'browse',

  open: function() {
    var panel = document.getElementById('marketplace-panel');
    if (!panel) return;
    panel.classList.add('mkt-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadPlugins();
    this.loadInstalled();
  },

  close: function() {
    var panel = document.getElementById('marketplace-panel');
    if (!panel) return;
    panel.classList.remove('mkt-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('mkt-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var tabs = document.querySelectorAll('.mkt-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        self._activeTab = tab.getAttribute('data-mkttab');
        var panes = document.querySelectorAll('.mkt-pane');
        panes.forEach(function(p) {
          p.classList.toggle('active', p.getAttribute('data-mktpane') === self._activeTab);
        });
      });
    });
  },

  loadPlugins: function() {
    var self = this;
    _marketFetch('/api/marketplace/plugins').then(function(data) {
      self.renderGrid(data.plugins || []);
    }).catch(function() {
      var grid = document.getElementById('mkt-grid');
      if (grid) grid.innerHTML = '<p class="mkt-empty">Unable to load plugins.</p>';
    });
  },

  loadInstalled: function() {
    var self = this;
    _marketFetch('/api/marketplace/installed').then(function(data) {
      var plugins = data.plugins || [];
      self._installedIds = plugins.map(function(p) { return p.plugin_id; });
      self.renderInstalled(plugins);
    }).catch(function() {
      var el = document.getElementById('mkt-installed-list');
      if (el) el.innerHTML = '<p class="mkt-empty">Unable to load installed plugins.</p>';
    });
  },

  renderGrid: function(plugins) {
    var self = this;
    var grid = document.getElementById('mkt-grid');
    if (!grid) return;

    if (!plugins.length) {
      grid.innerHTML = '<p class="mkt-empty">No plugins available.</p>';
      return;
    }

    var html = '<div class="mkt-cards">';
    plugins.forEach(function(p) {
      var installed = self._installedIds.indexOf(p.id) !== -1;
      var btnClass = installed ? 'mkt-card-btn mkt-btn-uninstall' : 'mkt-card-btn mkt-btn-install';
      var btnText = installed ? 'Uninstall' : 'Install';
      html += '<div class="mkt-card">' +
        '<div class="mkt-card-header">' +
          '<h4 class="mkt-card-name">' + _marketEscape(p.name) + '</h4>' +
          '<span class="mkt-card-badge">' + _marketEscape(p.category || 'general') + '</span>' +
        '</div>' +
        '<p class="mkt-card-desc">' + _marketEscape(p.description || '') + '</p>' +
        '<div class="mkt-card-meta">' +
          '<span class="mkt-card-author">by ' + _marketEscape(p.author || 'Unknown') + '</span>' +
          '<span class="mkt-card-installs">' + (p.install_count || 0) + ' installs</span>' +
        '</div>' +
        '<button class="' + btnClass + '" data-plugin-id="' + p.id + '">' + btnText + '</button>' +
        '</div>';
    });
    html += '</div>';
    grid.innerHTML = html;

    grid.querySelectorAll('.mkt-card-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var pluginId = btn.getAttribute('data-plugin-id');
        if (btn.classList.contains('mkt-btn-uninstall')) {
          _marketDelete('/api/marketplace/plugins/' + pluginId + '/uninstall').then(function() {
            self.loadPlugins();
            self.loadInstalled();
          });
        } else {
          _marketPost('/api/marketplace/plugins/' + pluginId + '/install').then(function() {
            self.loadPlugins();
            self.loadInstalled();
          });
        }
      });
    });
  },

  renderInstalled: function(plugins) {
    var self = this;
    var el = document.getElementById('mkt-installed-list');
    if (!el) return;

    if (!plugins.length) {
      el.innerHTML = '<p class="mkt-empty">No plugins installed yet. Browse the marketplace to get started.</p>';
      return;
    }

    var html = '<div class="mkt-installed-cards">';
    plugins.forEach(function(p) {
      var enabled = p.enabled ? 'checked' : '';
      html += '<div class="mkt-installed-card">' +
        '<div class="mkt-installed-info">' +
          '<h4>' + _marketEscape(p.name || 'Plugin #' + p.plugin_id) + '</h4>' +
          '<span class="mkt-card-badge">' + _marketEscape(p.category || 'general') + '</span>' +
        '</div>' +
        '<div class="mkt-installed-controls">' +
          '<label class="mkt-toggle-label">' +
            '<input type="checkbox" class="mkt-toggle" data-installed-id="' + p.id + '" ' + enabled + ' />' +
            '<span class="mkt-toggle-text">' + (p.enabled ? 'Enabled' : 'Disabled') + '</span>' +
          '</label>' +
          '<button class="mkt-btn-uninstall-sm" data-plugin-id="' + p.plugin_id + '">Uninstall</button>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.mkt-toggle').forEach(function(toggle) {
      toggle.addEventListener('change', function() {
        var id = toggle.getAttribute('data-installed-id');
        var enabled = toggle.checked;
        var token = typeof window.getToken === 'function' ? window.getToken() : null;
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        fetch('/api/marketplace/installed/' + id, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify({ enabled: enabled })
        }).then(function() { self.loadInstalled(); });
      });
    });

    el.querySelectorAll('.mkt-btn-uninstall-sm').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var pluginId = btn.getAttribute('data-plugin-id');
        _marketDelete('/api/marketplace/plugins/' + pluginId + '/uninstall').then(function() {
          self.loadPlugins();
          self.loadInstalled();
        });
      });
    });
  }
};

/* ═══ Global init function ═══ */
window.initMarketplace = function() {
  MarketplacePanel.toggle();
  return true;
};
