/* ═══════════════════════════════════════════════════════════════
   Social Media Tracking Dashboard
   Platforms: Instagram, Twitter/X, LinkedIn, TikTok, YouTube
   Features: Follower tracking, engagement KPIs, growth charts,
             top posts, posting schedule, audience demographics
   ═══════════════════════════════════════════════════════════════ */

const SocialDashboard = {
  isOpen: false,
  activeTab: 'overview',
  chart: null,

  platforms: {
    instagram: {
      name: 'Instagram', color: '#E1306C', icon: 'ig',
      followers: 24800, following: 1240, posts: 342,
      growth7d: 3.2, growth30d: 12.8,
      engagement: 4.7, reach: 89400, impressions: 142000,
      daily: [23100,23250,23480,23700,23950,24200,24500,24800],
      topPosts: [
        { content: 'Behind the scenes of our new product launch...', likes: 1840, comments: 234, shares: 89, date: '2d ago' },
        { content: 'Tips for scaling your Shopify store in 2025', likes: 1560, comments: 178, shares: 112, date: '5d ago' },
        { content: 'Our team at the SEO conference in NYC', likes: 1320, comments: 156, shares: 67, date: '1w ago' }
      ]
    },
    twitter: {
      name: 'Twitter / X', color: '#1DA1F2', icon: 'tw',
      followers: 18200, following: 890, posts: 1247,
      growth7d: 2.1, growth30d: 8.4,
      engagement: 3.2, reach: 156000, impressions: 284000,
      daily: [17200,17350,17500,17680,17820,17950,18100,18200],
      topPosts: [
        { content: 'Thread: 10 SEO mistakes costing you rankings...', likes: 892, comments: 134, shares: 456, date: '1d ago' },
        { content: 'We just hit 18K followers! Thank you all', likes: 1200, comments: 89, shares: 234, date: '3d ago' },
        { content: 'Hot take: AI content needs human editing to rank', likes: 678, comments: 312, shares: 189, date: '6d ago' }
      ]
    },
    linkedin: {
      name: 'LinkedIn', color: '#0A66C2', icon: 'li',
      followers: 12400, following: 560, posts: 198,
      growth7d: 4.5, growth30d: 18.2,
      engagement: 5.8, reach: 67200, impressions: 98000,
      daily: [11200,11400,11650,11850,12000,12150,12300,12400],
      topPosts: [
        { content: 'Why we switched from traditional marketing to...', likes: 2340, comments: 189, shares: 345, date: '3d ago' },
        { content: 'Hiring: Senior SEO Strategist (Remote)', likes: 890, comments: 67, shares: 234, date: '5d ago' },
        { content: 'Case study: How we grew organic traffic 340%', likes: 1780, comments: 145, shares: 267, date: '1w ago' }
      ]
    },
    tiktok: {
      name: 'TikTok', color: '#FF0050', icon: 'tk',
      followers: 8900, following: 340, posts: 87,
      growth7d: 8.7, growth30d: 34.2,
      engagement: 7.2, reach: 234000, impressions: 456000,
      daily: [7200,7500,7800,8000,8200,8400,8700,8900],
      topPosts: [
        { content: 'POV: You discover your site has 200 broken links', likes: 12400, comments: 567, shares: 2340, date: '2d ago' },
        { content: 'Day in the life of an SEO agency owner', likes: 8900, comments: 345, shares: 1560, date: '4d ago' },
        { content: 'This one SEO trick doubled our clients traffic', likes: 6700, comments: 234, shares: 890, date: '6d ago' }
      ]
    },
    youtube: {
      name: 'YouTube', color: '#FF0000', icon: 'yt',
      followers: 5600, following: 0, posts: 64,
      growth7d: 2.8, growth30d: 11.5,
      engagement: 6.1, reach: 45000, impressions: 78000,
      daily: [5100,5180,5250,5320,5380,5450,5520,5600],
      topPosts: [
        { content: 'Complete Shopify SEO Tutorial (2025)', likes: 890, comments: 123, shares: 67, date: '1w ago' },
        { content: 'We Audited 100 Websites — Here\'s What We Found', likes: 1240, comments: 189, shares: 234, date: '2w ago' },
        { content: 'Live SEO Audit: Subscriber Site Review', likes: 567, comments: 234, shares: 45, date: '3w ago' }
      ]
    }
  },

  getOverviewKPIs() {
    const p = this.platforms;
    const totalFollowers = Object.values(p).reduce((s, v) => s + v.followers, 0);
    const totalReach = Object.values(p).reduce((s, v) => s + v.reach, 0);
    const totalImpressions = Object.values(p).reduce((s, v) => s + v.impressions, 0);
    const avgEngagement = (Object.values(p).reduce((s, v) => s + v.engagement, 0) / Object.keys(p).length).toFixed(1);
    const avgGrowth = (Object.values(p).reduce((s, v) => s + v.growth7d, 0) / Object.keys(p).length).toFixed(1);
    return { totalFollowers, totalReach, totalImpressions, avgEngagement, avgGrowth };
  },

  formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  },

  renderOverview() {
    const el = document.getElementById('social-overview');
    if (!el) return;
    const kpi = this.getOverviewKPIs();
    const platforms = Object.entries(this.platforms);

    el.innerHTML = `
      <div class="soc-kpi-row">
        <div class="soc-kpi-card"><div class="soc-kpi-val">${this.formatNum(kpi.totalFollowers)}</div><div class="soc-kpi-label">Total Followers</div></div>
        <div class="soc-kpi-card"><div class="soc-kpi-val">${kpi.avgEngagement}%</div><div class="soc-kpi-label">Avg Engagement</div></div>
        <div class="soc-kpi-card"><div class="soc-kpi-val">${this.formatNum(kpi.totalReach)}</div><div class="soc-kpi-label">Total Reach</div></div>
        <div class="soc-kpi-card"><div class="soc-kpi-val">+${kpi.avgGrowth}%</div><div class="soc-kpi-label">Avg Growth (7d)</div></div>
      </div>
      <div class="soc-platform-grid">${platforms.map(([key, p]) => `
        <div class="soc-platform-card" data-platform="${key}">
          <div class="soc-plat-head">
            <span class="soc-plat-icon" style="background:${p.color}">${p.icon.toUpperCase()}</span>
            <div class="soc-plat-info">
              <span class="soc-plat-name">${p.name}</span>
              <span class="soc-plat-handle">@ryse_seo</span>
            </div>
            <span class="soc-plat-growth">+${p.growth7d}%</span>
          </div>
          <div class="soc-plat-stats">
            <div class="soc-plat-stat"><span class="soc-plat-stat-val">${this.formatNum(p.followers)}</span><span class="soc-plat-stat-label">Followers</span></div>
            <div class="soc-plat-stat"><span class="soc-plat-stat-val">${p.engagement}%</span><span class="soc-plat-stat-label">Engage</span></div>
            <div class="soc-plat-stat"><span class="soc-plat-stat-val">${this.formatNum(p.reach)}</span><span class="soc-plat-stat-label">Reach</span></div>
            <div class="soc-plat-stat"><span class="soc-plat-stat-val">${p.posts}</span><span class="soc-plat-stat-label">Posts</span></div>
          </div>
        </div>`).join('')}
      </div>`;
  },

  renderGrowth() {
    const el = document.getElementById('social-growth');
    if (!el) return;
    const labels = ['7d ago', '6d', '5d', '4d', '3d', '2d', '1d', 'Today'];
    const canvas = document.getElementById('social-growth-chart');
    if (!canvas) {
      el.innerHTML = `<canvas id="social-growth-chart" height="240"></canvas>`;
    }
    const ctx = document.getElementById('social-growth-chart');
    if (!ctx) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    const datasets = Object.entries(this.platforms).map(([key, p]) => ({
      label: p.name,
      data: p.daily,
      borderColor: p.color,
      backgroundColor: 'transparent',
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5
    }));
    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 }, callback: v => v >= 1000 ? (v/1000).toFixed(0) + 'K' : v } }
        },
        plugins: { legend: { position: 'top', labels: { color: 'rgba(255,255,255,.6)', font: { size: 11 }, boxWidth: 12, padding: 15 } } }
      }
    });
  },

  renderTopPosts() {
    const el = document.getElementById('social-posts');
    if (!el) return;
    const allPosts = [];
    Object.entries(this.platforms).forEach(([key, p]) => {
      p.topPosts.forEach(post => allPosts.push({ ...post, platform: p.name, color: p.color, icon: p.icon }));
    });
    allPosts.sort((a, b) => (b.likes + b.shares) - (a.likes + a.shares));
    el.innerHTML = allPosts.slice(0, 8).map(p => `
      <div class="soc-post-card">
        <div class="soc-post-head">
          <span class="soc-post-plat" style="background:${p.color}">${p.icon.toUpperCase()}</span>
          <span class="soc-post-platform-name">${p.platform}</span>
          <span class="soc-post-date">${p.date}</span>
        </div>
        <p class="soc-post-text">${p.content}</p>
        <div class="soc-post-metrics">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> ${this.formatNum(p.likes)}</span>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> ${this.formatNum(p.comments)}</span>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> ${this.formatNum(p.shares)}</span>
        </div>
      </div>`).join('');
  },

  renderAudience() {
    const el = document.getElementById('social-audience');
    if (!el) return;
    const demographics = {
      age: [
        { range: '18-24', pct: 22 }, { range: '25-34', pct: 38 }, { range: '35-44', pct: 24 },
        { range: '45-54', pct: 11 }, { range: '55+', pct: 5 }
      ],
      gender: [{ label: 'Male', pct: 54 }, { label: 'Female', pct: 42 }, { label: 'Other', pct: 4 }],
      topLocations: [
        { city: 'New York', pct: 14 }, { city: 'Los Angeles', pct: 11 }, { city: 'London', pct: 9 },
        { city: 'Toronto', pct: 7 }, { city: 'Sydney', pct: 5 }
      ],
      bestTimes: [
        { day: 'Mon', time: '9:00 AM', engagement: 5.2 },
        { day: 'Tue', time: '12:00 PM', engagement: 6.1 },
        { day: 'Wed', time: '2:00 PM', engagement: 5.8 },
        { day: 'Thu', time: '10:00 AM', engagement: 6.4 },
        { day: 'Fri', time: '11:00 AM', engagement: 5.5 }
      ]
    };
    el.innerHTML = `
      <div class="soc-demo-grid">
        <div class="soc-demo-section">
          <h5 class="soc-demo-title">Age Distribution</h5>
          ${demographics.age.map(a => `<div class="soc-bar-row"><span class="soc-bar-label">${a.range}</span><div class="soc-bar-track"><div class="soc-bar-fill" style="width:${a.pct}%"></div></div><span class="soc-bar-pct">${a.pct}%</span></div>`).join('')}
        </div>
        <div class="soc-demo-section">
          <h5 class="soc-demo-title">Gender</h5>
          ${demographics.gender.map(g => `<div class="soc-bar-row"><span class="soc-bar-label">${g.label}</span><div class="soc-bar-track"><div class="soc-bar-fill" style="width:${g.pct}%"></div></div><span class="soc-bar-pct">${g.pct}%</span></div>`).join('')}
        </div>
        <div class="soc-demo-section">
          <h5 class="soc-demo-title">Top Locations</h5>
          ${demographics.topLocations.map(l => `<div class="soc-bar-row"><span class="soc-bar-label">${l.city}</span><div class="soc-bar-track"><div class="soc-bar-fill" style="width:${l.pct * 3}%"></div></div><span class="soc-bar-pct">${l.pct}%</span></div>`).join('')}
        </div>
        <div class="soc-demo-section">
          <h5 class="soc-demo-title">Best Posting Times</h5>
          ${demographics.bestTimes.map(t => `<div class="soc-time-row"><span class="soc-time-day">${t.day}</span><span class="soc-time-val">${t.time}</span><span class="soc-time-eng">${t.engagement}% eng</span></div>`).join('')}
        </div>
      </div>`;
  },

  open(tab) {
    this.isOpen = true;
    if (tab) this.activeTab = tab;
    const panel = document.getElementById('social-panel');
    if (panel) { panel.classList.add('soc-open'); document.body.style.overflow = 'hidden'; }
    this.setTab(this.activeTab);
    this.render();
  },

  close() {
    this.isOpen = false;
    const panel = document.getElementById('social-panel');
    if (panel) { panel.classList.remove('soc-open'); document.body.style.overflow = ''; }
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  },

  toggle() { this.isOpen ? this.close() : this.open(); },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.soc-tab').forEach(t => t.classList.toggle('active', t.dataset.soctab === tab));
    document.querySelectorAll('.soc-pane').forEach(p => p.classList.toggle('active', p.dataset.socpane === tab));
  },

  render() {
    switch (this.activeTab) {
      case 'overview': this.renderOverview(); break;
      case 'growth': this.renderGrowth(); break;
      case 'posts': this.renderTopPosts(); break;
      case 'audience': this.renderAudience(); break;
    }
  }
};

/* ─── Boot ────────────────────────────────────────────────────── */
function initSocialDashboard() {
  const closeBtn = document.getElementById('soc-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => SocialDashboard.close());

  const socBtn = document.getElementById('soc-btn');
  if (socBtn) socBtn.addEventListener('click', () => SocialDashboard.toggle());

  document.querySelectorAll('.soc-tab').forEach(tab => {
    tab.addEventListener('click', () => { SocialDashboard.setTab(tab.dataset.soctab); SocialDashboard.render(); });
  });

  const panel = document.getElementById('social-panel');
  if (panel) {
    panel.addEventListener('click', (e) => { if (e.target === panel) SocialDashboard.close(); });
  }
}
