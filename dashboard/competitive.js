/* ═══════════════════════════════════════════════════════════════
   Competitive Intelligence Panel — competitor tracking & analysis
   ═══════════════════════════════════════════════════════════════ */
const CompetitiveIntel = (() => {
  let isOpen = false;

  const COMPETITORS = [
    {
      name: 'CompetitorA (Ahrefs)',
      domain: 'ahrefs.com',
      traffic: '14.2M',
      trafficDelta: '+8.2%',
      dr: 92,
      keywords: '4.8M',
      backlinks: '1.2B',
      topPages: [
        { url: '/blog/seo-checklist', traffic: '245K', keyword: 'seo checklist' },
        { url: '/blog/keyword-research', traffic: '189K', keyword: 'keyword research' },
        { url: '/tools/backlink-checker', traffic: '156K', keyword: 'backlink checker' },
      ],
    },
    {
      name: 'CompetitorB (SEMrush)',
      domain: 'semrush.com',
      traffic: '18.6M',
      trafficDelta: '+5.4%',
      dr: 91,
      keywords: '6.2M',
      backlinks: '980M',
      topPages: [
        { url: '/blog/content-marketing', traffic: '312K', keyword: 'content marketing' },
        { url: '/analytics/traffic', traffic: '278K', keyword: 'website traffic checker' },
        { url: '/features/keyword-magic', traffic: '201K', keyword: 'keyword tool' },
      ],
    },
    {
      name: 'CompetitorC (Moz)',
      domain: 'moz.com',
      traffic: '5.8M',
      trafficDelta: '-2.1%',
      dr: 89,
      keywords: '1.9M',
      backlinks: '420M',
      topPages: [
        { url: '/beginners-guide-to-seo', traffic: '198K', keyword: 'seo guide' },
        { url: '/link-explorer', traffic: '142K', keyword: 'domain authority checker' },
        { url: '/blog/google-algorithm', traffic: '98K', keyword: 'google algorithm update' },
      ],
    },
  ];

  const KEYWORD_GAPS = [
    { keyword: 'ai seo tools', volume: '12.4K', difficulty: 34, yourRank: '-', competitors: ['#3', '#7', '#5'], opportunity: 'high' },
    { keyword: 'automated content optimization', volume: '8.2K', difficulty: 41, yourRank: '#18', competitors: ['#2', '#4', '#9'], opportunity: 'high' },
    { keyword: 'seo audit automation', volume: '6.8K', difficulty: 28, yourRank: '#12', competitors: ['#1', '#3', '#6'], opportunity: 'medium' },
    { keyword: 'enterprise seo platform', volume: '4.5K', difficulty: 67, yourRank: '-', competitors: ['#2', '#1', '#8'], opportunity: 'medium' },
    { keyword: 'content gap analysis tool', volume: '3.9K', difficulty: 38, yourRank: '#22', competitors: ['#1', '#5', '#3'], opportunity: 'high' },
    { keyword: 'backlink monitoring', volume: '9.1K', difficulty: 52, yourRank: '#15', competitors: ['#1', '#2', '#4'], opportunity: 'medium' },
    { keyword: 'rank tracking software', volume: '7.3K', difficulty: 58, yourRank: '#20', competitors: ['#1', '#3', '#2'], opportunity: 'low' },
    { keyword: 'technical seo audit', volume: '5.6K', difficulty: 45, yourRank: '#8', competitors: ['#2', '#1', '#5'], opportunity: 'medium' },
  ];

  const CONTENT_GAPS = [
    { topic: 'AI-Powered SEO Workflows', competitorCoverage: 3, yourCoverage: 0, potentialTraffic: '45K/mo', priority: 'critical' },
    { topic: 'Enterprise Link Building Strategies', competitorCoverage: 2, yourCoverage: 1, potentialTraffic: '28K/mo', priority: 'high' },
    { topic: 'Programmatic SEO at Scale', competitorCoverage: 3, yourCoverage: 0, potentialTraffic: '22K/mo', priority: 'high' },
    { topic: 'Local SEO for Multi-Location', competitorCoverage: 2, yourCoverage: 1, potentialTraffic: '18K/mo', priority: 'medium' },
    { topic: 'Core Web Vitals Optimization', competitorCoverage: 3, yourCoverage: 2, potentialTraffic: '15K/mo', priority: 'medium' },
  ];

  const MARKET_SHARE = [
    { name: 'Ahrefs', share: 28, color: '#f97316' },
    { name: 'SEMrush', share: 34, color: '#22c55e' },
    { name: 'Moz', share: 14, color: '#3b82f6' },
    { name: 'RYSE (You)', share: 8, color: '#a855f7' },
    { name: 'Others', share: 16, color: '#6b7280' },
  ];

  function renderOverview() {
    const container = document.getElementById('ci-overview');
    if (!container) return;
    container.innerHTML = `
      <div class="demo-data-banner">Showing sample competitive data. Real-time competitor tracking requires an enterprise API connection.</div>
      <div class="ci-grid">
        ${COMPETITORS.map(c => `
          <div class="ci-competitor-card">
            <div class="ci-comp-header">
              <div class="ci-comp-name">${c.name}</div>
              <span class="ci-comp-domain">${c.domain}</span>
            </div>
            <div class="ci-comp-metrics">
              <div class="ci-metric">
                <span class="ci-metric-val">${c.traffic}</span>
                <span class="ci-metric-label">Monthly Traffic</span>
                <span class="ci-metric-delta ${c.trafficDelta.startsWith('+') ? 'positive' : 'negative'}">${c.trafficDelta}</span>
              </div>
              <div class="ci-metric">
                <span class="ci-metric-val">${c.dr}</span>
                <span class="ci-metric-label">Domain Rating</span>
              </div>
              <div class="ci-metric">
                <span class="ci-metric-val">${c.keywords}</span>
                <span class="ci-metric-label">Ranking Keywords</span>
              </div>
              <div class="ci-metric">
                <span class="ci-metric-val">${c.backlinks}</span>
                <span class="ci-metric-label">Backlinks</span>
              </div>
            </div>
            <div class="ci-top-pages">
              <h5>Top Pages</h5>
              ${c.topPages.map(p => `
                <div class="ci-page-row">
                  <span class="ci-page-url">${p.url}</span>
                  <span class="ci-page-traffic">${p.traffic}</span>
                  <span class="ci-page-kw">${p.keyword}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderKeywordGaps() {
    const container = document.getElementById('ci-keywords');
    if (!container) return;
    container.innerHTML = `
      <div class="ci-table-wrap">
        <table class="ci-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Volume</th>
              <th>KD</th>
              <th>Your Rank</th>
              <th>Comp A</th>
              <th>Comp B</th>
              <th>Comp C</th>
              <th>Opportunity</th>
            </tr>
          </thead>
          <tbody>
            ${KEYWORD_GAPS.map(k => `
              <tr>
                <td class="ci-kw-cell">${k.keyword}</td>
                <td>${k.volume}</td>
                <td><span class="ci-kd ci-kd-${k.difficulty > 50 ? 'hard' : k.difficulty > 30 ? 'medium' : 'easy'}">${k.difficulty}</span></td>
                <td class="ci-rank-cell">${k.yourRank}</td>
                <td>${k.competitors[0]}</td>
                <td>${k.competitors[1]}</td>
                <td>${k.competitors[2]}</td>
                <td><span class="ci-opp ci-opp-${k.opportunity}">${k.opportunity}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderContentGaps() {
    const container = document.getElementById('ci-content-gaps');
    if (!container) return;
    container.innerHTML = `
      <div class="ci-content-list">
        ${CONTENT_GAPS.map(g => `
          <div class="ci-content-item ci-priority-${g.priority}">
            <div class="ci-content-left">
              <div class="ci-content-topic">${g.topic}</div>
              <div class="ci-content-meta">
                <span>Potential: ${g.potentialTraffic}</span>
                <span>Competitors covering: ${g.competitorCoverage}/3</span>
                <span>Your coverage: ${g.yourCoverage} articles</span>
              </div>
            </div>
            <div class="ci-content-right">
              <span class="ci-priority-badge ci-priority-${g.priority}">${g.priority}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderMarketShare() {
    const container = document.getElementById('ci-market');
    if (!container) return;
    container.innerHTML = `
      <div class="ci-market-chart">
        <div class="ci-market-bars">
          ${MARKET_SHARE.map(m => `
            <div class="ci-market-row">
              <span class="ci-market-name">${m.name}</span>
              <div class="ci-market-bar-track">
                <div class="ci-market-bar-fill" style="width:${m.share}%;background:${m.color}"></div>
              </div>
              <span class="ci-market-pct">${m.share}%</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="ci-market-insights">
        <h5>Market Insights</h5>
        <ul>
          <li>SEMrush leads with 34% market share, up 2% QoQ</li>
          <li>RYSE has grown from 5% to 8% in the last quarter</li>
          <li>Opportunity: AI-first positioning is underserved</li>
          <li>Moz declining \u2014 potential to capture their audience</li>
        </ul>
      </div>
    `;
  }

  function open() {
    const panel = document.getElementById('ci-panel');
    if (!panel) return;
    panel.classList.add('open');
    isOpen = true;
    renderOverview();
    renderKeywordGaps();
    renderContentGaps();
    renderMarketShare();
  }

  function close() {
    const panel = document.getElementById('ci-panel');
    if (!panel) return;
    panel.classList.remove('open');
    isOpen = false;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function init() {
    const btn = document.getElementById('ci-btn');
    const closeBtn = document.getElementById('ci-close');

    if (btn) btn.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', close);

    // Tab switching
    document.querySelectorAll('.ci-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ci-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ci-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.querySelector(`.ci-pane[data-cipane="${tab.dataset.citab}"]`);
        if (pane) pane.classList.add('active');
      });
    });
  }

  return { init, open, close, toggle, get isOpen() { return isOpen; } };
})();

function initCompetitiveIntel() { CompetitiveIntel.init(); }
