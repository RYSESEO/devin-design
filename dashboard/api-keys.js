/* ═══════════════════════════════════════════════════════════════
   Phase 5 — API Keys Panel
   Create, list, and revoke API keys with clipboard support
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _apikeyFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _apikeyPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _apikeyDelete(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'DELETE', headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _apikeyEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ API Keys Panel Controller ═══ */
var ApiKeysPanel = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('api-keys-panel');
    if (!panel) return;
    panel.classList.add('apikey-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadKeys();
  },

  close: function() {
    var panel = document.getElementById('api-keys-panel');
    if (!panel) return;
    panel.classList.remove('apikey-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('apikey-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var form = document.getElementById('apikey-create-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        self.createKey();
      });
    }
  },

  loadKeys: function() {
    var self = this;
    _apikeyFetch('/api/keys').then(function(data) {
      self.renderKeys(data.keys || []);
    }).catch(function() {
      var el = document.getElementById('apikey-list');
      if (el) el.innerHTML = '<p class="apikey-empty">Unable to load API keys.</p>';
    });
  },

  renderKeys: function(keys) {
    var self = this;
    var el = document.getElementById('apikey-list');
    if (!el) return;

    if (!keys.length) {
      el.innerHTML = '<p class="apikey-empty">No API keys yet. Create one above.</p>';
      return;
    }

    var html = '<div class="apikey-cards">';
    keys.forEach(function(k) {
      var perms = k.permissions || '';
      var permBadges = perms.split(',').map(function(p) {
        return '<span class="apikey-perm-badge">' + _apikeyEscape(p.trim()) + '</span>';
      }).join('');
      var lastUsed = k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never';

      html += '<div class="apikey-card">' +
        '<div class="apikey-card-info">' +
          '<h4 class="apikey-card-name">' + _apikeyEscape(k.name) + '</h4>' +
          '<div class="apikey-card-perms">' + permBadges + '</div>' +
          '<span class="apikey-card-used">Last used: ' + _apikeyEscape(lastUsed) + '</span>' +
        '</div>' +
        '<button class="apikey-revoke-btn" data-key-id="' + k.id + '">Revoke</button>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.apikey-revoke-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var keyId = btn.getAttribute('data-key-id');
        btn.disabled = true;
        btn.textContent = 'Revoking...';
        _apikeyDelete('/api/keys/' + keyId).then(function() {
          self.loadKeys();
        }).catch(function() {
          btn.textContent = 'Revoke';
          btn.disabled = false;
        });
      });
    });
  },

  createKey: function() {
    var self = this;
    var nameInput = document.getElementById('apikey-name-input');
    var readCheck = document.getElementById('apikey-perm-read');
    var writeCheck = document.getElementById('apikey-perm-write');

    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;

    var permissions = [];
    if (readCheck && readCheck.checked) permissions.push('read');
    if (writeCheck && writeCheck.checked) permissions.push('write');
    if (!permissions.length) permissions.push('read');

    _apikeyPost('/api/keys', { name: name, permissions: permissions.join(',') }).then(function(data) {
      if (nameInput) nameInput.value = '';
      self.showNewKey(data.key);
      self.loadKeys();
    }).catch(function(err) {
      console.error('Failed to create key:', err);
    });
  },

  showNewKey: function(key) {
    var el = document.getElementById('apikey-new-key');
    if (!el) return;

    el.innerHTML = '<div class="apikey-highlight-box">' +
      '<p class="apikey-highlight-label">Your new API key (copy it now, it will not be shown again):</p>' +
      '<div class="apikey-highlight-value">' +
        '<code class="apikey-highlight-code">' + _apikeyEscape(key) + '</code>' +
        '<button class="apikey-copy-btn" id="apikey-copy-new">Copy</button>' +
      '</div>' +
      '</div>';

    var copyBtn = document.getElementById('apikey-copy-new');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(key).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy'; }, 2000);
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = key;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.textContent = 'Copied!';
          setTimeout(function() { copyBtn.textContent = 'Copy'; }, 2000);
        }
      });
    }

    el.style.display = 'block';
  }
};

/* ═══ Global init function ═══ */
window.initApiKeys = function() {
  ApiKeysPanel.toggle();
  return true;
};
