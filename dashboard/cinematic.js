/* ═══════════════════════════════════════════════════════════════
   Cinematic Presentation Mode — RYSE Command Center
   Fullscreen auto-cycling dashboard for TVs / client demos
   ═══════════════════════════════════════════════════════════════ */

const Cinematic = {
  isActive: false,
  currentSlide: 0,
  interval: null,
  SLIDE_DURATION: 6000,

  slides: [
    {
      title: 'Agent Performance',
      metric: '1,284',
      metricLabel: 'Total Sessions',
      delta: '+18.4%',
      deltaPositive: true,
      subMetrics: [
        { label: 'Tasks Completed', value: '1,005', color: '#6366f1' },
        { label: 'PRs Merged', value: '139', color: '#22c55e' },
        { label: 'Avg Session', value: '24 min', color: '#14b8a6' },
      ],
      color: '#a855f7',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
    },
    {
      title: 'Shopify Revenue',
      metric: '$47,832',
      metricLabel: 'This Period',
      delta: '+24.1%',
      deltaPositive: true,
      subMetrics: [
        { label: 'Orders', value: '401', color: '#6366f1' },
        { label: 'Avg Order', value: '$119', color: '#22c55e' },
        { label: 'Conversion', value: '3.8%', color: '#f59e0b' },
      ],
      color: '#22c55e',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
    },
    {
      title: 'Lead Pipeline',
      metric: '362',
      metricLabel: 'New Leads',
      delta: '+9.7%',
      deltaPositive: true,
      subMetrics: [
        { label: 'Organic', value: '142', color: '#a855f7' },
        { label: 'Paid Ads', value: '78', color: '#3b82f6' },
        { label: 'Referral', value: '62', color: '#14b8a6' },
      ],
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
    },
    {
      title: 'Content Views',
      metric: '89,420',
      metricLabel: 'Total Views',
      delta: '+31.2%',
      deltaPositive: true,
      subMetrics: [
        { label: 'Blog Posts', value: '12', color: '#ec4899' },
        { label: 'Engagement', value: '5.4k', color: '#f59e0b' },
        { label: 'Shares', value: '892', color: '#a855f7' },
      ],
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
    },
    {
      title: 'Social Media',
      metric: '69.9K',
      metricLabel: 'Total Followers',
      delta: '+12.3%',
      deltaPositive: true,
      subMetrics: [
        { label: 'Instagram', value: '24.5K', color: '#E1306C' },
        { label: 'Twitter / X', value: '18.2K', color: '#1DA1F2' },
        { label: 'LinkedIn', value: '12.8K', color: '#0A66C2' },
      ],
      color: '#E1306C',
      gradient: 'linear-gradient(135deg, #E1306C 0%, #1DA1F2 50%, #0A66C2 100%)',
    },
    {
      title: 'Token Usage',
      metric: '1.95M',
      metricLabel: 'Tokens Consumed',
      delta: '',
      deltaPositive: true,
      subMetrics: [
        { label: 'Claude 3.5', value: '840K', color: '#a855f7' },
        { label: 'GPT-4o', value: '520K', color: '#22c55e' },
        { label: 'Haiku', value: '380K', color: '#14b8a6' },
      ],
      color: '#a855f7',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #14b8a6 100%)',
    },
  ],

  init() {
    this.injectHTML();
    this.bindEvents();
  },

  injectHTML() {
    const el = document.createElement('div');
    el.id = 'cinematic-overlay';
    el.className = 'cin-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="cin-bg">
        <div class="cin-orb cin-orb-1"></div>
        <div class="cin-orb cin-orb-2"></div>
        <div class="cin-orb cin-orb-3"></div>
      </div>
      <div class="cin-header">
        <div class="cin-logo">RYSE <span>Command Center</span></div>
        <div class="cin-controls">
          <button class="cin-ctrl-btn" id="cin-prev" title="Previous">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="cin-ctrl-btn cin-play-btn" id="cin-play" title="Pause">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="cin-play-icon"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <button class="cin-ctrl-btn" id="cin-next" title="Next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="cin-ctrl-btn cin-close-btn" id="cin-close" title="Exit (ESC)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="cin-stage" id="cin-stage"></div>
      <div class="cin-dots" id="cin-dots"></div>
      <div class="cin-timer-bar"><div class="cin-timer-fill" id="cin-timer-fill"></div></div>
      <div class="cin-clock" id="cin-clock"></div>
    `;
    document.body.appendChild(el);
  },

  bindEvents() {
    document.getElementById('cin-close').addEventListener('click', () => this.stop());
    document.getElementById('cin-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('cin-prev').addEventListener('click', () => this.prevSlide());
    document.getElementById('cin-next').addEventListener('click', () => this.nextSlide());
  },

  start() {
    this.isActive = true;
    this.currentSlide = 0;
    document.getElementById('cinematic-overlay').hidden = false;
    document.body.style.overflow = 'hidden';
    this.renderDots();
    this.renderSlide();
    this.startTimer();
    this.updateClock();
    this._clockInterval = setInterval(() => this.updateClock(), 1000);
  },

  stop() {
    this.isActive = false;
    document.getElementById('cinematic-overlay').hidden = true;
    document.body.style.overflow = '';
    this.clearTimer();
    if (this._clockInterval) clearInterval(this._clockInterval);
  },

  togglePlay() {
    const icon = document.getElementById('cin-play-icon');
    if (this.interval) {
      this.clearTimer();
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    } else {
      this.startTimer();
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    }
  },

  startTimer() {
    this.clearTimer();
    const fill = document.getElementById('cin-timer-fill');
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.transition = `width ${this.SLIDE_DURATION}ms linear`;
        fill.style.width = '100%';
      });
    });
    this.interval = setTimeout(() => {
      this.nextSlide();
    }, this.SLIDE_DURATION);
  },

  clearTimer() {
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
  },

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.renderSlide();
    if (this.interval !== null || document.getElementById('cin-play-icon').innerHTML.includes('rect')) {
      this.startTimer();
    }
  },

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.renderSlide();
    if (this.interval !== null || document.getElementById('cin-play-icon').innerHTML.includes('rect')) {
      this.startTimer();
    }
  },

  renderDots() {
    const dots = document.getElementById('cin-dots');
    dots.innerHTML = this.slides.map((_, i) =>
      `<button class="cin-dot${i === 0 ? ' active' : ''}" data-i="${i}"></button>`
    ).join('');
    dots.querySelectorAll('.cin-dot').forEach(d => {
      d.addEventListener('click', () => {
        this.currentSlide = parseInt(d.dataset.i);
        this.renderSlide();
        this.startTimer();
      });
    });
  },

  renderSlide() {
    const slide = this.slides[this.currentSlide];
    const stage = document.getElementById('cin-stage');

    // Update orbs
    document.querySelector('.cin-orb-1').style.background = slide.color;
    document.querySelector('.cin-orb-2').style.background = slide.subMetrics[0]?.color || slide.color;

    stage.innerHTML = `
      <div class="cin-slide cin-slide-enter">
        <div class="cin-slide-accent" style="background:${slide.gradient}"></div>
        <div class="cin-slide-content">
          <div class="cin-slide-label">${slide.title}</div>
          <div class="cin-slide-metric" style="background:${slide.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${slide.metric}</div>
          <div class="cin-slide-metric-label">${slide.metricLabel}</div>
          ${slide.delta ? `<div class="cin-slide-delta ${slide.deltaPositive ? 'positive' : 'negative'}">${slide.delta} vs previous period</div>` : ''}
          <div class="cin-sub-metrics">
            ${slide.subMetrics.map(m => `
              <div class="cin-sub-card">
                <div class="cin-sub-dot" style="background:${m.color}"></div>
                <div class="cin-sub-value">${m.value}</div>
                <div class="cin-sub-label">${m.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Update dots
    document.querySelectorAll('.cin-dot').forEach((d, i) => {
      d.classList.toggle('active', i === this.currentSlide);
    });

    // Animate in
    requestAnimationFrame(() => {
      const el = stage.querySelector('.cin-slide-enter');
      if (el) el.classList.add('cin-slide-active');
    });
  },

  updateClock() {
    const el = document.getElementById('cin-clock');
    const now = new Date();
    el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '  \u2022  ' +
      now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  },
};

function initCinematic() {
  Cinematic.init();
}
