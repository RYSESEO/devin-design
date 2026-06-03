/* ═══════════════════════════════════════════════════════════════
   Onboarding — Guided Walkthrough for RYSE Command Center
   ═══════════════════════════════════════════════════════════════ */

const Onboarding = {
  currentStep: 0,
  isActive: false,
  totalSteps: 0,

  steps: [
    {
      title: 'Welcome to RYSE Command Center',
      desc: 'Your all-in-one dashboard for tracking agent usage, Shopify data, leads, content, social media, and more. Let\u2019s walk through the key features.',
      target: '.topbar',
      position: 'bottom',
      icon: '\u{1F680}',
    },
    {
      title: 'Theme Switcher',
      desc: 'Choose from 4 themes: Default (dark), Liquid Glass (frosted), Brutalist (monospace), and Cyberpunk (neon). Press T to cycle through them.',
      target: '.theme-switcher',
      position: 'bottom',
      icon: '\u{1F3A8}',
    },
    {
      title: 'Command Palette',
      desc: 'Press Ctrl+K to open the command palette. Search and execute any command \u2014 navigate sections, switch themes, export data, and more.',
      target: '#cmd-trigger',
      position: 'bottom',
      icon: '\u2318',
    },
    {
      title: 'Dashboard Views',
      desc: 'Switch between All Metrics, Marketing, Engineering, and Executive views to see data relevant to your role.',
      target: '.dash-tabs-bar',
      position: 'bottom',
      icon: '\u{1F4CA}',
    },
    {
      title: 'KPI Cards',
      desc: 'At-a-glance metrics: Agent Sessions, Shopify Revenue, New Leads, and Content Views. Each card shows trends and percentage changes.',
      target: '.kpi-row',
      position: 'bottom',
      icon: '\u{1F4C8}',
    },
    {
      title: 'Interactive Charts',
      desc: 'Hover over any chart for detailed tooltips. Click the expand button to enter Focus Mode for a fullscreen view. Press F while hovering a widget.',
      target: '.charts-row',
      position: 'top',
      icon: '\u{1F4C9}',
    },
    {
      title: 'Content Hub',
      desc: 'Press C to open the Content Optimization Hub \u2014 SEO analyzer, readability scores, content calendar, keyword research, headline analyzer, briefs, and cross-channel posting.',
      target: '#ch-btn',
      position: 'bottom',
      icon: '\u270F\uFE0F',
    },
    {
      title: 'Social Media Dashboard',
      desc: 'Press M to open Social Media tracking \u2014 follower counts across 5 platforms, growth charts, top posts, audience demographics, and scheduled posts.',
      target: '#soc-btn',
      position: 'bottom',
      icon: '\u{1F4F1}',
    },
    {
      title: 'Intelligence Panel',
      desc: 'Press I for AI-powered insights, anomaly detection, revenue forecasting, goal tracking, ROI calculator, cohort analysis, and PDF reports.',
      target: '#intel-btn',
      position: 'bottom',
      icon: '\u{1F4A1}',
    },
    {
      title: 'Designer & Dev Toolkit',
      desc: 'Press D for design tokens, color palette, typography scale, contrast checker, GitHub heatmap, CI/CD status, web vitals, widget SDK, and JSON editor.',
      target: '#toolkit-btn',
      position: 'bottom',
      icon: '\u{1F6E0}\uFE0F',
    },
    {
      title: 'Ecosystem & Distribution',
      desc: 'Press P for shareable links, widget marketplace, PWA install, team collaboration, webhook receiver, and white-label branding.',
      target: '#eco-btn',
      position: 'bottom',
      icon: '\u{1F30D}',
    },
    {
      title: 'Data Connections',
      desc: 'Press S to connect real APIs: Shopify, GitHub, GA4, Search Console, and Stripe. Toggle Demo/Live mode to switch between sample and real data.',
      target: '#settings-btn',
      position: 'bottom',
      icon: '\u2699\uFE0F',
    },
    {
      title: 'Cinematic Mode',
      desc: 'Press G to launch Cinematic Mode \u2014 a fullscreen auto-cycling presentation perfect for TVs, lobby screens, or client demos.',
      target: '.topbar-right',
      position: 'bottom',
      icon: '\u{1F3AC}',
    },
    {
      title: 'Keyboard Shortcuts',
      desc: 'Press ? to see all keyboard shortcuts. Every feature is accessible from the keyboard for maximum efficiency.',
      target: '.topbar',
      position: 'bottom',
      icon: '\u2328\uFE0F',
    },
    {
      title: 'You\u2019re All Set!',
      desc: 'Explore the dashboard, connect your data sources, and customize your experience. You can relaunch this tour anytime from the command palette or by pressing H.',
      target: '.dashboard',
      position: 'top',
      icon: '\u2728',
    },
  ],

  init() {
    this.totalSteps = this.steps.length;
    this.injectHTML();
    this.bindEvents();

    const seen = localStorage.getItem('ryse-onboarding-seen');
    if (!seen) {
      setTimeout(() => this.start(), 800);
    }
  },

  injectHTML() {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'ob-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="ob-spotlight" id="ob-spotlight"></div>
      <div class="ob-card" id="ob-card">
        <div class="ob-card-header">
          <span class="ob-icon" id="ob-icon"></span>
          <span class="ob-step-count" id="ob-step-count"></span>
        </div>
        <h3 class="ob-title" id="ob-title"></h3>
        <p class="ob-desc" id="ob-desc"></p>
        <div class="ob-progress">
          <div class="ob-progress-bar" id="ob-progress-bar"></div>
        </div>
        <div class="ob-actions">
          <button class="ob-skip" id="ob-skip">Skip Tour</button>
          <div class="ob-nav">
            <button class="ob-prev" id="ob-prev">Back</button>
            <button class="ob-next" id="ob-next">Next</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  bindEvents() {
    document.getElementById('ob-next').addEventListener('click', () => this.next());
    document.getElementById('ob-prev').addEventListener('click', () => this.prev());
    document.getElementById('ob-skip').addEventListener('click', () => this.finish());
  },

  start() {
    this.currentStep = 0;
    this.isActive = true;
    document.getElementById('onboarding-overlay').hidden = false;
    document.body.style.overflow = 'hidden';
    this.renderStep();
  },

  next() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.finish();
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  finish() {
    this.isActive = false;
    document.getElementById('onboarding-overlay').hidden = true;
    document.body.style.overflow = '';
    localStorage.setItem('ryse-onboarding-seen', '1');
  },

  renderStep() {
    const step = this.steps[this.currentStep];
    document.getElementById('ob-icon').textContent = step.icon;
    document.getElementById('ob-title').textContent = step.title;
    document.getElementById('ob-desc').textContent = step.desc;
    document.getElementById('ob-step-count').textContent = `${this.currentStep + 1} / ${this.totalSteps}`;
    document.getElementById('ob-progress-bar').style.width = `${((this.currentStep + 1) / this.totalSteps) * 100}%`;

    const prevBtn = document.getElementById('ob-prev');
    prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';

    const nextBtn = document.getElementById('ob-next');
    nextBtn.textContent = this.currentStep === this.totalSteps - 1 ? 'Get Started' : 'Next';

    this.positionSpotlight(step);
    this.positionCard(step);
  },

  positionSpotlight(step) {
    const spotlight = document.getElementById('ob-spotlight');
    const target = document.querySelector(step.target);
    if (!target) {
      spotlight.style.display = 'none';
      return;
    }
    spotlight.style.display = 'block';
    const rect = target.getBoundingClientRect();
    const pad = 8;
    spotlight.style.top = (rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  positionCard(step) {
    const card = document.getElementById('ob-card');
    const target = document.querySelector(step.target);
    if (!target) {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const cardW = 380;
    const cardH = 280;
    const gap = 16;

    card.style.transform = 'none';

    if (step.position === 'bottom') {
      let top = rect.bottom + gap;
      if (top + cardH > window.innerHeight) top = rect.top - cardH - gap;
      let left = rect.left + rect.width / 2 - cardW / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - cardW - 16));
      card.style.top = top + 'px';
      card.style.left = left + 'px';
    } else {
      let top = rect.top - cardH - gap;
      if (top < 16) top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - cardW / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - cardW - 16));
      card.style.top = top + 'px';
      card.style.left = left + 'px';
    }
  },
};

function initOnboarding() {
  Onboarding.init();
}
