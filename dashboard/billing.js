/* ═══════════════════════════════════════════════════════════════
   Billing Panel
   Subscription status, plan selection, subscribe/cancel
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: fetch with auth ─────────────────────────────── */
function _billFetch(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _billPost(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _billPut(url, body) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'PUT', headers: headers, body: JSON.stringify(body) }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _billDelete(url) {
  var token = typeof window.getToken === 'function' ? window.getToken() : null;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { method: 'DELETE', headers: headers }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function _billEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Plan Definitions ═══ */
var BILLING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    features: ['Basic dashboard', 'Single store', 'Demo data access', 'Community support']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/mo',
    features: ['Multi-store management', 'Advanced analytics', 'Workspace collaboration', 'Priority support']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99/mo',
    features: ['All Pro features', 'API access', 'Custom integrations', 'White-label options', 'Dedicated support']
  }
];

/* ═══ Billing Panel Controller ═══ */
var BillingPanel = {
  isOpen: false,
  _initialized: false,
  _subscription: null,

  open: function() {
    var panel = document.getElementById('billing-panel');
    if (!panel) return;
    panel.classList.add('bill-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.loadSubscription();
  },

  close: function() {
    var panel = document.getElementById('billing-panel');
    if (!panel) return;
    panel.classList.remove('bill-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;

    var closeBtn = document.getElementById('bill-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { self.close(); });
    }

    var panel = document.getElementById('billing-panel');
    if (panel) {
      panel.addEventListener('click', function(e) {
        if (e.target === panel) self.close();
      });
    }
  },

  loadSubscription: function() {
    var self = this;
    _billFetch('/api/billing/subscription').then(function(data) {
      self._subscription = data.subscription || null;
      self.render();
    }).catch(function(err) {
      self._subscription = null;
      self.render();
    });
  },

  render: function() {
    var self = this;
    var statusContainer = document.getElementById('bill-status');
    var plansContainer = document.getElementById('bill-plans');

    // Render current status
    if (statusContainer) {
      if (self._subscription) {
        statusContainer.innerHTML =
          '<div class="bill-status-card">' +
            '<h4>Current Plan</h4>' +
            '<span class="bill-plan-name">' + _billEscape(self._subscription.plan || 'free') + '</span>' +
            '<span class="bill-plan-status bill-status-' + (self._subscription.status || 'active') + '">' +
              _billEscape(self._subscription.status || 'active') +
            '</span>' +
            (self._subscription.current_period_end
              ? '<span class="bill-period-end">Renews: ' + new Date(self._subscription.current_period_end).toLocaleDateString() + '</span>'
              : '') +
            '<button class="bill-btn bill-btn-cancel" id="bill-cancel-btn">Cancel Subscription</button>' +
          '</div>';

        var cancelBtn = document.getElementById('bill-cancel-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function() {
            _billDelete('/api/billing/subscription').then(function() {
              self.loadSubscription();
            }).catch(function(err) {
              console.error('Failed to cancel:', err);
            });
          });
        }
      } else {
        statusContainer.innerHTML =
          '<div class="bill-status-card">' +
            '<h4>Current Plan</h4>' +
            '<span class="bill-plan-name">Free</span>' +
            '<span class="bill-plan-status bill-status-active">active</span>' +
          '</div>';
      }
    }

    // Render plan cards
    if (plansContainer) {
      var currentPlan = self._subscription ? self._subscription.plan : 'free';
      plansContainer.innerHTML = BILLING_PLANS.map(function(plan) {
        var isCurrent = (plan.id === currentPlan);
        var cardClass = 'bill-plan-card' + (isCurrent ? ' bill-plan-current' : '');
        var featuresHtml = plan.features.map(function(f) {
          return '<li class="bill-feature">' + _billEscape(f) + '</li>';
        }).join('');

        var actionBtn = '';
        if (isCurrent) {
          actionBtn = '<button class="bill-btn bill-btn-current" disabled>Current Plan</button>';
        } else if (plan.id === 'free') {
          actionBtn = '';
        } else {
          var label = self._subscription ? 'Upgrade' : 'Subscribe';
          actionBtn = '<button class="bill-btn bill-btn-subscribe" data-plan="' + plan.id + '">' + label + '</button>';
        }

        return '<div class="' + cardClass + '">' +
          '<h4 class="bill-plan-title">' + _billEscape(plan.name) + '</h4>' +
          '<span class="bill-plan-price">' + plan.price + '</span>' +
          '<ul class="bill-features">' + featuresHtml + '</ul>' +
          actionBtn +
        '</div>';
      }).join('');

      plansContainer.querySelectorAll('[data-plan]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var plan = btn.getAttribute('data-plan');
          if (self._subscription) {
            _billPut('/api/billing/subscription', { plan: plan }).then(function() {
              self.loadSubscription();
            }).catch(function(err) {
              console.error('Failed to update plan:', err);
            });
          } else {
            _billPost('/api/billing/subscribe', { plan: plan }).then(function() {
              self.loadSubscription();
            }).catch(function(err) {
              console.error('Failed to subscribe:', err);
            });
          }
        });
      });
    }
  }
};

/* ═══ Init function exposed on window ═══ */
window.initBilling = function() {
  BillingPanel.open();
  return true;
};
