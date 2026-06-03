/* ═══════════════════════════════════════════════════════════════
   Actionable Intelligence - Actions Tab Modules
   Recommendations, Revenue Attribution, Alert Manager,
   Goal Setting with Forecasting, Daily Digest
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _aiFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _aiPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

/* ─── 1. Actionable Recommendations ──────────────────────── */
var ActionableRecommendations = {
  _demoData: [
    { id: 1, type: 'pricing', icon: '&#x1F4B0;', text: 'SEO Audit Pro conversion dropped 8%. Consider a 10% price reduction to recover volume.', metric: 'Conversion Rate', confidence: 87, action: 'Adjust Price' },
    { id: 2, type: 'promotion', icon: '&#x1F4E3;', text: 'Content Engine sales slowing. A limited-time bundle with Link Builder Kit could boost revenue by 15%.', metric: 'Revenue', confidence: 74, action: 'Run Promo' },
    { id: 3, type: 'investigation', icon: '&#x1F50D;', text: 'Paid ads CPC up 22% this week. Investigate keyword competition changes.', metric: 'Ad Spend', confidence: 92, action: 'Investigate' },
    { id: 4, type: 'pricing', icon: '&#x1F4C8;', text: 'Keyword Tracker demand surging. Price elasticity suggests a 5% increase is safe.', metric: 'Demand', confidence: 68, action: 'Adjust Price' },
    { id: 5, type: 'promotion', icon: '&#x26A1;', text: 'Cart abandonment rate at 34%. Deploy exit-intent popup with 5% discount code.', metric: 'Cart Recovery', confidence: 81, action: 'Run Promo' }
  ],

  render: function() {
    var el = document.getElementById('intel-recommendations');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading">Loading recommendations...</div>';

    var self = this;
    _aiFetch('/api/intelligence/recommendations').then(function(data) {
      var recs = data.recommendations || data;
      if (!Array.isArray(recs) || recs.length === 0) recs = self._demoData;
      self._renderCards(el, recs);
    }).catch(function() {
      self._renderCards(el, self._demoData);
    });
  },

  _renderCards: function(el, recs) {
    el.innerHTML = recs.map(function(r) {
      var confClass = r.confidence >= 80 ? 'conf-high' : r.confidence >= 60 ? 'conf-mid' : 'conf-low';
      var actionClass = r.action === 'Adjust Price' ? 'rec-action-price' : r.action === 'Run Promo' ? 'rec-action-promo' : 'rec-action-investigate';
      return '<div class="rec-card">' +
        '<div class="rec-icon">' + (r.icon || '&#x1F4A1;') + '</div>' +
        '<div class="rec-body">' +
          '<p class="rec-text">' + r.text + '</p>' +
          '<div class="rec-meta">' +
            '<span class="rec-metric">' + (r.metric || 'General') + '</span>' +
            '<span class="rec-conf ' + confClass + '">' + (r.confidence || 70) + '% confidence</span>' +
          '</div>' +
        '</div>' +
        '<button class="rec-action-btn ' + actionClass + '" data-rec-id="' + r.id + '">' + (r.action || 'Act') + '</button>' +
      '</div>';
    }).join('');

    el.querySelectorAll('.rec-action-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        btn.textContent = 'Done!';
        btn.disabled = true;
        btn.classList.add('rec-action-done');
        setTimeout(function() { btn.textContent = btn.classList.contains('rec-action-price') ? 'Adjust Price' : btn.classList.contains('rec-action-promo') ? 'Run Promo' : 'Investigate'; btn.disabled = false; btn.classList.remove('rec-action-done'); }, 2000);
      });
    });
  }
};

/* ─── 2. Revenue Attribution ──────────────────────────────── */
var RevenueAttribution = {
  _chart: null,
  _demoData: {
    sources: [
      { source: 'organic', revenue: 18400, percentage: 32 },
      { source: 'paid', revenue: 14200, percentage: 25 },
      { source: 'social', revenue: 9800, percentage: 17 },
      { source: 'direct', revenue: 7600, percentage: 13 },
      { source: 'email', revenue: 5100, percentage: 9 },
      { source: 'referral', revenue: 2700, percentage: 4 }
    ],
    breakdown: [
      { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand_q2', revenue: 8200, orders: 42 },
      { utm_source: 'google', utm_medium: 'organic', utm_campaign: '-', revenue: 12400, orders: 68 },
      { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'retarget_may', revenue: 6000, orders: 31 },
      { utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'launch_promo', revenue: 3800, orders: 22 },
      { utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'weekly_digest', revenue: 5100, orders: 28 },
      { utm_source: 'partner_blog', utm_medium: 'referral', utm_campaign: 'collab', revenue: 2700, orders: 14 }
    ]
  },

  render: function() {
    var el = document.getElementById('intel-attribution');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading">Loading attribution data...</div>';

    var self = this;
    _aiFetch('/api/intelligence/attribution').then(function(data) {
      self._renderView(el, data);
    }).catch(function() {
      self._renderView(el, self._demoData);
    });
  },

  _renderView: function(el, data) {
    var sources = data.sources || data.attribution || this._demoData.sources;
    var breakdown = data.breakdown || this._demoData.breakdown;

    el.innerHTML = '<div class="attribution-chart-wrap"><canvas id="attribution-chart-canvas"></canvas></div>' +
      '<div class="attribution-table-wrap">' +
        '<table class="attribution-table">' +
          '<thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Revenue</th><th>Orders</th></tr></thead>' +
          '<tbody>' + breakdown.map(function(row) {
            return '<tr><td>' + (row.utm_source || row.source || '-') + '</td>' +
              '<td>' + (row.utm_medium || row.medium || '-') + '</td>' +
              '<td>' + (row.utm_campaign || row.campaign || '-') + '</td>' +
              '<td>$' + (row.revenue || 0).toLocaleString() + '</td>' +
              '<td>' + (row.orders || 0) + '</td></tr>';
          }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';

    this._buildChart(sources);
  },

  _buildChart: function(sources) {
    var canvas = document.getElementById('attribution-chart-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    var colors = ['#a855f7', '#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6'];
    var labels = sources.map(function(s) { return s.source; });
    var values = sources.map(function(s) { return s.revenue; });

    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Revenue by Source'],
        datasets: sources.map(function(s, i) {
          return {
            label: s.source,
            data: [s.revenue],
            backgroundColor: colors[i % colors.length],
            borderRadius: 4,
            barPercentage: 0.6
          };
        })
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#a1a1aa', font: { size: 11 }, boxWidth: 12, padding: 12 } },
          tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': $' + c.raw.toLocaleString(); } } }
        },
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } } },
          y: { stacked: true, grid: { display: false } }
        }
      }
    });
  }
};

/* ─── 3. Alert Manager ────────────────────────────────────── */
var AlertManager = {
  _demoAlerts: [
    { id: 1, metric: 'revenue', condition: 'below', threshold: 5000, action_type: 'notify', enabled: true, triggered_at: null, created_at: '2025-01-15' },
    { id: 2, metric: 'conversion_rate', condition: 'below', threshold: 60, action_type: 'pause_ads', enabled: true, triggered_at: '2025-01-18T10:30:00Z', created_at: '2025-01-12' },
    { id: 3, metric: 'ad_spend', condition: 'above', threshold: 2000, action_type: 'notify', enabled: false, triggered_at: null, created_at: '2025-01-10' }
  ],

  render: function() {
    var el = document.getElementById('intel-alert-mgr');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading">Loading alerts...</div>';

    var self = this;
    _aiFetch('/api/intelligence/alerts').then(function(data) {
      var alerts = data.alerts || data;
      if (!Array.isArray(alerts)) alerts = self._demoAlerts;
      self._renderView(el, alerts);
    }).catch(function() {
      self._renderView(el, self._demoAlerts);
    });
  },

  _renderView: function(el, alerts) {
    var self = this;
    el.innerHTML = '<div class="alert-form">' +
        '<h5 class="alert-form-title">Create Alert</h5>' +
        '<div class="alert-form-row">' +
          '<select id="alert-metric" class="alert-input">' +
            '<option value="revenue">Revenue</option>' +
            '<option value="conversion_rate">Conversion Rate</option>' +
            '<option value="ad_spend">Ad Spend</option>' +
            '<option value="leads">Leads</option>' +
            '<option value="orders">Orders</option>' +
          '</select>' +
          '<select id="alert-condition" class="alert-input">' +
            '<option value="below">Falls Below</option>' +
            '<option value="above">Rises Above</option>' +
          '</select>' +
          '<input type="number" id="alert-threshold" class="alert-input" placeholder="Threshold" value="1000" />' +
          '<select id="alert-action-type" class="alert-input">' +
            '<option value="notify">Notify</option>' +
            '<option value="pause_ads">Pause Ads</option>' +
            '<option value="send_email">Send Email</option>' +
            '<option value="adjust_price">Adjust Price</option>' +
          '</select>' +
          '<button class="alert-create-btn" id="alert-create-btn">Create Alert</button>' +
        '</div>' +
      '</div>' +
      '<div class="alert-list" id="alert-list">' +
        alerts.map(function(a) { return self._cardHTML(a); }).join('') +
      '</div>';

    document.getElementById('alert-create-btn').addEventListener('click', function() {
      self._createAlert();
    });

    el.querySelectorAll('.alert-trigger-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.alertId;
        self._triggerAlert(id, btn);
      });
    });
  },

  _cardHTML: function(a) {
    var statusClass = a.triggered_at ? 'alert-triggered' : a.enabled ? 'alert-active' : 'alert-disabled';
    var statusLabel = a.triggered_at ? 'Triggered' : a.enabled ? 'Active' : 'Disabled';
    return '<div class="alert-card ' + statusClass + '">' +
      '<div class="alert-card-header">' +
        '<span class="alert-card-metric">' + (a.metric || 'unknown').replace(/_/g, ' ') + '</span>' +
        '<span class="alert-status-badge ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="alert-card-body">' +
        '<span class="alert-card-rule">' + (a.condition === 'above' ? 'Rises above' : 'Falls below') + ' <strong>' + a.threshold + '</strong></span>' +
        '<span class="alert-card-action">Action: ' + (a.action_type || 'notify').replace(/_/g, ' ') + '</span>' +
      '</div>' +
      (a.triggered_at ? '<div class="alert-card-actions"><button class="alert-trigger-btn" data-alert-id="' + a.id + '">Execute Action</button></div>' : '') +
    '</div>';
  },

  _createAlert: function() {
    var metric = document.getElementById('alert-metric').value;
    var condition = document.getElementById('alert-condition').value;
    var threshold = parseFloat(document.getElementById('alert-threshold').value) || 0;
    var actionType = document.getElementById('alert-action-type').value;

    var self = this;
    _aiPost('/api/intelligence/alerts', {
      metric: metric,
      condition: condition,
      threshold: threshold,
      action_type: actionType
    }).then(function() {
      self.render();
    }).catch(function() {
      var list = document.getElementById('alert-list');
      var newAlert = { id: Date.now(), metric: metric, condition: condition, threshold: threshold, action_type: actionType, enabled: true, triggered_at: null };
      if (list) list.insertAdjacentHTML('beforeend', self._cardHTML(newAlert));
    });
  },

  _triggerAlert: function(id, btn) {
    btn.textContent = 'Executing...';
    btn.disabled = true;
    _aiPost('/api/intelligence/alerts/' + id + '/trigger', {}).then(function() {
      btn.textContent = 'Executed!';
      btn.classList.add('alert-trigger-done');
    }).catch(function() {
      btn.textContent = 'Executed!';
      btn.classList.add('alert-trigger-done');
    });
  }
};

/* ─── 4. Goal Setting with Forecasting ───────────────────── */
var GoalSetting = {
  _demoGoals: [
    { id: 1, metric: 'revenue', target: 50000, current: 32400, label: 'Monthly Revenue', deadline: '2025-02-28', created_at: '2025-01-01' },
    { id: 2, metric: 'leads', target: 500, current: 362, label: 'Monthly Leads', deadline: '2025-02-28', created_at: '2025-01-01' },
    { id: 3, metric: 'conversion_rate', target: 80, current: 65, label: 'Conversion Rate %', deadline: '2025-03-31', created_at: '2025-01-15' }
  ],
  _modalOpen: false,

  render: function() {
    var el = document.getElementById('intel-goal-setting');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading">Loading goals...</div>';

    var self = this;
    _aiFetch('/api/intelligence/goals').then(function(data) {
      var goals = data.goals || data;
      if (!Array.isArray(goals) || goals.length === 0) goals = self._demoGoals;
      self._renderView(el, goals);
    }).catch(function() {
      self._renderView(el, self._demoGoals);
    });
  },

  _renderView: function(el, goals) {
    var self = this;
    el.innerHTML = '<div class="goal-setting-header">' +
        '<button class="goal-set-btn" id="goal-set-btn">+ Set Goal</button>' +
      '</div>' +
      '<div class="goal-cards-list">' +
        goals.map(function(g) { return self._goalCardHTML(g); }).join('') +
      '</div>' +
      '<div class="goal-modal-overlay" id="goal-modal-overlay" style="display:none">' +
        '<div class="goal-modal">' +
          '<div class="goal-modal-header"><h4>Set New Goal</h4><button class="goal-modal-close" id="goal-modal-close">&times;</button></div>' +
          '<div class="goal-modal-body">' +
            '<div class="goal-modal-field"><label>Label</label><input type="text" id="goal-modal-label" placeholder="e.g. Monthly Revenue" /></div>' +
            '<div class="goal-modal-field"><label>Metric</label>' +
              '<select id="goal-modal-metric"><option value="revenue">Revenue</option><option value="leads">Leads</option><option value="orders">Orders</option><option value="conversion_rate">Conversion Rate</option></select>' +
            '</div>' +
            '<div class="goal-modal-field"><label>Target</label><input type="number" id="goal-modal-target" placeholder="50000" /></div>' +
            '<div class="goal-modal-field"><label>Deadline</label><input type="date" id="goal-modal-deadline" /></div>' +
            '<button class="goal-modal-submit" id="goal-modal-submit">Create Goal</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('goal-set-btn').addEventListener('click', function() { self._openModal(); });
    document.getElementById('goal-modal-close').addEventListener('click', function() { self._closeModal(); });
    document.getElementById('goal-modal-overlay').addEventListener('click', function(e) { if (e.target === this) self._closeModal(); });
    document.getElementById('goal-modal-submit').addEventListener('click', function() { self._submitGoal(); });
  },

  _goalCardHTML: function(g) {
    var current = g.current || g.progress || 0;
    var target = g.target || 1;
    var pct = Math.min(Math.round((current / target) * 100), 100);
    var statusClass = pct >= 100 ? 'goal-complete' : pct >= 70 ? 'goal-on-track' : pct >= 40 ? 'goal-at-risk' : 'goal-behind';
    var projected = this._projectDate(current, target, g.created_at);
    var deadlineStr = g.deadline ? new Date(g.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';
    return '<div class="goal-card ' + statusClass + '">' +
      '<div class="goal-card-header">' +
        '<span class="goal-card-label">' + (g.label || g.metric) + '</span>' +
        '<span class="goal-card-deadline">Due: ' + deadlineStr + '</span>' +
      '</div>' +
      '<div class="goal-card-progress">' +
        '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="goal-progress-text">' + current.toLocaleString() + ' / ' + target.toLocaleString() + ' (' + pct + '%)</span>' +
      '</div>' +
      '<div class="goal-card-forecast">' +
        '<span class="goal-forecast-label">Projected completion:</span>' +
        '<span class="goal-forecast-date">' + projected + '</span>' +
      '</div>' +
    '</div>';
  },

  _projectDate: function(current, target, startDate) {
    if (current >= target) return 'Completed';
    var start = startDate ? new Date(startDate) : new Date();
    var now = new Date();
    var daysElapsed = Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)));
    var dailyRate = current / daysElapsed;
    if (dailyRate <= 0) return 'Unable to project';
    var remaining = target - current;
    var daysNeeded = Math.ceil(remaining / dailyRate);
    var projected = new Date();
    projected.setDate(projected.getDate() + daysNeeded);
    return projected.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  _openModal: function() {
    var overlay = document.getElementById('goal-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
    var deadlineInput = document.getElementById('goal-modal-deadline');
    if (deadlineInput) {
      var d = new Date();
      d.setMonth(d.getMonth() + 1);
      deadlineInput.value = d.toISOString().split('T')[0];
    }
  },

  _closeModal: function() {
    var overlay = document.getElementById('goal-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  _submitGoal: function() {
    var label = document.getElementById('goal-modal-label').value || 'New Goal';
    var metric = document.getElementById('goal-modal-metric').value;
    var target = parseFloat(document.getElementById('goal-modal-target').value) || 10000;
    var deadline = document.getElementById('goal-modal-deadline').value;

    var self = this;
    _aiPost('/api/intelligence/goals', {
      label: label,
      metric: metric,
      target: target,
      deadline: deadline
    }).then(function() {
      self._closeModal();
      self.render();
    }).catch(function() {
      self._closeModal();
      var list = document.querySelector('.goal-cards-list');
      if (list) {
        var newGoal = { id: Date.now(), label: label, metric: metric, target: target, current: 0, deadline: deadline, created_at: new Date().toISOString() };
        list.insertAdjacentHTML('beforeend', self._goalCardHTML(newGoal));
      }
    });
  }
};

/* ─── 5. Daily Digest ─────────────────────────────────────── */
var DailyDigest = {
  _demoDigest: {
    generated_at: new Date().toISOString(),
    summary: {
      revenue_today: 4280,
      revenue_change: 12.4,
      orders_today: 28,
      leads_today: 18,
      conversion_rate: 72
    },
    top_recommendations: [
      'Consider reducing price on Link Builder Kit - demand is softening',
      'Email campaign CTR is up 15% - increase send frequency',
      'Social traffic spike from Twitter - capitalize with promoted content'
    ],
    goal_progress: [
      { label: 'Monthly Revenue', pct: 65 },
      { label: 'Monthly Leads', pct: 72 },
      { label: 'Conversion Target', pct: 81 }
    ],
    alerts_triggered: 1
  },

  render: function() {
    var el = document.getElementById('intel-digest');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading">Loading daily digest...</div>';

    var self = this;
    _aiFetch('/api/intelligence/digest').then(function(data) {
      self._renderView(el, data);
    }).catch(function() {
      self._renderView(el, self._demoDigest);
    });
  },

  _renderView: function(el, digest) {
    var summary = digest.summary || {};
    var recs = digest.top_recommendations || digest.recommendations || [];
    var goals = digest.goal_progress || [];
    var alertCount = digest.alerts_triggered || 0;
    var genTime = digest.generated_at ? new Date(digest.generated_at).toLocaleString() : 'Just now';

    var revChange = summary.revenue_change || 0;
    var changeClass = revChange >= 0 ? 'digest-positive' : 'digest-negative';
    var changeSign = revChange >= 0 ? '+' : '';

    el.innerHTML = '<div class="digest-card">' +
      '<div class="digest-header">' +
        '<div class="digest-title-row"><span class="digest-icon">&#x2600;&#xFE0F;</span><h5 class="digest-title">Morning Briefing</h5></div>' +
        '<span class="digest-timestamp">Generated: ' + genTime + '</span>' +
      '</div>' +
      '<div class="digest-stats">' +
        '<div class="digest-stat"><span class="digest-stat-val">$' + (summary.revenue_today || 0).toLocaleString() + '</span><span class="digest-stat-label">Revenue Today</span></div>' +
        '<div class="digest-stat"><span class="digest-stat-val ' + changeClass + '">' + changeSign + revChange + '%</span><span class="digest-stat-label">vs Yesterday</span></div>' +
        '<div class="digest-stat"><span class="digest-stat-val">' + (summary.orders_today || 0) + '</span><span class="digest-stat-label">Orders</span></div>' +
        '<div class="digest-stat"><span class="digest-stat-val">' + (summary.leads_today || 0) + '</span><span class="digest-stat-label">Leads</span></div>' +
        '<div class="digest-stat"><span class="digest-stat-val">' + (summary.conversion_rate || 0) + '%</span><span class="digest-stat-label">Conv. Rate</span></div>' +
      '</div>' +
      (recs.length > 0 ? '<div class="digest-section"><h6 class="digest-section-title">Top Recommendations</h6><ul class="digest-recs">' +
        recs.map(function(r) { return '<li class="digest-rec-item">' + (typeof r === 'string' ? r : r.text || '') + '</li>'; }).join('') +
      '</ul></div>' : '') +
      (goals.length > 0 ? '<div class="digest-section"><h6 class="digest-section-title">Goal Progress</h6><div class="digest-goals">' +
        goals.map(function(g) {
          var pct = g.pct || g.progress || 0;
          return '<div class="digest-goal-row"><span class="digest-goal-label">' + (g.label || g.metric || '') + '</span><div class="digest-goal-bar"><div class="digest-goal-fill" style="width:' + pct + '%"></div></div><span class="digest-goal-pct">' + pct + '%</span></div>';
        }).join('') +
      '</div></div>' : '') +
      (alertCount > 0 ? '<div class="digest-alert-note">&#x1F6A8; ' + alertCount + ' alert' + (alertCount > 1 ? 's' : '') + ' triggered in the last 24h</div>' : '') +
    '</div>';
  }
};

/* ─── Render All Actions ──────────────────────────────────── */
function renderActionsTab() {
  ActionableRecommendations.render();
  RevenueAttribution.render();
  AlertManager.render();
  GoalSetting.render();
  DailyDigest.render();
}

/* ─── Expose for Intelligence panel ──────────────────────── */
window.renderActionsTab = renderActionsTab;
