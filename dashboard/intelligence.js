/* ═══════════════════════════════════════════════════════════════
   Phase 4 — Intelligence & Business Tools
   AI Insights, Anomaly Detection, Forecasting, Goal Tracking,
   ROI Calculator, Cohort Analysis, Comparison Mode,
   PDF Reports, Data Annotations
   ═══════════════════════════════════════════════════════════════ */

/* ─── Intelligence Panel Controller ───────────────────────── */
const Intelligence = {
  isOpen: false,
  activeTab: 'insights',

  open(tab) {
    this.isOpen = true;
    if (tab) this.activeTab = tab;
    const el = document.getElementById('intel-panel');
    el.classList.add('intel-open');
    document.body.style.overflow = 'hidden';
    this.setTab(this.activeTab);
    this.render();
  },

  close() {
    this.isOpen = false;
    document.getElementById('intel-panel').classList.remove('intel-open');
    document.body.style.overflow = '';
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.intel-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.intel-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  },

  render() {
    if (this.activeTab === 'insights') this.renderInsights();
    else if (this.activeTab === 'business') this.renderBusiness();
    else if (this.activeTab === 'reports') this.renderReports();
  },

  renderInsights() {
    AIInsights.render();
    AnomalyDetection.render();
    RevenueForecaster.render();
    GoalTracker.render();
  },

  renderBusiness() {
    ROICalculator.render();
    CohortAnalysis.render();
    ComparisonMode.render();
  },

  renderReports() {
    PDFReporter.render();
    DataAnnotations.render();
  }
};

/* ─── Utility: Simple stats helpers ───────────────────────── */
function _mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function _stddev(arr) {
  const m = _mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function _trend(arr) {
  const n = arr.length;
  const xm = (n - 1) / 2;
  const ym = _mean(arr);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - xm) * (arr[i] - ym); den += (i - xm) ** 2; }
  return den === 0 ? 0 : num / den;
}
function _pctChange(a, b) { return a === 0 ? 0 : ((b - a) / a * 100); }
function _fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(0); }
function _fmtMoney(n) { return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

/* ─── Mock Data Store (shared across tools) ───────────────── */
const IntelData = {
  revenue: {
    daily: [6200, 7100, 6800, 7400, 8200, 7900, 8600, 9100, 8800, 9300, 8500, 9600, 10200, 9800,
            10400, 9200, 10800, 11200, 10600, 11800, 11400, 12200, 11900, 12600, 13100, 12400, 13200, 14100],
    labels: Array.from({ length: 28 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 27 + i); return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); }),
    goal: 350000,
    currentTotal: 0,
  },
  agents: {
    daily: [142, 168, 195, 178, 210, 188, 203, 220, 195, 230, 245, 215, 260, 248,
            270, 235, 280, 295, 265, 310, 290, 320, 305, 340, 328, 350, 335, 360],
  },
  leads: {
    daily: [24, 28, 22, 31, 35, 29, 38, 42, 36, 45, 40, 48, 52, 46,
            55, 50, 58, 62, 56, 65, 60, 68, 72, 66, 75, 70, 78, 82],
  },
  content: {
    daily: [2800, 3200, 3100, 3500, 3800, 3600, 4100, 4400, 4200, 4600, 4300, 4800, 5200, 4900,
            5400, 5100, 5600, 6000, 5700, 6200, 5900, 6400, 6800, 6500, 7000, 6700, 7200, 7600],
  },
  products: [
    { name: 'SEO Audit Pro', revenue: 12880, spend: 3200, units: 184 },
    { name: 'Content Engine', revenue: 9940, spend: 2800, units: 142 },
    { name: 'Link Builder Kit', revenue: 6860, spend: 1900, units: 98 },
    { name: 'Keyword Tracker', revenue: 5220, spend: 1400, units: 87 },
    { name: 'Site Speed Boost', revenue: 4410, spend: 1200, units: 63 },
  ],
  cohorts: null,
  annotations: JSON.parse(localStorage.getItem('ryse-annotations') || '[]'),
  goals: JSON.parse(localStorage.getItem('ryse-goals') || 'null'),
};
IntelData.revenue.currentTotal = IntelData.revenue.daily.reduce((a, b) => a + b, 0);
if (!IntelData.goals) {
  IntelData.goals = {
    revenue: { target: 350000, label: 'Q2 Revenue' },
    leads: { target: 1200, label: 'Monthly Leads' },
    agents: { target: 10000, label: 'Agent Sessions' },
    content: { target: 200000, label: 'Content Views' },
  };
}

/* ─── 1. AI Insights Engine ───────────────────────────────── */
const AIInsights = {
  render() {
    const el = document.getElementById('intel-insights');
    if (!el) return;
    const insights = this._generate();
    el.innerHTML = insights.map(i => `
      <div class="insight-card insight-${i.type}">
        <div class="insight-icon">${i.icon}</div>
        <div class="insight-body">
          <p class="insight-text">${i.text}</p>
          <span class="insight-meta">${i.metric} &middot; ${i.timeframe}</span>
        </div>
        <span class="insight-badge insight-badge-${i.type}">${i.label}</span>
      </div>
    `).join('');
  },

  _generate() {
    const rev = IntelData.revenue.daily;
    const revTrend = _trend(rev);
    const revPct = _pctChange(rev.slice(0, 7).reduce((a, b) => a + b, 0), rev.slice(-7).reduce((a, b) => a + b, 0));
    const leads = IntelData.leads.daily;
    const leadTrend = _trend(leads);
    const agents = IntelData.agents.daily;
    const agentPct = _pctChange(agents.slice(0, 7).reduce((a, b) => a + b, 0), agents.slice(-7).reduce((a, b) => a + b, 0));
    const topProduct = IntelData.products.reduce((a, b) => a.revenue > b.revenue ? a : b);

    const insights = [];

    if (revPct > 0) {
      insights.push({
        type: 'positive', icon: '&#x1F4C8;', label: 'Growth',
        text: `Revenue up <strong>${revPct.toFixed(1)}%</strong> week-over-week, driven primarily by <strong>${topProduct.name}</strong> (${_fmtMoney(topProduct.revenue)}).`,
        metric: 'Revenue', timeframe: 'Last 7 days vs prior 7'
      });
    } else {
      insights.push({
        type: 'negative', icon: '&#x1F4C9;', label: 'Decline',
        text: `Revenue down <strong>${Math.abs(revPct).toFixed(1)}%</strong> week-over-week. Investigate channel performance.`,
        metric: 'Revenue', timeframe: 'Last 7 days vs prior 7'
      });
    }

    if (agentPct > 15) {
      insights.push({
        type: 'positive', icon: '&#x1F916;', label: 'Surge',
        text: `Agent sessions surged <strong>${agentPct.toFixed(0)}%</strong> this week. Automation efficiency scaling well.`,
        metric: 'Agents', timeframe: 'Weekly trend'
      });
    }

    if (leadTrend > 1.5) {
      insights.push({
        type: 'positive', icon: '&#x1F465;', label: 'Pipeline',
        text: `Lead volume accelerating at <strong>+${leadTrend.toFixed(1)}/day</strong>. Organic search contributing the most.`,
        metric: 'Leads', timeframe: '28-day trend'
      });
    }

    const goalPct = (IntelData.revenue.currentTotal / IntelData.goals.revenue.target * 100);
    if (goalPct >= 75 && goalPct < 100) {
      insights.push({
        type: 'info', icon: '&#x1F3AF;', label: 'On Track',
        text: `Revenue at <strong>${goalPct.toFixed(0)}%</strong> of Q2 target (${_fmtMoney(IntelData.goals.revenue.target)}). Projected to hit goal in ~${Math.ceil((100 - goalPct) / (revTrend > 0 ? revTrend * 0.1 : 5))} days.`,
        metric: 'Goals', timeframe: 'Quarter progress'
      });
    }

    const contentGrowth = _pctChange(
      IntelData.content.daily.slice(0, 14).reduce((a, b) => a + b, 0),
      IntelData.content.daily.slice(14).reduce((a, b) => a + b, 0)
    );
    insights.push({
      type: contentGrowth > 0 ? 'positive' : 'neutral', icon: '&#x1F4DD;', label: contentGrowth > 0 ? 'Growing' : 'Stable',
      text: `Content views ${contentGrowth > 0 ? 'up' : 'down'} <strong>${Math.abs(contentGrowth).toFixed(1)}%</strong> in the second half of the period. Blog remains the top channel.`,
      metric: 'Content', timeframe: '14-day comparison'
    });

    const bestROI = IntelData.products.reduce((a, b) => (a.revenue / a.spend) > (b.revenue / b.spend) ? a : b);
    insights.push({
      type: 'info', icon: '&#x1F4B0;', label: 'ROI',
      text: `Best ROI: <strong>${bestROI.name}</strong> at ${(bestROI.revenue / bestROI.spend).toFixed(1)}x return. Consider increasing ad spend here.`,
      metric: 'Products', timeframe: 'Current period'
    });

    return insights;
  }
};

/* ─── 2. Anomaly Detection ────────────────────────────────── */
const AnomalyDetection = {
  render() {
    const el = document.getElementById('intel-anomalies');
    if (!el) return;
    const anomalies = this._detect();
    if (anomalies.length === 0) {
      el.innerHTML = '<div class="anomaly-empty">No anomalies detected in the current period.</div>';
      return;
    }
    el.innerHTML = `
      <div class="anomaly-header">
        <span class="anomaly-count">${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected</span>
      </div>
      ${anomalies.map(a => `
        <div class="anomaly-row anomaly-${a.severity}">
          <div class="anomaly-indicator"></div>
          <div class="anomaly-body">
            <span class="anomaly-metric">${a.metric}</span>
            <span class="anomaly-desc">${a.description}</span>
            <span class="anomaly-detail">Day ${a.day + 1} &middot; Value: ${a.value} &middot; Expected: ${a.expected} &plusmn; ${a.threshold}</span>
          </div>
          <span class="anomaly-severity-badge">${a.severity}</span>
        </div>
      `).join('')}
    `;
  },

  _detect() {
    const anomalies = [];
    const datasets = [
      { name: 'Revenue', data: IntelData.revenue.daily, prefix: '$' },
      { name: 'Agent Sessions', data: IntelData.agents.daily, prefix: '' },
      { name: 'Leads', data: IntelData.leads.daily, prefix: '' },
      { name: 'Content Views', data: IntelData.content.daily, prefix: '' },
    ];

    datasets.forEach(ds => {
      const m = _mean(ds.data);
      const sd = _stddev(ds.data);
      ds.data.forEach((val, i) => {
        const zScore = sd === 0 ? 0 : Math.abs(val - m) / sd;
        if (zScore > 2) {
          anomalies.push({
            metric: ds.name,
            day: i,
            value: ds.prefix + _fmt(val),
            expected: ds.prefix + _fmt(m),
            threshold: ds.prefix + _fmt(sd * 2),
            severity: zScore > 3 ? 'critical' : 'warning',
            description: val > m ? 'Unusually high value detected' : 'Unusually low value detected',
          });
        }
      });
    });

    return anomalies.sort((a, b) => (b.severity === 'critical' ? 1 : 0) - (a.severity === 'critical' ? 1 : 0));
  }
};

/* ─── 3. Revenue Forecasting ──────────────────────────────── */
const RevenueForecaster = {
  _chart: null,

  render() {
    const el = document.getElementById('intel-forecast');
    if (!el) return;

    const data = IntelData.revenue.daily;
    const labels = IntelData.revenue.labels.slice();
    const slope = _trend(data);
    const intercept = _mean(data) - slope * (data.length - 1) / 2;

    const forecastDays = 14;
    const forecast = [];
    const upper = [];
    const lower = [];
    const sd = _stddev(data);

    for (let i = 0; i < data.length + forecastDays; i++) {
      const pred = intercept + slope * i;
      forecast.push(Math.round(pred));
      upper.push(Math.round(pred + sd * 1.5));
      lower.push(Math.round(pred - sd * 1.5));
    }

    for (let i = 0; i < forecastDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    }

    const actual = data.slice();
    for (let i = 0; i < forecastDays; i++) actual.push(null);

    el.innerHTML = `
      <div class="forecast-stats">
        <div class="forecast-stat">
          <span class="forecast-stat-val">${_fmtMoney(Math.round(slope * 30 + data[data.length - 1]))}</span>
          <span class="forecast-stat-label">30-day forecast</span>
        </div>
        <div class="forecast-stat">
          <span class="forecast-stat-val">${slope > 0 ? '+' : ''}${_fmtMoney(Math.round(slope))}/day</span>
          <span class="forecast-stat-label">Daily trend</span>
        </div>
        <div class="forecast-stat">
          <span class="forecast-stat-val">&plusmn;${_fmtMoney(Math.round(sd * 1.5))}</span>
          <span class="forecast-stat-label">Confidence band</span>
        </div>
      </div>
      <div class="forecast-chart-wrap"><canvas id="forecast-canvas"></canvas></div>
    `;

    this._buildChart(labels, actual, forecast, upper, lower, data.length);
  },

  _buildChart(labels, actual, forecast, upper, lower, splitIdx) {
    const canvas = document.getElementById('forecast-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    this._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual Revenue',
            data: actual,
            borderColor: '#a855f7',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.3,
            spanGaps: false,
          },
          {
            label: 'Forecast',
            data: forecast.map((v, i) => i >= splitIdx - 1 ? v : null),
            borderColor: '#6366f1',
            borderDash: [6, 4],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            spanGaps: false,
          },
          {
            label: 'Upper Bound',
            data: upper.map((v, i) => i >= splitIdx - 1 ? v : null),
            borderColor: 'transparent',
            backgroundColor: 'rgba(99,102,241,0.08)',
            fill: '+1',
            borderWidth: 0,
            pointRadius: 0,
            tension: 0.3,
            spanGaps: false,
          },
          {
            label: 'Lower Bound',
            data: lower.map((v, i) => i >= splitIdx - 1 ? v : null),
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            borderWidth: 0,
            pointRadius: 0,
            tension: 0.3,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                if (ctx.raw === null) return null;
                return ctx.dataset.label + ': $' + ctx.raw.toLocaleString();
              }
            }
          }
        },
        scales: {
          x: { display: true, grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' }
          }
        }
      }
    });
  }
};

/* ─── 4. Goal Tracking ────────────────────────────────────── */
const GoalTracker = {
  render() {
    const el = document.getElementById('intel-goals');
    if (!el) return;

    const goals = IntelData.goals;
    const actuals = {
      revenue: IntelData.revenue.currentTotal,
      leads: IntelData.leads.daily.reduce((a, b) => a + b, 0),
      agents: IntelData.agents.daily.reduce((a, b) => a + b, 0),
      content: IntelData.content.daily.reduce((a, b) => a + b, 0),
    };

    const rows = Object.entries(goals).map(([key, g]) => {
      const actual = actuals[key] || 0;
      const pct = Math.min((actual / g.target) * 100, 100);
      const status = pct >= 100 ? 'complete' : pct >= 75 ? 'on-track' : pct >= 50 ? 'at-risk' : 'behind';
      const statusLabel = pct >= 100 ? 'Complete' : pct >= 75 ? 'On Track' : pct >= 50 ? 'At Risk' : 'Behind';
      return `
        <div class="goal-row">
          <div class="goal-info">
            <span class="goal-label">${g.label}</span>
            <span class="goal-values">${key === 'revenue' ? _fmtMoney(actual) : _fmt(actual)} / ${key === 'revenue' ? _fmtMoney(g.target) : _fmt(g.target)}</span>
          </div>
          <div class="goal-bar-wrap">
            <div class="goal-bar">
              <div class="goal-fill goal-${status}" style="width:${pct}%"></div>
            </div>
            <span class="goal-pct">${pct.toFixed(0)}%</span>
          </div>
          <span class="goal-status-badge goal-badge-${status}">${statusLabel}</span>
        </div>
      `;
    });

    el.innerHTML = rows.join('');
  }
};

/* ─── 5. ROI Calculator ───────────────────────────────────── */
const ROICalculator = {
  render() {
    const el = document.getElementById('intel-roi');
    if (!el) return;

    el.innerHTML = `
      <div class="roi-grid">
        ${IntelData.products.map(p => {
          const roi = ((p.revenue - p.spend) / p.spend * 100);
          const roas = (p.revenue / p.spend);
          const margin = ((p.revenue - p.spend) / p.revenue * 100);
          const cpa = (p.spend / p.units);
          return `
            <div class="roi-card">
              <h5 class="roi-product">${p.name}</h5>
              <div class="roi-metrics">
                <div class="roi-metric">
                  <span class="roi-val ${roi > 200 ? 'roi-high' : roi > 100 ? 'roi-mid' : 'roi-low'}">${roi.toFixed(0)}%</span>
                  <span class="roi-label">ROI</span>
                </div>
                <div class="roi-metric">
                  <span class="roi-val">${roas.toFixed(1)}x</span>
                  <span class="roi-label">ROAS</span>
                </div>
                <div class="roi-metric">
                  <span class="roi-val">${margin.toFixed(0)}%</span>
                  <span class="roi-label">Margin</span>
                </div>
                <div class="roi-metric">
                  <span class="roi-val">${_fmtMoney(cpa)}</span>
                  <span class="roi-label">CPA</span>
                </div>
              </div>
              <div class="roi-bar-wrap">
                <div class="roi-bar">
                  <div class="roi-spend" style="width:${(p.spend / p.revenue * 100).toFixed(0)}%"><span>Spend ${_fmtMoney(p.spend)}</span></div>
                  <div class="roi-profit" style="width:${((p.revenue - p.spend) / p.revenue * 100).toFixed(0)}%"><span>Profit ${_fmtMoney(p.revenue - p.spend)}</span></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="roi-custom">
        <h5 class="roi-custom-title">Custom ROI Calculator</h5>
        <div class="roi-inputs">
          <div class="roi-field">
            <label>Ad Spend</label>
            <input type="number" id="roi-spend" value="5000" min="0" step="100" />
          </div>
          <div class="roi-field">
            <label>Revenue</label>
            <input type="number" id="roi-revenue" value="18000" min="0" step="100" />
          </div>
          <div class="roi-field">
            <label>Units Sold</label>
            <input type="number" id="roi-units" value="120" min="0" step="1" />
          </div>
          <button class="roi-calc-btn" id="roi-calc-btn">Calculate</button>
        </div>
        <div class="roi-result" id="roi-result"></div>
      </div>
    `;

    this._bindCalc();
    this._calculate();
  },

  _bindCalc() {
    const btn = document.getElementById('roi-calc-btn');
    if (btn) btn.addEventListener('click', () => this._calculate());
    ['roi-spend', 'roi-revenue', 'roi-units'].forEach(id => {
      const inp = document.getElementById(id);
      if (inp) inp.addEventListener('input', () => this._calculate());
    });
  },

  _calculate() {
    const spend = parseFloat(document.getElementById('roi-spend')?.value) || 0;
    const revenue = parseFloat(document.getElementById('roi-revenue')?.value) || 0;
    const units = parseInt(document.getElementById('roi-units')?.value) || 1;
    const el = document.getElementById('roi-result');
    if (!el) return;

    const roi = spend === 0 ? 0 : ((revenue - spend) / spend * 100);
    const roas = spend === 0 ? 0 : (revenue / spend);
    const margin = revenue === 0 ? 0 : ((revenue - spend) / revenue * 100);
    const cpa = units === 0 ? 0 : (spend / units);
    const profit = revenue - spend;

    el.innerHTML = `
      <div class="roi-result-grid">
        <div class="roi-result-item"><span class="roi-result-val ${roi > 200 ? 'roi-high' : roi > 100 ? 'roi-mid' : 'roi-low'}">${roi.toFixed(1)}%</span><span class="roi-result-label">ROI</span></div>
        <div class="roi-result-item"><span class="roi-result-val">${roas.toFixed(2)}x</span><span class="roi-result-label">ROAS</span></div>
        <div class="roi-result-item"><span class="roi-result-val">${margin.toFixed(1)}%</span><span class="roi-result-label">Margin</span></div>
        <div class="roi-result-item"><span class="roi-result-val">${_fmtMoney(cpa)}</span><span class="roi-result-label">Cost per Unit</span></div>
        <div class="roi-result-item"><span class="roi-result-val ${profit >= 0 ? 'roi-high' : 'roi-low'}">${_fmtMoney(profit)}</span><span class="roi-result-label">Net Profit</span></div>
      </div>
    `;
  }
};

/* ─── 6. Customer Cohort Analysis ─────────────────────────── */
const CohortAnalysis = {
  render() {
    const el = document.getElementById('intel-cohorts');
    if (!el) return;

    if (!IntelData.cohorts) IntelData.cohorts = this._generateCohorts();
    const cohorts = IntelData.cohorts;

    const headerCells = ['Cohort', 'Users', ...Array.from({ length: 6 }, (_, i) => `Month ${i}`)];
    el.innerHTML = `
      <div class="cohort-table-wrap">
        <table class="cohort-table">
          <thead><tr>${headerCells.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${cohorts.map(c => `
              <tr>
                <td class="cohort-label">${c.label}</td>
                <td class="cohort-users">${c.users}</td>
                ${c.retention.map((r, i) => {
                  const intensity = Math.round(r / 100 * 255);
                  const bg = `rgba(168,85,247,${(r / 100 * 0.7 + 0.05).toFixed(2)})`;
                  return `<td class="cohort-cell" style="background:${bg}" title="${r}% retention">${r}%</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="cohort-legend">
        <span class="cohort-legend-low">0%</span>
        <div class="cohort-legend-bar"></div>
        <span class="cohort-legend-high">100%</span>
      </div>
    `;
  },

  _generateCohorts() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((m, mi) => {
      const users = 200 + Math.floor(Math.random() * 300);
      const retention = [100];
      for (let i = 1; i < 6; i++) {
        const prev = retention[i - 1];
        const drop = 10 + Math.random() * 20;
        retention.push(Math.max(5, Math.round(prev - drop)));
      }
      return { label: m + ' 2025', users, retention };
    });
  }
};

/* ─── 7. Comparison Mode ──────────────────────────────────── */
const ComparisonMode = {
  _chart: null,

  render() {
    const el = document.getElementById('intel-comparison');
    if (!el) return;

    const currentRev = IntelData.revenue.daily.slice(-14);
    const prevRev = IntelData.revenue.daily.slice(0, 14);
    const labels = Array.from({ length: 14 }, (_, i) => `Day ${i + 1}`);

    const curTotal = currentRev.reduce((a, b) => a + b, 0);
    const prevTotal = prevRev.reduce((a, b) => a + b, 0);
    const change = _pctChange(prevTotal, curTotal);

    el.innerHTML = `
      <div class="compare-header">
        <div class="compare-period">
          <div class="compare-period-item">
            <span class="compare-dot compare-dot-current"></span>
            <span>Current (Last 14 days): <strong>${_fmtMoney(curTotal)}</strong></span>
          </div>
          <div class="compare-period-item">
            <span class="compare-dot compare-dot-prev"></span>
            <span>Previous 14 days: <strong>${_fmtMoney(prevTotal)}</strong></span>
          </div>
          <span class="compare-change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change.toFixed(1)}%</span>
        </div>
      </div>
      <div class="compare-chart-wrap"><canvas id="compare-canvas"></canvas></div>
      <div class="compare-breakdown">
        <div class="compare-metric">
          <span class="compare-metric-label">Avg Daily (Current)</span>
          <span class="compare-metric-val">${_fmtMoney(Math.round(curTotal / 14))}</span>
        </div>
        <div class="compare-metric">
          <span class="compare-metric-label">Avg Daily (Previous)</span>
          <span class="compare-metric-val">${_fmtMoney(Math.round(prevTotal / 14))}</span>
        </div>
        <div class="compare-metric">
          <span class="compare-metric-label">Peak Day (Current)</span>
          <span class="compare-metric-val">${_fmtMoney(Math.max(...currentRev))}</span>
        </div>
        <div class="compare-metric">
          <span class="compare-metric-label">Peak Day (Previous)</span>
          <span class="compare-metric-val">${_fmtMoney(Math.max(...prevRev))}</span>
        </div>
      </div>
    `;

    this._buildChart(labels, currentRev, prevRev);
  },

  _buildChart(labels, current, previous) {
    const canvas = document.getElementById('compare-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Period',
            data: current,
            backgroundColor: 'rgba(168,85,247,0.7)',
            borderColor: '#a855f7',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.4,
            categoryPercentage: 0.8,
          },
          {
            label: 'Previous Period',
            data: previous,
            backgroundColor: 'rgba(99,102,241,0.35)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.4,
            categoryPercentage: 0.8,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) { return ctx.dataset.label + ': $' + ctx.raw.toLocaleString(); }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' }
          }
        }
      }
    });
  }
};

/* ─── 8. PDF Report Generator ─────────────────────────────── */
const PDFReporter = {
  render() {
    const el = document.getElementById('intel-pdf');
    if (!el) return;

    el.innerHTML = `
      <div class="pdf-options">
        <div class="pdf-sections">
          <h5>Include Sections</h5>
          <label class="pdf-check"><input type="checkbox" checked data-section="kpi" /> KPI Summary</label>
          <label class="pdf-check"><input type="checkbox" checked data-section="charts" /> Charts & Trends</label>
          <label class="pdf-check"><input type="checkbox" checked data-section="insights" /> AI Insights</label>
          <label class="pdf-check"><input type="checkbox" checked data-section="forecast" /> Revenue Forecast</label>
          <label class="pdf-check"><input type="checkbox" checked data-section="goals" /> Goal Progress</label>
          <label class="pdf-check"><input type="checkbox" data-section="cohorts" /> Cohort Analysis</label>
          <label class="pdf-check"><input type="checkbox" data-section="roi" /> ROI Breakdown</label>
          <label class="pdf-check"><input type="checkbox" data-section="annotations" /> Data Annotations</label>
        </div>
        <div class="pdf-format">
          <h5>Report Format</h5>
          <label class="pdf-radio"><input type="radio" name="pdf-format" value="executive" checked /> Executive Summary</label>
          <label class="pdf-radio"><input type="radio" name="pdf-format" value="detailed" /> Detailed Report</label>
          <label class="pdf-radio"><input type="radio" name="pdf-format" value="data" /> Data Export (CSV)</label>
        </div>
      </div>
      <div class="pdf-preview" id="pdf-preview">
        <div class="pdf-preview-header">
          <div class="pdf-logo">RYSE Command Center</div>
          <div class="pdf-date">${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="pdf-preview-body">
          <h4>Executive Summary</h4>
          <p>Revenue: <strong>${_fmtMoney(IntelData.revenue.currentTotal)}</strong> (28-day period)</p>
          <p>Agent Sessions: <strong>${_fmt(IntelData.agents.daily.reduce((a, b) => a + b, 0))}</strong></p>
          <p>New Leads: <strong>${_fmt(IntelData.leads.daily.reduce((a, b) => a + b, 0))}</strong></p>
          <p>Content Views: <strong>${_fmt(IntelData.content.daily.reduce((a, b) => a + b, 0))}</strong></p>
          <div class="pdf-separator"></div>
          <h4>Key Insights</h4>
          <ul class="pdf-insights-list">
            ${AIInsights._generate().slice(0, 3).map(i => `<li>${i.text}</li>`).join('')}
          </ul>
        </div>
      </div>
      <div class="pdf-actions">
        <button class="pdf-btn pdf-generate" id="pdf-generate-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Generate PDF Report
        </button>
        <button class="pdf-btn pdf-csv" id="pdf-csv-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Export CSV
        </button>
      </div>
    `;

    this._bindActions();
  },

  _bindActions() {
    document.getElementById('pdf-generate-btn')?.addEventListener('click', () => this._generatePDF());
    document.getElementById('pdf-csv-btn')?.addEventListener('click', () => this._exportCSV());
  },

  _generatePDF() {
    const sections = [];
    document.querySelectorAll('.pdf-check input:checked').forEach(cb => sections.push(cb.dataset.section));
    const format = document.querySelector('input[name="pdf-format"]:checked')?.value || 'executive';

    let content = `RYSE Command Center Report\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Format: ${format}\n`;
    content += `=`.repeat(50) + '\n\n';

    if (sections.includes('kpi')) {
      content += `KPI SUMMARY\n${'-'.repeat(30)}\n`;
      content += `Revenue: ${_fmtMoney(IntelData.revenue.currentTotal)}\n`;
      content += `Agent Sessions: ${IntelData.agents.daily.reduce((a, b) => a + b, 0)}\n`;
      content += `New Leads: ${IntelData.leads.daily.reduce((a, b) => a + b, 0)}\n`;
      content += `Content Views: ${IntelData.content.daily.reduce((a, b) => a + b, 0)}\n\n`;
    }

    if (sections.includes('insights')) {
      content += `AI INSIGHTS\n${'-'.repeat(30)}\n`;
      AIInsights._generate().forEach(i => {
        content += `[${i.label}] ${i.text.replace(/<[^>]+>/g, '')}\n`;
      });
      content += '\n';
    }

    if (sections.includes('forecast')) {
      const slope = _trend(IntelData.revenue.daily);
      content += `REVENUE FORECAST\n${'-'.repeat(30)}\n`;
      content += `Daily trend: ${slope > 0 ? '+' : ''}$${Math.round(slope)}/day\n`;
      content += `30-day projection: ${_fmtMoney(Math.round(slope * 30 + IntelData.revenue.daily[IntelData.revenue.daily.length - 1]))}\n\n`;
    }

    if (sections.includes('goals')) {
      content += `GOAL PROGRESS\n${'-'.repeat(30)}\n`;
      const actuals = {
        revenue: IntelData.revenue.currentTotal,
        leads: IntelData.leads.daily.reduce((a, b) => a + b, 0),
        agents: IntelData.agents.daily.reduce((a, b) => a + b, 0),
        content: IntelData.content.daily.reduce((a, b) => a + b, 0),
      };
      Object.entries(IntelData.goals).forEach(([key, g]) => {
        const pct = Math.min((actuals[key] / g.target) * 100, 100);
        content += `${g.label}: ${pct.toFixed(0)}% (${actuals[key]} / ${g.target})\n`;
      });
      content += '\n';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ryse-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },

  _exportCSV() {
    let csv = 'Date,Revenue,Agent Sessions,Leads,Content Views\n';
    IntelData.revenue.labels.forEach((label, i) => {
      csv += `${label},${IntelData.revenue.daily[i] || ''},${IntelData.agents.daily[i] || ''},${IntelData.leads.daily[i] || ''},${IntelData.content.daily[i] || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ryse-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

/* ─── 9. Data Annotations ─────────────────────────────────── */
const DataAnnotations = {
  render() {
    const el = document.getElementById('intel-annotations');
    if (!el) return;

    const annotations = IntelData.annotations;

    el.innerHTML = `
      <div class="annot-form">
        <div class="annot-form-row">
          <div class="annot-field">
            <label>Date</label>
            <input type="date" id="annot-date" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="annot-field">
            <label>Metric</label>
            <select id="annot-metric">
              <option value="revenue">Revenue</option>
              <option value="agents">Agent Sessions</option>
              <option value="leads">Leads</option>
              <option value="content">Content Views</option>
            </select>
          </div>
          <div class="annot-field annot-field-wide">
            <label>Note</label>
            <input type="text" id="annot-note" placeholder="e.g. Launched new campaign..." />
          </div>
          <button class="annot-add-btn" id="annot-add-btn">+ Add</button>
        </div>
      </div>
      <div class="annot-list" id="annot-list">
        ${annotations.length === 0 ? '<div class="annot-empty">No annotations yet. Add notes to mark important events on your data.</div>' :
          annotations.map((a, i) => `
            <div class="annot-item">
              <div class="annot-item-dot"></div>
              <div class="annot-item-body">
                <span class="annot-item-date">${a.date}</span>
                <span class="annot-item-metric">${a.metric}</span>
                <span class="annot-item-note">${a.note}</span>
              </div>
              <button class="annot-del" data-idx="${i}" title="Remove">&times;</button>
            </div>
          `).join('')}
      </div>
    `;

    this._bind();
  },

  _bind() {
    document.getElementById('annot-add-btn')?.addEventListener('click', () => this._add());
    document.querySelectorAll('.annot-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        IntelData.annotations.splice(idx, 1);
        localStorage.setItem('ryse-annotations', JSON.stringify(IntelData.annotations));
        this.render();
      });
    });
  },

  _add() {
    const date = document.getElementById('annot-date')?.value;
    const metric = document.getElementById('annot-metric')?.value;
    const note = document.getElementById('annot-note')?.value?.trim();
    if (!note) return;

    IntelData.annotations.unshift({ date, metric, note });
    localStorage.setItem('ryse-annotations', JSON.stringify(IntelData.annotations));
    this.render();
  }
};

/* ─── Init ────────────────────────────────────────────────── */
function initIntelligence() {
  const closeBtn = document.getElementById('intel-close');
  if (closeBtn) closeBtn.addEventListener('click', () => Intelligence.close());

  document.querySelectorAll('.intel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      Intelligence.setTab(tab.dataset.tab);
      Intelligence.render();
    });
  });

  const overlay = document.getElementById('intel-panel');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Intelligence.close();
    });
  }
}
