/* ═══════════════════════════════════════════════════════════════
   Phase 5 — Templates Panel
   Template gallery, apply templates, create from current layout
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _tmplFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _tmplPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _tmplEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Templates Panel Controller ═══ */
var TemplatesPanel = {
  isOpen: false,
  _initialized: false,
  _activeFilter: 'all',

  open: function() {
    var panel = document.getElementById('templates-panel');
    if (!panel) return;
    panel.classList.add('tmpl-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadTemplates();
  },

  close: function() {
    var panel = document.getElementById('templates-panel');
    if (!panel) return;
    panel.classList.remove('tmpl-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('tmpl-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var createBtn = document.getElementById('tmpl-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', function() { self.createFromCurrent(); });
    }

    var filterBtns = document.querySelectorAll('.tmpl-filter-btn');
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self._activeFilter = btn.getAttribute('data-filter');
        self.loadTemplates();
      });
    });
  },

  loadTemplates: function() {
    var self = this;
    _tmplFetch('/api/templates').then(function(data) {
      var templates = data.templates || [];
      if (self._activeFilter !== 'all') {
        templates = templates.filter(function(t) {
          return t.category === self._activeFilter;
        });
      }
      self.renderGallery(templates);
    }).catch(function() {
      var grid = document.getElementById('tmpl-grid');
      if (grid) grid.innerHTML = '<p class="tmpl-empty">Unable to load templates.</p>';
    });
  },

  renderGallery: function(templates) {
    var self = this;
    var grid = document.getElementById('tmpl-grid');
    if (!grid) return;

    if (!templates.length) {
      grid.innerHTML = '<p class="tmpl-empty">No templates in this category.</p>';
      return;
    }

    var html = '<div class="tmpl-cards">';
    templates.forEach(function(t) {
      html += '<div class="tmpl-card">' +
        '<div class="tmpl-card-header">' +
          '<h4 class="tmpl-card-name">' + _tmplEscape(t.name) + '</h4>' +
          '<span class="tmpl-card-tag">' + _tmplEscape(t.category || 'general') + '</span>' +
        '</div>' +
        '<p class="tmpl-card-desc">' + _tmplEscape(t.description || '') + '</p>' +
        '<button class="tmpl-apply-btn" data-template-id="' + t.id + '">Apply</button>' +
        '</div>';
    });
    html += '</div>';
    grid.innerHTML = html;

    grid.querySelectorAll('.tmpl-apply-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var templateId = btn.getAttribute('data-template-id');
        btn.disabled = true;
        btn.textContent = 'Applying...';
        _tmplPost('/api/templates/' + templateId + '/apply').then(function() {
          btn.textContent = 'Applied!';
          setTimeout(function() { btn.textContent = 'Apply'; btn.disabled = false; }, 2000);
        }).catch(function() {
          btn.textContent = 'Apply';
          btn.disabled = false;
        });
      });
    });
  },

  createFromCurrent: function() {
    var nameInput = document.getElementById('tmpl-name-input');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      name = 'My Template ' + new Date().toLocaleDateString();
    }

    var layout = null;
    try {
      var stored = localStorage.getItem('ryse-layout');
      if (stored) layout = JSON.parse(stored);
    } catch(e) { /* ignore */ }

    _tmplPost('/api/templates', {
      name: name,
      description: 'Custom template created from current layout',
      category: 'custom',
      layout_json: layout || { widgets: [] }
    }).then(function() {
      if (nameInput) nameInput.value = '';
      TemplatesPanel.loadTemplates();
    }).catch(function(err) {
      console.error('Failed to create template:', err);
    });
  }
};

/* ═══ Global init function ═══ */
window.initTemplates = function() {
  TemplatesPanel.toggle();
  return true;
};
