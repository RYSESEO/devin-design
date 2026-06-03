/* ═══════════════════════════════════════════════════════════════
   Workflow Automation Hub - Drawer Panel
   Workflows, Templates, Lead Scoring, Notification Channels
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _autoFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _autoPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _autoPut(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'PUT', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _autoDelete(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'DELETE', headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _autoToast(icon, title, msg) {
  if (typeof showToast === 'function') {
    showToast({ icon: icon, title: title, msg: msg });
  } else {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast-notification toast-enter';
    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><div class="toast-content"><strong class="toast-title">' + title + '</strong><p class="toast-msg">' + msg + '</p></div>';
    container.appendChild(toast);
    setTimeout(function() { toast.classList.remove('toast-enter'); }, 300);
    setTimeout(function() { toast.classList.add('toast-exit'); setTimeout(function() { toast.remove(); }, 300); }, 5000);
  }
}

/* ═══ Trigger Icons ═══ */
var TRIGGER_ICONS = {
  revenue_drop: '&#x1F4C9;',
  new_order: '&#x1F6D2;',
  lead_score_change: '&#x1F4CA;',
  scheduled: '&#x23F0;',
  product_velocity_low: '&#x1F422;',
  inventory_low: '&#x1F4E6;',
  cart_abandoned: '&#x1F6D2;',
  revenue_milestone: '&#x1F3C6;',
  order_total_above: '&#x1F4B0;'
};

var ACTION_LABELS = {
  notify: 'Send Notification',
  create_discount: 'Create Discount',
  tag_customer: 'Tag Customer',
  send_email: 'Send Email',
  pause_ads: 'Pause Ads',
  send_notification: 'Send Notification'
};

/* ═══ 1. Workflow Builder Module ═══ */
var WorkflowBuilder = {
  _workflows: [],
  _builderOpen: false,
  _editingId: null,
  _step: 1,
  _formData: { name: '', trigger_type: '', conditions: [], actions: [] },

  render: function() {
    var el = document.getElementById('auto-workflows');
    if (!el) return;
    el.innerHTML = '<div class="auto-loading">Loading workflows...</div>';

    var self = this;
    _autoFetch('/api/automations/workflows').then(function(data) {
      self._workflows = data.workflows || data || [];
      self._renderList(el);
    }).catch(function() {
      self._workflows = [];
      self._renderList(el);
    });
  },

  _renderList: function(el) {
    var self = this;
    var html = '<div class="auto-toolbar"><button class="auto-create-btn" id="auto-create-workflow">+ Create Workflow</button></div>';

    if (self._workflows.length === 0) {
      html += '<div class="auto-empty">No workflows yet. Create your first automation workflow.</div>';
    } else {
      html += '<div class="workflow-list">';
      self._workflows.forEach(function(w) {
        var triggerIcon = TRIGGER_ICONS[w.trigger_type] || '&#x26A1;';
        var conditions = [];
        try { conditions = typeof w.conditions === 'string' ? JSON.parse(w.conditions) : (w.conditions || []); } catch(e) { conditions = []; }
        var actions = [];
        try { actions = typeof w.actions === 'string' ? JSON.parse(w.actions) : (w.actions || []); } catch(e) { actions = []; }
        var condSummary = conditions.length > 0 ? conditions.map(function(c) { return c.field + ' ' + c.operator + ' ' + c.value; }).join(', ') : 'No conditions';
        var actionSummary = actions.length > 0 ? actions.map(function(a) { return ACTION_LABELS[a.type] || a.type; }).join(', ') : 'No actions';
        var lastRun = w.last_run ? new Date(w.last_run).toLocaleDateString() : 'Never';

        html += '<div class="workflow-card" data-wf-id="' + w.id + '">' +
          '<div class="workflow-card-header">' +
            '<span class="workflow-trigger-icon">' + triggerIcon + '</span>' +
            '<div class="workflow-card-info">' +
              '<span class="workflow-name">' + (w.name || 'Untitled') + '</span>' +
              '<span class="workflow-trigger-type">' + (w.trigger_type || '').replace(/_/g, ' ') + '</span>' +
            '</div>' +
            '<label class="auto-toggle"><input type="checkbox" class="wf-enable-toggle" data-wf-id="' + w.id + '"' + (w.enabled ? ' checked' : '') + '/><span class="auto-toggle-track"><span class="auto-toggle-thumb"></span></span></label>' +
          '</div>' +
          '<div class="workflow-card-body">' +
            '<div class="workflow-summary-row"><span class="workflow-label">Conditions:</span><span class="workflow-val">' + condSummary + '</span></div>' +
            '<div class="workflow-summary-row"><span class="workflow-label">Actions:</span><span class="workflow-val">' + actionSummary + '</span></div>' +
          '</div>' +
          '<div class="workflow-card-footer">' +
            '<span class="workflow-stat">Runs: ' + (w.run_count || 0) + '</span>' +
            '<span class="workflow-stat">Last: ' + lastRun + '</span>' +
            '<div class="workflow-actions">' +
              '<button class="workflow-edit-btn" data-wf-id="' + w.id + '">Edit</button>' +
              '<button class="workflow-delete-btn" data-wf-id="' + w.id + '">Delete</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    html += '<div id="auto-workflow-builder" class="workflow-builder" style="display:none"></div>';
    el.innerHTML = html;

    // Bind events
    var createBtn = document.getElementById('auto-create-workflow');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        self._editingId = null;
        self._formData = { name: '', trigger_type: '', conditions: [], actions: [] };
        self._step = 1;
        self._openBuilder();
      });
    }

    el.querySelectorAll('.wf-enable-toggle').forEach(function(toggle) {
      toggle.addEventListener('change', function() {
        var id = toggle.getAttribute('data-wf-id');
        _autoPut('/api/automations/workflows/' + id, { enabled: toggle.checked }).catch(function() {
          toggle.checked = !toggle.checked;
        });
      });
    });

    el.querySelectorAll('.workflow-edit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-wf-id');
        var wf = self._workflows.find(function(w) { return String(w.id) === String(id); });
        if (wf) {
          self._editingId = id;
          var conditions = [];
          try { conditions = typeof wf.conditions === 'string' ? JSON.parse(wf.conditions) : (wf.conditions || []); } catch(e) { conditions = []; }
          var actions = [];
          try { actions = typeof wf.actions === 'string' ? JSON.parse(wf.actions) : (wf.actions || []); } catch(e) { actions = []; }
          self._formData = { name: wf.name || '', trigger_type: wf.trigger_type || '', conditions: conditions, actions: actions };
          self._step = 1;
          self._openBuilder();
        }
      });
    });

    el.querySelectorAll('.workflow-delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-wf-id');
        _autoDelete('/api/automations/workflows/' + id).then(function() {
          _autoToast('&#x1F5D1;', 'Deleted', 'Workflow removed.');
          self.render();
        }).catch(function() {
          _autoToast('&#x26A0;', 'Error', 'Could not delete workflow.');
        });
      });
    });
  },

  _openBuilder: function() {
    var builder = document.getElementById('auto-workflow-builder');
    if (!builder) return;
    builder.style.display = 'block';
    this._renderStep(builder);
  },

  _renderStep: function(builder) {
    var self = this;
    var html = '<div class="builder-header"><h4>' + (self._editingId ? 'Edit' : 'Create') + ' Workflow</h4><button class="builder-cancel-btn" id="builder-cancel">Cancel</button></div>';
    html += '<div class="builder-steps-indicator"><span class="builder-dot' + (self._step >= 1 ? ' active' : '') + '">1</span><span class="builder-arrow-line"></span><span class="builder-dot' + (self._step >= 2 ? ' active' : '') + '">2</span><span class="builder-arrow-line"></span><span class="builder-dot' + (self._step >= 3 ? ' active' : '') + '">3</span></div>';

    if (self._step === 1) {
      html += '<div class="builder-step"><h5>Step 1: Choose Trigger</h5>';
      html += '<input type="text" class="auto-input" id="builder-name" placeholder="Workflow name" value="' + (self._formData.name || '') + '"/>';
      var triggers = ['revenue_drop', 'new_order', 'lead_score_change', 'scheduled', 'product_velocity_low', 'inventory_low', 'cart_abandoned', 'revenue_milestone'];
      html += '<div class="builder-trigger-grid">';
      triggers.forEach(function(t) {
        var icon = TRIGGER_ICONS[t] || '&#x26A1;';
        var isSelected = self._formData.trigger_type === t ? ' selected' : '';
        html += '<button class="builder-trigger-pill' + isSelected + '" data-trigger="' + t + '">' + icon + ' ' + t.replace(/_/g, ' ') + '</button>';
      });
      html += '</div>';
      html += '<div class="builder-nav"><button class="builder-next-btn" id="builder-next-1">Next &rarr;</button></div>';
      html += '</div>';
    } else if (self._step === 2) {
      html += '<div class="builder-step"><h5>Step 2: Set Conditions</h5>';
      html += '<div class="builder-conditions" id="builder-conditions-list">';
      self._formData.conditions.forEach(function(c, i) {
        html += '<div class="builder-condition-row" data-idx="' + i + '">' +
          '<input type="text" class="auto-input auto-input-sm" placeholder="Field" value="' + (c.field || '') + '" data-field="field"/>' +
          '<select class="auto-select" data-field="operator"><option value=">"' + (c.operator === '>' ? ' selected' : '') + '>&gt;</option><option value="<"' + (c.operator === '<' ? ' selected' : '') + '>&lt;</option><option value="=="' + (c.operator === '==' ? ' selected' : '') + '>==</option><option value="contains"' + (c.operator === 'contains' ? ' selected' : '') + '>contains</option></select>' +
          '<input type="text" class="auto-input auto-input-sm" placeholder="Value" value="' + (c.value || '') + '" data-field="value"/>' +
          '<button class="builder-remove-btn" data-idx="' + i + '">x</button>' +
        '</div>';
      });
      html += '</div>';
      html += '<button class="builder-add-btn" id="builder-add-condition">+ Add Condition</button>';
      html += '<div class="builder-nav"><button class="builder-prev-btn" id="builder-prev-2">&larr; Back</button><button class="builder-next-btn" id="builder-next-2">Next &rarr;</button></div>';
      html += '</div>';
    } else if (self._step === 3) {
      html += '<div class="builder-step"><h5>Step 3: Define Actions</h5>';
      html += '<div class="builder-actions" id="builder-actions-list">';
      self._formData.actions.forEach(function(a, i) {
        html += '<div class="builder-action-row" data-idx="' + i + '">' +
          '<select class="auto-select" data-field="type"><option value="notify"' + (a.type === 'notify' ? ' selected' : '') + '>Notify</option><option value="create_discount"' + (a.type === 'create_discount' ? ' selected' : '') + '>Create Discount</option><option value="tag_customer"' + (a.type === 'tag_customer' ? ' selected' : '') + '>Tag Customer</option><option value="send_email"' + (a.type === 'send_email' ? ' selected' : '') + '>Send Email</option><option value="pause_ads"' + (a.type === 'pause_ads' ? ' selected' : '') + '>Pause Ads</option></select>' +
          '<input type="text" class="auto-input auto-input-sm" placeholder="Config (e.g. channel)" value="' + (a.config || '') + '" data-field="config"/>' +
          '<button class="builder-remove-btn" data-idx="' + i + '">x</button>' +
        '</div>';
      });
      html += '</div>';
      html += '<button class="builder-add-btn" id="builder-add-action">+ Add Action</button>';
      html += '<div class="builder-nav"><button class="builder-prev-btn" id="builder-prev-3">&larr; Back</button><button class="builder-save-btn" id="builder-save">Save Workflow</button></div>';
      html += '</div>';
    }

    builder.innerHTML = html;

    // Bind cancel
    var cancelBtn = document.getElementById('builder-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { builder.style.display = 'none'; });

    // Step 1 events
    if (self._step === 1) {
      builder.querySelectorAll('.builder-trigger-pill').forEach(function(pill) {
        pill.addEventListener('click', function() {
          builder.querySelectorAll('.builder-trigger-pill').forEach(function(p) { p.classList.remove('selected'); });
          pill.classList.add('selected');
          self._formData.trigger_type = pill.getAttribute('data-trigger');
        });
      });
      var nextBtn = document.getElementById('builder-next-1');
      if (nextBtn) nextBtn.addEventListener('click', function() {
        var nameInput = document.getElementById('builder-name');
        if (nameInput) self._formData.name = nameInput.value;
        self._step = 2;
        self._renderStep(builder);
      });
    }

    // Step 2 events
    if (self._step === 2) {
      var addCondBtn = document.getElementById('builder-add-condition');
      if (addCondBtn) addCondBtn.addEventListener('click', function() {
        self._saveConditionsFromDOM(builder);
        self._formData.conditions.push({ field: '', operator: '>', value: '' });
        self._renderStep(builder);
      });
      builder.querySelectorAll('.builder-remove-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-idx'));
          self._saveConditionsFromDOM(builder);
          self._formData.conditions.splice(idx, 1);
          self._renderStep(builder);
        });
      });
      var prevBtn = document.getElementById('builder-prev-2');
      if (prevBtn) prevBtn.addEventListener('click', function() { self._saveConditionsFromDOM(builder); self._step = 1; self._renderStep(builder); });
      var nextBtn2 = document.getElementById('builder-next-2');
      if (nextBtn2) nextBtn2.addEventListener('click', function() { self._saveConditionsFromDOM(builder); self._step = 3; self._renderStep(builder); });
    }

    // Step 3 events
    if (self._step === 3) {
      var addActBtn = document.getElementById('builder-add-action');
      if (addActBtn) addActBtn.addEventListener('click', function() {
        self._saveActionsFromDOM(builder);
        self._formData.actions.push({ type: 'notify', config: '' });
        self._renderStep(builder);
      });
      builder.querySelectorAll('.builder-remove-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-idx'));
          self._saveActionsFromDOM(builder);
          self._formData.actions.splice(idx, 1);
          self._renderStep(builder);
        });
      });
      var prevBtn3 = document.getElementById('builder-prev-3');
      if (prevBtn3) prevBtn3.addEventListener('click', function() { self._saveActionsFromDOM(builder); self._step = 2; self._renderStep(builder); });
      var saveBtn = document.getElementById('builder-save');
      if (saveBtn) saveBtn.addEventListener('click', function() {
        self._saveActionsFromDOM(builder);
        self._saveWorkflow(builder);
      });
    }
  },

  _saveConditionsFromDOM: function(builder) {
    var rows = builder.querySelectorAll('.builder-condition-row');
    var conditions = [];
    rows.forEach(function(row) {
      var field = row.querySelector('[data-field="field"]').value;
      var operator = row.querySelector('[data-field="operator"]').value;
      var value = row.querySelector('[data-field="value"]').value;
      conditions.push({ field: field, operator: operator, value: value });
    });
    this._formData.conditions = conditions;
  },

  _saveActionsFromDOM: function(builder) {
    var rows = builder.querySelectorAll('.builder-action-row');
    var actions = [];
    rows.forEach(function(row) {
      var type = row.querySelector('[data-field="type"]').value;
      var config = row.querySelector('[data-field="config"]').value;
      actions.push({ type: type, config: config });
    });
    this._formData.actions = actions;
  },

  _saveWorkflow: function(builder) {
    var self = this;
    var payload = {
      name: self._formData.name,
      trigger_type: self._formData.trigger_type,
      conditions: self._formData.conditions,
      actions: self._formData.actions
    };

    var promise;
    if (self._editingId) {
      promise = _autoPut('/api/automations/workflows/' + self._editingId, payload);
    } else {
      promise = _autoPost('/api/automations/workflows', payload);
    }

    promise.then(function() {
      _autoToast('&#x2705;', 'Saved', 'Workflow saved successfully.');
      builder.style.display = 'none';
      self.render();
    }).catch(function() {
      _autoToast('&#x26A0;', 'Error', 'Could not save workflow.');
    });
  }
};

/* ═══ 2. Template Gallery Module ═══ */
var TemplateGallery = {
  _templates: [],

  render: function() {
    var el = document.getElementById('auto-templates');
    if (!el) return;
    el.innerHTML = '<div class="auto-loading">Loading templates...</div>';

    var self = this;
    _autoFetch('/api/automations/templates').then(function(data) {
      self._templates = data.templates || data || [];
      self._renderGrid(el);
    }).catch(function() {
      self._templates = [];
      self._renderGrid(el);
    });
  },

  _renderGrid: function(el) {
    var self = this;
    if (self._templates.length === 0) {
      el.innerHTML = '<div class="auto-empty">No templates available.</div>';
      return;
    }

    var CATEGORY_ICONS = {
      marketing: '&#x1F4E3;',
      sales: '&#x1F4B0;',
      retention: '&#x1F91D;',
      operations: '&#x2699;',
      engagement: '&#x1F4AC;'
    };

    var html = '<div class="template-grid">';
    self._templates.forEach(function(t) {
      var catIcon = CATEGORY_ICONS[t.category] || '&#x26A1;';
      html += '<div class="template-card">' +
        '<div class="template-icon">' + catIcon + '</div>' +
        '<div class="template-body">' +
          '<span class="template-name">' + (t.name || 'Template') + '</span>' +
          '<p class="template-desc">' + (t.description || '') + '</p>' +
          '<span class="template-badge">' + (t.category || 'general') + '</span>' +
        '</div>' +
        '<button class="template-activate-btn" data-tpl-id="' + t.id + '">Activate</button>' +
      '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.template-activate-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-tpl-id');
        btn.disabled = true;
        btn.textContent = 'Activating...';
        _autoPost('/api/automations/templates/' + id + '/activate', {}).then(function() {
          _autoToast('&#x2705;', 'Activated', 'Template activated as a workflow.');
          btn.textContent = 'Activated!';
          setTimeout(function() { btn.textContent = 'Activate'; btn.disabled = false; }, 2000);
        }).catch(function() {
          _autoToast('&#x26A0;', 'Error', 'Could not activate template.');
          btn.textContent = 'Activate';
          btn.disabled = false;
        });
      });
    });
  }
};

/* ═══ 3. Lead Scoring Module ═══ */
var LeadScoring = {
  _leads: [],
  _sortField: 'score',
  _sortDir: 'desc',

  render: function() {
    var el = document.getElementById('auto-leads');
    if (!el) return;
    el.innerHTML = '<div class="auto-loading">Loading leads...</div>';

    var self = this;
    _autoFetch('/api/automations/leads').then(function(data) {
      self._leads = data.leads || data || [];
      self._renderTable(el);
    }).catch(function() {
      self._leads = [];
      self._renderTable(el);
    });
  },

  _renderTable: function(el) {
    var self = this;
    var html = '<div class="auto-toolbar"><button class="auto-create-btn" id="auto-import-lead">+ Import Lead</button></div>';
    html += '<div id="auto-lead-form" class="auto-lead-form" style="display:none"><input type="text" class="auto-input" id="lead-name" placeholder="Name"/><input type="email" class="auto-input" id="lead-email" placeholder="Email"/><input type="text" class="auto-input" id="lead-source" placeholder="Source"/><button class="auto-save-btn" id="lead-save-btn">Save</button><button class="auto-cancel-btn" id="lead-cancel-btn">Cancel</button></div>';

    if (self._leads.length === 0) {
      html += '<div class="auto-empty">No leads yet. Import your first lead.</div>';
    } else {
      // Sort leads
      var sorted = self._leads.slice().sort(function(a, b) {
        var av = a[self._sortField] || 0;
        var bv = b[self._sortField] || 0;
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return self._sortDir === 'asc' ? -1 : 1;
        if (av > bv) return self._sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      html += '<div class="lead-table"><div class="lead-table-header">' +
        '<span class="lead-col lead-col-name" data-sort="name">Name</span>' +
        '<span class="lead-col lead-col-email" data-sort="email">Email</span>' +
        '<span class="lead-col lead-col-score" data-sort="score">Score</span>' +
        '<span class="lead-col lead-col-priority" data-sort="priority">Priority</span>' +
        '<span class="lead-col lead-col-source" data-sort="source">Source</span>' +
        '<span class="lead-col lead-col-activity">Last Activity</span>' +
      '</div>';
      sorted.forEach(function(lead) {
        var score = lead.score || 0;
        var scoreClass = score > 80 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
        var priority = lead.priority || (score > 80 ? 'hot' : score >= 40 ? 'warm' : 'cold');
        var priorityEmoji = priority === 'hot' ? '&#x1F525;' : priority === 'warm' ? '&#x2600;' : '&#x2744;';
        var lastActivity = lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : 'N/A';
        var barWidth = Math.min(score, 100);
        var barColor = score > 80 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

        html += '<div class="lead-row">' +
          '<span class="lead-col lead-col-name">' + (lead.name || 'Unknown') + '</span>' +
          '<span class="lead-col lead-col-email">' + (lead.email || '') + '</span>' +
          '<span class="lead-col lead-col-score"><span class="lead-score-badge ' + scoreClass + '">' + score + '</span><div class="lead-score-bar"><div class="lead-score-fill" style="width:' + barWidth + '%;background:' + barColor + '"></div></div></span>' +
          '<span class="lead-col lead-col-priority"><span class="priority-badge priority-' + priority + '">' + priorityEmoji + ' ' + priority + '</span></span>' +
          '<span class="lead-col lead-col-source">' + (lead.source || 'direct') + '</span>' +
          '<span class="lead-col lead-col-activity">' + lastActivity + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    el.innerHTML = html;

    // Bind events
    var importBtn = document.getElementById('auto-import-lead');
    var form = document.getElementById('auto-lead-form');
    if (importBtn && form) {
      importBtn.addEventListener('click', function() { form.style.display = 'flex'; });
      var cancelBtn = document.getElementById('lead-cancel-btn');
      if (cancelBtn) cancelBtn.addEventListener('click', function() { form.style.display = 'none'; });
      var saveBtn = document.getElementById('lead-save-btn');
      if (saveBtn) saveBtn.addEventListener('click', function() {
        var name = document.getElementById('lead-name').value;
        var email = document.getElementById('lead-email').value;
        var source = document.getElementById('lead-source').value;
        if (!email) { _autoToast('&#x26A0;', 'Error', 'Email is required.'); return; }
        _autoPost('/api/automations/leads', { name: name, email: email, source: source }).then(function() {
          _autoToast('&#x2705;', 'Imported', 'Lead imported successfully.');
          form.style.display = 'none';
          self.render();
        }).catch(function() {
          _autoToast('&#x26A0;', 'Error', 'Could not import lead.');
        });
      });
    }

    // Sort headers
    el.querySelectorAll('[data-sort]').forEach(function(header) {
      header.style.cursor = 'pointer';
      header.addEventListener('click', function() {
        var field = header.getAttribute('data-sort');
        if (self._sortField === field) {
          self._sortDir = self._sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          self._sortField = field;
          self._sortDir = 'desc';
        }
        self._renderTable(el);
      });
    });
  }
};

/* ═══ 4. Notification Channels Module ═══ */
var NotificationChannels = {
  _channels: [],

  render: function() {
    var el = document.getElementById('auto-notifications');
    if (!el) return;
    el.innerHTML = '<div class="auto-loading">Loading channels...</div>';

    var self = this;
    _autoFetch('/api/automations/notifications').then(function(data) {
      self._channels = data.channels || data || [];
      self._renderList(el);
    }).catch(function() {
      self._channels = [];
      self._renderList(el);
    });
  },

  _renderList: function(el) {
    var self = this;
    var CHANNEL_ICONS = { slack: '&#x1F4AC;', discord: '&#x1F3AE;', email: '&#x2709;' };

    var html = '<div class="auto-toolbar"><button class="auto-create-btn" id="auto-add-channel">+ Add Channel</button></div>';
    html += '<div id="auto-channel-form" class="auto-channel-form" style="display:none">' +
      '<select class="auto-select" id="channel-type"><option value="slack">Slack</option><option value="discord">Discord</option><option value="email">Email</option></select>' +
      '<input type="text" class="auto-input" id="channel-config" placeholder="Webhook URL or email"/>' +
      '<button class="auto-save-btn" id="channel-save-btn">Save</button>' +
      '<button class="auto-cancel-btn" id="channel-cancel-btn">Cancel</button>' +
    '</div>';

    if (self._channels.length === 0) {
      html += '<div class="auto-empty">No notification channels configured.</div>';
    } else {
      html += '<div class="channel-list">';
      self._channels.forEach(function(ch) {
        var icon = CHANNEL_ICONS[ch.channel_type] || '&#x1F514;';
        var statusClass = ch.enabled ? 'channel-enabled' : 'channel-disabled';
        var config = {};
        try { config = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {}); } catch(e) { config = {}; }
        var configDisplay = config.webhook_url || config.email || 'Configured';

        html += '<div class="channel-card">' +
          '<div class="channel-card-left">' +
            '<span class="channel-icon">' + icon + '</span>' +
            '<div class="channel-info">' +
              '<span class="channel-type-label">' + (ch.channel_type || 'unknown') + '</span>' +
              '<span class="channel-config-label">' + configDisplay + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="channel-card-right">' +
            '<span class="channel-status ' + statusClass + '"></span>' +
            '<button class="channel-test-btn" data-ch-id="' + ch.id + '">Test</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    el.innerHTML = html;

    // Bind events
    var addBtn = document.getElementById('auto-add-channel');
    var form = document.getElementById('auto-channel-form');
    if (addBtn && form) {
      addBtn.addEventListener('click', function() { form.style.display = 'flex'; });
      var cancelBtn = document.getElementById('channel-cancel-btn');
      if (cancelBtn) cancelBtn.addEventListener('click', function() { form.style.display = 'none'; });
      var saveBtn = document.getElementById('channel-save-btn');
      if (saveBtn) saveBtn.addEventListener('click', function() {
        var type = document.getElementById('channel-type').value;
        var config = document.getElementById('channel-config').value;
        if (!config) { _autoToast('&#x26A0;', 'Error', 'Configuration is required.'); return; }
        var configObj = type === 'email' ? { email: config } : { webhook_url: config };
        _autoPost('/api/automations/notifications', { channel_type: type, config: configObj }).then(function() {
          _autoToast('&#x2705;', 'Saved', 'Channel added successfully.');
          form.style.display = 'none';
          self.render();
        }).catch(function() {
          _autoToast('&#x26A0;', 'Error', 'Could not add channel.');
        });
      });
    }

    el.querySelectorAll('.channel-test-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-ch-id');
        btn.disabled = true;
        btn.textContent = 'Testing...';
        _autoPost('/api/automations/notifications/test', { channel_id: id }).then(function(res) {
          _autoToast('&#x2705;', 'Test Sent', res.message || 'Test notification sent successfully.');
          btn.textContent = 'Sent!';
          setTimeout(function() { btn.textContent = 'Test'; btn.disabled = false; }, 2000);
        }).catch(function() {
          _autoToast('&#x26A0;', 'Failed', 'Test notification failed.');
          btn.textContent = 'Test';
          btn.disabled = false;
        });
      });
    });
  }
};

/* ═══ Automation Hub Panel Controller ═══ */
var AutomationHub = {
  isOpen: false,
  _initialized: false,

  open: function() {
    var panel = document.getElementById('automation-panel');
    if (!panel) return;
    panel.classList.add('auto-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    WorkflowBuilder.render();
  },

  close: function() {
    var panel = document.getElementById('automation-panel');
    if (!panel) return;
    panel.classList.remove('auto-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;

    // Close button
    var closeBtn = document.getElementById('auto-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { self.close(); });
    }

    // Backdrop click
    var panel = document.getElementById('automation-panel');
    if (panel) {
      panel.addEventListener('click', function(e) {
        if (e.target === panel) self.close();
      });
    }

    // Tab switching
    var tabs = panel.querySelectorAll('.auto-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.getAttribute('data-tab');
        panel.querySelectorAll('.auto-pane').forEach(function(p) { p.classList.remove('active'); });
        var targetPane = panel.querySelector('[data-apane="' + target + '"]');
        if (targetPane) targetPane.classList.add('active');

        // Load data for the active tab
        if (target === 'workflows') WorkflowBuilder.render();
        else if (target === 'templates') TemplateGallery.render();
        else if (target === 'leads') LeadScoring.render();
        else if (target === 'notifications') NotificationChannels.render();
      });
    });
  }
};

/* ═══ Init function exposed on window ═══ */
window.initAutomations = function() {
  AutomationHub.open();
  return true;
};

// Expose for keyboard shortcut access
window.AutomationHub = AutomationHub;
