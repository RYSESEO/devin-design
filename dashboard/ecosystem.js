/* ═══════════════════════════════════════════════════════════════════
   Phase 5 — Ecosystem & Distribution
   Multi-dashboard tabs, shareable links, marketplace, PWA,
   collaboration, webhooks, white-label
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Dashboard Tabs ──────────────────────────────────────────── */
const DashboardTabs = {
  activeTab: 'all',
  presets: {
    all:         { label: 'All Metrics', icon: 'grid', widgets: null },
    marketing:   { label: 'Marketing',   icon: 'trending-up', widgets: ['revenue','leads-kpi','content-kpi','shopify-chart','content-perf','leads-table'] },
    engineering: { label: 'Engineering',  icon: 'code', widgets: ['agents','agent-usage','activity-feed'] },
    executive:   { label: 'Executive',    icon: 'briefcase', widgets: ['revenue','agents','leads-kpi','content-kpi','shopify-chart','agent-usage'] }
  },

  init() {
    const saved = localStorage.getItem('ryse_active_tab');
    if (saved && this.presets[saved]) this.activeTab = saved;
    this.bindEvents();
    this.apply();
  },

  bindEvents() {
    document.querySelectorAll('.dash-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchTo(btn.dataset.dtab));
    });
  },

  switchTo(tab) {
    if (!this.presets[tab]) return;
    this.activeTab = tab;
    localStorage.setItem('ryse_active_tab', tab);
    this.apply();
  },

  apply() {
    document.querySelectorAll('.dash-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dtab === this.activeTab);
    });
    const preset = this.presets[this.activeTab];
    document.querySelectorAll('[data-widget]').forEach(el => {
      const w = el.dataset.widget;
      if (!preset.widgets) { el.style.display = ''; return; }
      el.style.display = preset.widgets.includes(w) ? '' : 'none';
    });
    document.querySelectorAll('.charts-row, .bottom-row, .content-row').forEach(row => {
      const visible = [...row.querySelectorAll('[data-widget]')].some(c => c.style.display !== 'none');
      row.style.display = visible ? '' : 'none';
    });
  }
};

/* ─── Shareable Links ─────────────────────────────────────────── */
const ShareableLinks = {
  encode() {
    const config = {
      tab: DashboardTabs.activeTab,
      theme: document.documentElement.getAttribute('data-theme') || 'default',
      period: document.querySelector('.period-btn.active')?.dataset.period || '7d'
    };
    const param = btoa(JSON.stringify(config));
    return window.location.origin + window.location.pathname + '?dash=' + encodeURIComponent(param);
  },

  decode() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('dash');
    if (!raw) return null;
    try { return JSON.parse(atob(decodeURIComponent(raw))); } catch { return null; }
  },

  apply(cfg) {
    if (!cfg) return;
    if (cfg.theme) {
      document.documentElement.setAttribute('data-theme', cfg.theme);
      localStorage.setItem('ryse-theme', cfg.theme);
    }
    if (cfg.tab) DashboardTabs.switchTo(cfg.tab);
    if (cfg.period) {
      document.querySelectorAll('.period-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.period === cfg.period);
      });
    }
  },

  copyToClipboard() {
    const url = this.encode();
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('share-btn');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
    });
  },

  init() {
    const cfg = this.decode();
    if (cfg) this.apply(cfg);
    const btn = document.getElementById('share-btn');
    if (btn) btn.addEventListener('click', () => this.copyToClipboard());
  }
};

/* ─── Widget Marketplace ──────────────────────────────────────── */
const WidgetMarketplace = {
  catalog: [
    { id:'wm-social',     name:'Social Media Tracker',   author:'@ryseseo',   cat:'Marketing', desc:'Track followers, engagement, and post performance across platforms.', installs:1842, rating:4.8, icon:'heart' },
    { id:'wm-seo',        name:'SEO Rank Monitor',       author:'@searchpro', cat:'Marketing', desc:'Keyword rank tracking with SERP feature detection and historical trends.', installs:3201, rating:4.9, icon:'search' },
    { id:'wm-ab',         name:'A/B Test Dashboard',     author:'@convertlab',cat:'Marketing', desc:'Real-time experiment results with statistical significance indicators.', installs:1123, rating:4.6, icon:'git-branch' },
    { id:'wm-git',        name:'Git Commit Heatmap',     author:'@devtools',  cat:'Engineering',desc:'Contribution heatmap with PR merge rate and code review stats.', installs:2745, rating:4.7, icon:'git-commit' },
    { id:'wm-uptime',     name:'Uptime & Latency',       author:'@inframon',  cat:'Engineering',desc:'Service uptime monitoring with p50/p95/p99 latency percentiles.', installs:1965, rating:4.8, icon:'activity' },
    { id:'wm-deploy',     name:'Deploy Pipeline',        author:'@devtools',  cat:'Engineering',desc:'CI/CD pipeline visualization with build times and failure analysis.', installs:1587, rating:4.5, icon:'box' },
    { id:'wm-churn',      name:'Churn Predictor',        author:'@bizhub',    cat:'Business',   desc:'ML-based churn risk scoring with cohort-level drill-down.', installs:987,  rating:4.4, icon:'user-minus' },
    { id:'wm-funnel',     name:'Sales Funnel',           author:'@bizhub',    cat:'Business',   desc:'Multi-stage conversion funnel with drop-off analysis and benchmarks.', installs:2234, rating:4.7, icon:'filter' },
    { id:'wm-email',      name:'Email Campaign Stats',   author:'@mailpro',   cat:'Marketing',  desc:'Open rate, CTR, and deliverability metrics across campaigns.', installs:1456, rating:4.5, icon:'mail' },
    { id:'wm-budget',     name:'Budget Tracker',         author:'@finops',    cat:'Business',   desc:'Department-level budget vs actual with forecast and variance alerts.', installs:1122, rating:4.6, icon:'dollar-sign' },
    { id:'wm-perf',       name:'Web Performance',        author:'@devtools',  cat:'Engineering',desc:'Core Web Vitals timeline with Lighthouse score tracking.', installs:1789, rating:4.8, icon:'zap' },
    { id:'wm-inventory',  name:'Inventory Levels',       author:'@shoptools', cat:'Business',   desc:'Real-time stock levels with reorder alerts and supplier lead times.', installs:893,  rating:4.3, icon:'package' }
  ],

  installed: JSON.parse(localStorage.getItem('ryse_marketplace_installed') || '[]'),
  filterCat: 'All',

  init() {
    document.querySelectorAll('.mp-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterCat = btn.dataset.mpcat;
        document.querySelectorAll('.mp-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
        this.render();
      });
    });
  },

  render() {
    const grid = document.getElementById('mp-grid');
    if (!grid) return;
    const items = this.filterCat === 'All' ? this.catalog : this.catalog.filter(w => w.cat === this.filterCat);
    grid.innerHTML = items.map(w => {
      const isInstalled = this.installed.includes(w.id);
      return `<div class="mp-card${isInstalled ? ' mp-installed' : ''}">
        <div class="mp-card-head">
          <div class="mp-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-${w.icon}"/></svg></div>
          <div class="mp-meta">
            <span class="mp-name">${w.name}</span>
            <span class="mp-author">${w.author}</span>
          </div>
          <span class="mp-cat-badge">${w.cat}</span>
        </div>
        <p class="mp-desc">${w.desc}</p>
        <div class="mp-foot">
          <span class="mp-stats">${this.fmtNum(w.installs)} installs &middot; ${'&#9733;'.repeat(Math.round(w.rating))} ${w.rating}</span>
          <button class="mp-install-btn${isInstalled ? ' installed' : ''}" data-mpid="${w.id}">
            ${isInstalled ? 'Installed' : 'Install'}
          </button>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.mp-install-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleInstall(btn.dataset.mpid));
    });
  },

  toggleInstall(id) {
    const idx = this.installed.indexOf(id);
    if (idx >= 0) this.installed.splice(idx, 1);
    else this.installed.push(id);
    localStorage.setItem('ryse_marketplace_installed', JSON.stringify(this.installed));
    this.render();
  },

  fmtNum(n) { return n >= 1000 ? (n/1000).toFixed(1) + 'k' : n; }
};

/* ─── PWA Setup ───────────────────────────────────────────────── */
const PWASetup = {
  deferredPrompt: null,

  init() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBtn();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', () => this.promptInstall());
    }
  },

  showInstallBtn() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = '';
  },

  async promptInstall() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
  },

  renderStatus() {
    const el = document.getElementById('pwa-status');
    if (!el) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasSW = 'serviceWorker' in navigator;
    el.innerHTML = `
      <div class="pwa-checklist">
        <div class="pwa-check ${hasSW ? 'ok' : ''}"><span class="pwa-dot"></span> Service Worker ${hasSW ? 'Available' : 'Not Supported'}</div>
        <div class="pwa-check ${isStandalone ? 'ok' : ''}"><span class="pwa-dot"></span> ${isStandalone ? 'Running as App' : 'Running in Browser'}</div>
        <div class="pwa-check ok"><span class="pwa-dot"></span> Offline Cache Ready</div>
        <div class="pwa-check ok"><span class="pwa-dot"></span> App Manifest Configured</div>
      </div>
      <button class="eco-action-btn" id="pwa-install-btn" ${this.deferredPrompt ? '' : 'style="display:none"'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Install App
      </button>`;
  }
};

/* ─── Team Collaboration ──────────────────────────────────────── */
const Collaboration = {
  comments: JSON.parse(localStorage.getItem('ryse_collab_comments') || 'null') || [
    { id:'c1', user:'Sarah K.',  avatar:'SK', time: Date.now()-3600000*2, text:'Revenue numbers look strong this week. @Michael should we increase ad spend?', widget:'revenue' },
    { id:'c2', user:'Michael R.',avatar:'MR', time: Date.now()-3600000,   text:'Agent sessions spiked after the new onboarding flow launched. Great work team!', widget:'agents' },
    { id:'c3', user:'Alex T.',   avatar:'AT', time: Date.now()-1800000,   text:'@Sarah the Q3 targets look achievable based on current trajectory.', widget:null },
    { id:'c4', user:'Jamie L.',  avatar:'JL', time: Date.now()-900000,    text:'Noticed a dip in content views over the weekend. Investigating.', widget:'content-kpi' }
  ],

  sharedDashboards: [
    { id:'sd1', name:'Marketing Weekly', owner:'Sarah K.',  members:4, updated: Date.now()-86400000 },
    { id:'sd2', name:'Engineering Sprint', owner:'Alex T.', members:6, updated: Date.now()-43200000 },
    { id:'sd3', name:'Executive Summary', owner:'Michael R.', members:3, updated: Date.now()-7200000 }
  ],

  teamMembers: ['Sarah K.', 'Michael R.', 'Alex T.', 'Jamie L.', 'Chris P.', 'Dana W.'],

  init() {
    const addBtn = document.getElementById('collab-add-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.addComment());
    const input = document.getElementById('collab-input');
    if (input) {
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.addComment(); } });
      input.addEventListener('input', () => this.handleMention(input));
    }
  },

  handleMention(input) {
    const val = input.value;
    const atIdx = val.lastIndexOf('@');
    const suggest = document.getElementById('collab-mention-suggest');
    if (!suggest) return;
    if (atIdx >= 0 && atIdx === val.length - 1 || (atIdx >= 0 && !val.substring(atIdx).includes(' '))) {
      const partial = val.substring(atIdx + 1).toLowerCase();
      const matches = this.teamMembers.filter(m => m.toLowerCase().startsWith(partial));
      if (matches.length && partial.length > 0) {
        suggest.innerHTML = matches.map(m => `<button class="mention-opt" data-mention="${m}">@${m}</button>`).join('');
        suggest.style.display = '';
        suggest.querySelectorAll('.mention-opt').forEach(btn => {
          btn.addEventListener('click', () => {
            input.value = val.substring(0, atIdx) + '@' + btn.dataset.mention + ' ';
            suggest.style.display = 'none';
            input.focus();
          });
        });
        return;
      }
    }
    suggest.style.display = 'none';
  },

  addComment() {
    const input = document.getElementById('collab-input');
    if (!input || !input.value.trim()) return;
    this.comments.unshift({
      id: 'c' + Date.now(),
      user: 'You',
      avatar: 'YO',
      time: Date.now(),
      text: input.value.trim(),
      widget: null
    });
    localStorage.setItem('ryse_collab_comments', JSON.stringify(this.comments));
    input.value = '';
    const suggest = document.getElementById('collab-mention-suggest');
    if (suggest) suggest.style.display = 'none';
    this.render();
  },

  render() {
    this.renderComments();
    this.renderShared();
  },

  renderComments() {
    const list = document.getElementById('collab-comments');
    if (!list) return;
    list.innerHTML = this.comments.map(c => {
      const highlighted = c.text.replace(/@(\w+\s?\w*)/g, '<span class="mention-tag">@$1</span>');
      return `<div class="collab-comment">
        <div class="collab-avatar">${c.avatar}</div>
        <div class="collab-content">
          <div class="collab-meta"><strong>${c.user}</strong><span class="collab-time">${this.timeAgo(c.time)}</span>${c.widget ? `<span class="collab-widget-tag">${c.widget}</span>` : ''}</div>
          <p class="collab-text">${highlighted}</p>
        </div>
      </div>`;
    }).join('');
  },

  renderShared() {
    const el = document.getElementById('collab-shared');
    if (!el) return;
    el.innerHTML = this.sharedDashboards.map(d => `
      <div class="shared-dash-card">
        <div class="shared-dash-info">
          <span class="shared-dash-name">${d.name}</span>
          <span class="shared-dash-meta">${d.owner} &middot; ${d.members} members &middot; Updated ${this.timeAgo(d.updated)}</span>
        </div>
        <button class="shared-dash-open" data-sdid="${d.id}">Open</button>
      </div>
    `).join('');
  },

  timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return Math.floor(diff/86400000) + 'd ago';
  }
};

/* ─── Webhook Receiver ────────────────────────────────────────── */
const WebhookReceiver = {
  webhooks: [
    { id:'wh1', name:'Shopify Order Sync',  source:'Zapier',  url:'/api/webhooks/shopify-orders',  status:'active',  lastFired: Date.now()-300000,  events:247 },
    { id:'wh2', name:'Lead Form Capture',   source:'n8n',     url:'/api/webhooks/lead-capture',    status:'active',  lastFired: Date.now()-600000,  events:1893 },
    { id:'wh3', name:'GitHub Deploy Hook',  source:'Custom',  url:'/api/webhooks/deploy-notify',   status:'active',  lastFired: Date.now()-1800000, events:512 },
    { id:'wh4', name:'Stripe Payment Alert',source:'Zapier',  url:'/api/webhooks/stripe-payments', status:'paused',  lastFired: Date.now()-86400000,events:89 }
  ],

  recentEvents: [
    { webhook:'Shopify Order Sync', payload:'{ "order_id": 4521, "total": 129.99 }', time: Date.now()-300000 },
    { webhook:'Lead Form Capture',  payload:'{ "email": "j***@example.com", "source": "landing-page" }', time: Date.now()-420000 },
    { webhook:'GitHub Deploy Hook', payload:'{ "repo": "ryse/dashboard", "status": "success" }', time: Date.now()-1800000 },
    { webhook:'Lead Form Capture',  payload:'{ "email": "s***@corp.io", "source": "webinar" }', time: Date.now()-2400000 },
    { webhook:'Shopify Order Sync', payload:'{ "order_id": 4520, "total": 67.50 }', time: Date.now()-3600000 }
  ],

  render() {
    this.renderWebhooks();
    this.renderEvents();
  },

  renderWebhooks() {
    const el = document.getElementById('wh-list');
    if (!el) return;
    el.innerHTML = this.webhooks.map(wh => `
      <div class="wh-card">
        <div class="wh-card-head">
          <span class="wh-status-dot ${wh.status}"></span>
          <strong class="wh-name">${wh.name}</strong>
          <span class="wh-source-badge">${wh.source}</span>
        </div>
        <code class="wh-url">${wh.url}</code>
        <div class="wh-card-foot">
          <span>${wh.events.toLocaleString()} events</span>
          <span>Last: ${Collaboration.timeAgo(wh.lastFired)}</span>
          <button class="wh-toggle-btn" data-whid="${wh.id}">${wh.status === 'active' ? 'Pause' : 'Resume'}</button>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('.wh-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const wh = this.webhooks.find(w => w.id === btn.dataset.whid);
        if (wh) { wh.status = wh.status === 'active' ? 'paused' : 'active'; this.render(); }
      });
    });
  },

  renderEvents() {
    const el = document.getElementById('wh-events');
    if (!el) return;
    el.innerHTML = `<div class="wh-events-header"><strong>Recent Events</strong></div>` +
      this.recentEvents.map(ev => `
        <div class="wh-event">
          <span class="wh-event-source">${ev.webhook}</span>
          <code class="wh-event-payload">${ev.payload}</code>
          <span class="wh-event-time">${Collaboration.timeAgo(ev.time)}</span>
        </div>
      `).join('');
  }
};

/* ─── White-Label Customizer ──────────────────────────────────── */
const WhiteLabel = {
  config: JSON.parse(localStorage.getItem('ryse_whitelabel') || 'null') || {
    enabled: false,
    brandName: '',
    primaryColor: '#a855f7',
    accentColor: '#6366f1',
    logoUrl: '',
    hidePoweredBy: false
  },

  init() {
    const toggle = document.getElementById('wl-toggle');
    if (toggle) {
      toggle.checked = this.config.enabled;
      toggle.addEventListener('change', () => {
        this.config.enabled = toggle.checked;
        this.save();
        this.applyBrand();
      });
    }
    const nameInput = document.getElementById('wl-brand-name');
    if (nameInput) {
      nameInput.value = this.config.brandName;
      nameInput.addEventListener('input', () => { this.config.brandName = nameInput.value; this.save(); this.applyBrand(); });
    }
    const primaryInput = document.getElementById('wl-primary-color');
    if (primaryInput) {
      primaryInput.value = this.config.primaryColor;
      primaryInput.addEventListener('input', () => { this.config.primaryColor = primaryInput.value; this.save(); this.applyBrand(); });
    }
    const accentInput = document.getElementById('wl-accent-color');
    if (accentInput) {
      accentInput.value = this.config.accentColor;
      accentInput.addEventListener('input', () => { this.config.accentColor = accentInput.value; this.save(); this.applyBrand(); });
    }
    const logoInput = document.getElementById('wl-logo-url');
    if (logoInput) {
      logoInput.value = this.config.logoUrl;
      logoInput.addEventListener('input', () => { this.config.logoUrl = logoInput.value; this.save(); this.applyBrand(); });
    }
    const hideToggle = document.getElementById('wl-hide-powered');
    if (hideToggle) {
      hideToggle.checked = this.config.hidePoweredBy;
      hideToggle.addEventListener('change', () => { this.config.hidePoweredBy = hideToggle.checked; this.save(); this.applyBrand(); });
    }
    const resetBtn = document.getElementById('wl-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    if (this.config.enabled) this.applyBrand();
  },

  save() {
    localStorage.setItem('ryse_whitelabel', JSON.stringify(this.config));
  },

  applyBrand() {
    const logo = document.querySelector('.logo-text');
    const sub = document.querySelector('.logo-sub');
    if (this.config.enabled && this.config.brandName) {
      if (logo) logo.textContent = this.config.brandName;
      if (sub) sub.textContent = 'Dashboard';
    } else {
      if (logo) logo.textContent = 'RYSE';
      if (sub) sub.textContent = 'Command Center';
    }
    if (this.config.enabled) {
      document.documentElement.style.setProperty('--wl-primary', this.config.primaryColor);
      document.documentElement.style.setProperty('--wl-accent', this.config.accentColor);
    } else {
      document.documentElement.style.removeProperty('--wl-primary');
      document.documentElement.style.removeProperty('--wl-accent');
    }
  },

  reset() {
    this.config = { enabled: false, brandName: '', primaryColor: '#a855f7', accentColor: '#6366f1', logoUrl: '', hidePoweredBy: false };
    this.save();
    this.applyBrand();
    const toggle = document.getElementById('wl-toggle');
    if (toggle) toggle.checked = false;
    const nameInput = document.getElementById('wl-brand-name');
    if (nameInput) nameInput.value = '';
    const primaryInput = document.getElementById('wl-primary-color');
    if (primaryInput) primaryInput.value = '#a855f7';
    const accentInput = document.getElementById('wl-accent-color');
    if (accentInput) accentInput.value = '#6366f1';
    const logoInput = document.getElementById('wl-logo-url');
    if (logoInput) logoInput.value = '';
    const hideToggle = document.getElementById('wl-hide-powered');
    if (hideToggle) hideToggle.checked = false;
  }
};

/* ─── Ecosystem Panel Controller ──────────────────────────────── */
const Ecosystem = {
  isOpen: false,
  activeTab: 'marketplace',

  open(tab) {
    this.isOpen = true;
    if (tab) this.activeTab = tab;
    const el = document.getElementById('eco-panel');
    if (el) el.classList.add('eco-open');
    document.body.style.overflow = 'hidden';
    this.setTab(this.activeTab);
    this.render();
  },

  close() {
    this.isOpen = false;
    const el = document.getElementById('eco-panel');
    if (el) el.classList.remove('eco-open');
    document.body.style.overflow = '';
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.eco-tab').forEach(t => t.classList.toggle('active', t.dataset.etab === tab));
    document.querySelectorAll('.eco-pane').forEach(p => p.classList.toggle('active', p.dataset.epane === tab));
  },

  render() {
    if (this.activeTab === 'tabs') { /* Dashboard tabs are external */ }
    else if (this.activeTab === 'marketplace') { WidgetMarketplace.render(); }
    else if (this.activeTab === 'collaborate') { Collaboration.render(); }
    else if (this.activeTab === 'webhooks') { WebhookReceiver.render(); }
    else if (this.activeTab === 'whitelabel') { /* White-label is input-driven */ }
    else if (this.activeTab === 'pwa') { PWASetup.renderStatus(); }
  }
};

/* ─── Boot ────────────────────────────────────────────────────── */
function initEcosystem() {
  DashboardTabs.init();
  ShareableLinks.init();
  WidgetMarketplace.init();
  PWASetup.init();
  Collaboration.init();
  WhiteLabel.init();

  /* Panel events */
  const closeBtn = document.getElementById('eco-close');
  if (closeBtn) closeBtn.addEventListener('click', () => Ecosystem.close());
  const ecoBtn = document.getElementById('eco-btn');
  if (ecoBtn) ecoBtn.addEventListener('click', () => Ecosystem.toggle());

  document.querySelectorAll('.eco-tab').forEach(t => {
    t.addEventListener('click', () => { Ecosystem.setTab(t.dataset.etab); Ecosystem.render(); });
  });
}
