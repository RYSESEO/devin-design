/* ═══════════════════════════════════════════════════════════════
   Multi-Store Management Panel
   Store list, store switcher, aggregate metrics
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _storeFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _storePost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _storePut(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'PUT', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _storeDelete(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'DELETE', headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _storeEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Multi-Store Panel Controller ═══ */
var MultiStorePanel = {
  isOpen: false,
  _initialized: false,
  _stores: [],

  open: function() {
    var panel = document.getElementById('multi-store-panel');
    if (!panel) return;
    panel.classList.add('ms-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadStores();
    this.loadAggregate();
  },

  close: function() {
    var panel = document.getElementById('multi-store-panel');
    if (!panel) return;
    panel.classList.remove('ms-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;

    var closeBtn = document.getElementById('ms-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { self.close(); });
    }

    var panel = document.getElementById('multi-store-panel');
    if (panel) {
      panel.addEventListener('click', function(e) {
        if (e.target === panel) self.close();
      });
    }

    // Add store form
    var addForm = document.getElementById('ms-add-form');
    if (addForm) {
      addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var nameInput = document.getElementById('ms-store-name');
        var domainInput = document.getElementById('ms-shop-domain');
        if (!nameInput.value.trim() || !domainInput.value.trim()) return;
        _storePost('/api/stores', {
          store_name: nameInput.value.trim(),
          shop_domain: domainInput.value.trim()
        }).then(function() {
          nameInput.value = '';
          domainInput.value = '';
          self.loadStores();
        }).catch(function(err) {
          console.error('Failed to add store:', err);
        });
      });
    }
  },

  loadStores: function() {
    var self = this;
    _storeFetch('/api/stores').then(function(data) {
      self._stores = data.stores || [];
      self.renderStores();
      self.renderSwitcher();
    }).catch(function(err) {
      console.error('Failed to load stores:', err);
    });
  },

  loadAggregate: function() {
    _storeFetch('/api/stores/aggregate').then(function(data) {
      var container = document.getElementById('ms-aggregate');
      if (!container) return;
      var metrics = data.aggregate || data;
      container.innerHTML =
        '<div class="ms-metrics-grid">' +
          '<div class="ms-metric-card">' +
            '<span class="ms-metric-val">$' + (metrics.total_revenue || 0).toLocaleString() + '</span>' +
            '<span class="ms-metric-label">Total Revenue</span>' +
          '</div>' +
          '<div class="ms-metric-card">' +
            '<span class="ms-metric-val">' + (metrics.total_stores || 0) + '</span>' +
            '<span class="ms-metric-label">Total Stores</span>' +
          '</div>' +
          '<div class="ms-metric-card">' +
            '<span class="ms-metric-val">' + _storeEscape(metrics.best_performer || 'N/A') + '</span>' +
            '<span class="ms-metric-label">Best Performer</span>' +
          '</div>' +
          '<div class="ms-metric-card">' +
            '<span class="ms-metric-val">' + _storeEscape(metrics.worst_performer || 'N/A') + '</span>' +
            '<span class="ms-metric-label">Needs Attention</span>' +
          '</div>' +
        '</div>';
    }).catch(function(err) {
      console.error('Failed to load aggregate:', err);
    });
  },

  renderStores: function() {
    var self = this;
    var container = document.getElementById('ms-store-list');
    if (!container) return;

    if (self._stores.length === 0) {
      container.innerHTML = '<p class="ms-empty">No stores added yet. Add your first store below.</p>';
      return;
    }

    container.innerHTML = self._stores.map(function(store) {
      var activeClass = store.is_active ? ' ms-store-active' : '';
      return '<div class="ms-store-item' + activeClass + '" data-store-id="' + store.id + '">' +
        '<div class="ms-store-info">' +
          '<span class="ms-store-name">' + _storeEscape(store.store_name) + '</span>' +
          '<span class="ms-store-domain">' + _storeEscape(store.shop_domain) + '</span>' +
        '</div>' +
        '<div class="ms-store-actions">' +
          (store.is_active
            ? '<span class="ms-badge ms-badge-active">Active</span>'
            : '<button class="ms-btn ms-btn-activate" data-action="activate" data-id="' + store.id + '">Activate</button>') +
          '<button class="ms-btn ms-btn-delete" data-action="delete" data-id="' + store.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Bind actions
    container.querySelectorAll('[data-action="activate"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        _storePut('/api/stores/' + id + '/activate').then(function() {
          self.loadStores();
        });
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        _storeDelete('/api/stores/' + id).then(function() {
          self.loadStores();
          self.loadAggregate();
        });
      });
    });
  },

  renderSwitcher: function() {
    var switcher = document.getElementById('ms-switcher');
    if (!switcher) return;

    if (this._stores.length === 0) {
      switcher.innerHTML = '<select class="ms-switcher-select" disabled><option>No stores</option></select>';
      return;
    }

    var options = this._stores.map(function(store) {
      var selected = store.is_active ? ' selected' : '';
      return '<option value="' + store.id + '"' + selected + '>' + _storeEscape(store.store_name) + '</option>';
    }).join('');

    switcher.innerHTML = '<select class="ms-switcher-select" id="ms-switcher-select">' + options + '</select>';

    var self = this;
    var select = document.getElementById('ms-switcher-select');
    if (select) {
      select.addEventListener('change', function() {
        var id = select.value;
        _storePut('/api/stores/' + id + '/activate').then(function() {
          self.loadStores();
        });
      });
    }
  }
};

/* ═══ Init function exposed on window ═══ */
window.initMultiStore = function() {
  MultiStorePanel.open();
  return true;
};
