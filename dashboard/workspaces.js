/* ═══════════════════════════════════════════════════════════════
   Workspace Management Panel
   Workspace list, create workspace, member management
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _wsFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _wsPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _wsDelete(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'DELETE', headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _wsEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Workspaces Panel Controller ═══ */
var WorkspacesPanel = {
  isOpen: false,
  _initialized: false,
  _workspaces: [],
  _selectedWsId: null,

  open: function() {
    var panel = document.getElementById('workspaces-panel');
    if (!panel) return;
    panel.classList.add('ws-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadWorkspaces();
  },

  close: function() {
    var panel = document.getElementById('workspaces-panel');
    if (!panel) return;
    panel.classList.remove('ws-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;

    var closeBtn = document.getElementById('ws-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { self.close(); });
    }

    var panel = document.getElementById('workspaces-panel');
    if (panel) {
      panel.addEventListener('click', function(e) {
        if (e.target === panel) self.close();
      });
    }

    // Create workspace form
    var createForm = document.getElementById('ws-create-form');
    if (createForm) {
      createForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var nameInput = document.getElementById('ws-name-input');
        if (!nameInput.value.trim()) return;
        _wsPost('/api/workspaces', { name: nameInput.value.trim() }).then(function() {
          nameInput.value = '';
          self.loadWorkspaces();
        }).catch(function(err) {
          console.error('Failed to create workspace:', err);
        });
      });
    }

    // Add member form
    var memberForm = document.getElementById('ws-member-form');
    if (memberForm) {
      memberForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!self._selectedWsId) return;
        var emailInput = document.getElementById('ws-member-email');
        var roleSelect = document.getElementById('ws-member-role');
        if (!emailInput.value.trim()) return;
        _wsPost('/api/workspaces/' + self._selectedWsId + '/members', {
          email: emailInput.value.trim(),
          role: roleSelect.value
        }).then(function() {
          emailInput.value = '';
          self.loadMembers(self._selectedWsId);
        }).catch(function(err) {
          console.error('Failed to add member:', err);
        });
      });
    }
  },

  loadWorkspaces: function() {
    var self = this;
    _wsFetch('/api/workspaces').then(function(data) {
      self._workspaces = data.workspaces || [];
      self.renderWorkspaces();
    }).catch(function(err) {
      console.error('Failed to load workspaces:', err);
    });
  },

  renderWorkspaces: function() {
    var self = this;
    var container = document.getElementById('ws-list');
    if (!container) return;

    if (self._workspaces.length === 0) {
      container.innerHTML = '<p class="ws-empty">No workspaces yet. Create your first workspace.</p>';
      return;
    }

    container.innerHTML = self._workspaces.map(function(ws) {
      var selectedClass = (self._selectedWsId === ws.id) ? ' ws-item-selected' : '';
      return '<div class="ws-item' + selectedClass + '" data-ws-id="' + ws.id + '">' +
        '<span class="ws-item-name">' + _wsEscape(ws.name) + '</span>' +
        '<span class="ws-item-date">' + new Date(ws.created_at).toLocaleDateString() + '</span>' +
      '</div>';
    }).join('');

    container.querySelectorAll('.ws-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var id = item.getAttribute('data-ws-id');
        self._selectedWsId = parseInt(id, 10);
        self.renderWorkspaces();
        self.loadMembers(self._selectedWsId);
        var memberSection = document.getElementById('ws-member-section');
        if (memberSection) memberSection.style.display = 'block';
      });
    });
  },

  loadMembers: function(wsId) {
    var self = this;
    _wsFetch('/api/workspaces/' + wsId + '/members').then(function(data) {
      self.renderMembers(data.members || []);
    }).catch(function(err) {
      console.error('Failed to load members:', err);
    });
  },

  renderMembers: function(members) {
    var self = this;
    var container = document.getElementById('ws-members-list');
    if (!container) return;

    if (members.length === 0) {
      container.innerHTML = '<p class="ws-empty">No members yet.</p>';
      return;
    }

    container.innerHTML = members.map(function(member) {
      var badgeClass = 'ws-role-badge ws-role-' + (member.role || 'viewer');
      return '<div class="ws-member-item" data-user-id="' + member.user_id + '">' +
        '<div class="ws-member-info">' +
          '<span class="ws-member-email">' + _wsEscape(member.email || 'User #' + member.user_id) + '</span>' +
          '<span class="' + badgeClass + '">' + _wsEscape(member.role) + '</span>' +
        '</div>' +
        '<button class="ws-btn ws-btn-remove" data-action="remove" data-user-id="' + member.user_id + '">Remove</button>' +
      '</div>';
    }).join('');

    container.querySelectorAll('[data-action="remove"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var userId = btn.getAttribute('data-user-id');
        _wsDelete('/api/workspaces/' + self._selectedWsId + '/members/' + userId).then(function() {
          self.loadMembers(self._selectedWsId);
        }).catch(function(err) {
          console.error('Failed to remove member:', err);
        });
      });
    });
  }
};

/* ═══ Init function exposed on window ═══ */
window.initWorkspaces = function() {
  WorkspacesPanel.open();
  return true;
};
