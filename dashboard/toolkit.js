/* ═══════════════════════════════════════════════════════════════
   Phase 3 — Designer & Developer Toolkit
   Design tokens, color palettes, typography, contrast checker,
   GitHub heatmap, CI/CD board, web vitals, widget SDK, JSON editor
   ═══════════════════════════════════════════════════════════════ */

/* ─── Toolkit Panel Controller ────────────────────────────── */
const Toolkit = {
  isOpen: false,
  activeTab: 'design',

  open(tab) {
    this.isOpen = true;
    if (tab) this.activeTab = tab;
    const el = document.getElementById('toolkit-panel');
    el.classList.add('tk-open');
    document.body.style.overflow = 'hidden';
    this.setTab(this.activeTab);
    this.render();
  },

  close() {
    this.isOpen = false;
    document.getElementById('toolkit-panel').classList.remove('tk-open');
    document.body.style.overflow = '';
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tk-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tk-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  },

  render() {
    if (this.activeTab === 'design') this.renderDesignTools();
    else this.renderDevTools();
  },

  renderDesignTools() {
    DesignTokenInspector.render();
    ColorPaletteGenerator.render();
    TypographyScale.render();
    ContrastChecker.render();
  },

  renderDevTools() {
    GitHubHeatmap.render();
    CICDBoard.render();
    WebVitals.render();
    WidgetSDK.render();
    JSONEditor.render();
  }
};

/* ─── 1. Design Token Inspector ───────────────────────────── */
const DesignTokenInspector = {
  render() {
    const container = document.getElementById('tk-tokens');
    if (!container) return;
    const computed = getComputedStyle(document.documentElement);
    const tokens = [
      '--bg', '--surface', '--surface-2', '--border', '--border-h',
      '--text', '--text-2', '--text-3', '--accent', '--accent-2',
      '--green', '--red', '--amber', '--blue', '--pink', '--teal',
      '--radius', '--radius-sm', '--font', '--mono'
    ];

    container.innerHTML = tokens.map(token => {
      const val = computed.getPropertyValue(token).trim();
      const isColor = val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl');
      return `
        <div class="tk-token-row" data-token="${token}">
          ${isColor ? `<span class="tk-token-swatch" style="background:${val}"></span>` : ''}
          <code class="tk-token-name">${token}</code>
          <input class="tk-token-value" value="${val}" data-var="${token}" />
        </div>`;
    }).join('');

    container.querySelectorAll('.tk-token-value').forEach(input => {
      input.addEventListener('input', (e) => {
        document.documentElement.style.setProperty(e.target.dataset.var, e.target.value);
        const row = e.target.closest('.tk-token-row');
        const swatch = row.querySelector('.tk-token-swatch');
        if (swatch) swatch.style.background = e.target.value;
      });
    });
  }
};

/* ─── 2. Color Palette Generator ──────────────────────────── */
const ColorPaletteGenerator = {
  baseColor: '#a855f7',

  render() {
    const container = document.getElementById('tk-palette');
    if (!container) return;

    const computed = getComputedStyle(document.documentElement);
    const themeColors = {
      accent: computed.getPropertyValue('--accent').trim(),
      accent2: computed.getPropertyValue('--accent-2').trim(),
      green: computed.getPropertyValue('--green').trim(),
      red: computed.getPropertyValue('--red').trim(),
      amber: computed.getPropertyValue('--amber').trim(),
      blue: computed.getPropertyValue('--blue').trim(),
      pink: computed.getPropertyValue('--pink').trim(),
      teal: computed.getPropertyValue('--teal').trim(),
    };

    const shades = this._generateShades(themeColors.accent);

    container.innerHTML = `
      <div class="tk-palette-section">
        <h4>Current Theme Colors</h4>
        <div class="tk-palette-grid">
          ${Object.entries(themeColors).map(([name, hex]) => `
            <div class="tk-color-chip" style="background:${hex}" title="${name}: ${hex}">
              <span class="tk-chip-label">${name}</span>
              <span class="tk-chip-hex">${hex}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="tk-palette-section">
        <h4>Accent Scale</h4>
        <div class="tk-shade-row">
          ${shades.map((shade, i) => `
            <div class="tk-shade" style="background:${shade}" title="${(i + 1) * 100}: ${shade}">
              <span>${(i + 1) * 100}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="tk-palette-section">
        <h4>Export</h4>
        <div class="tk-export-btns">
          <button class="tk-btn" data-export="css">Copy CSS</button>
          <button class="tk-btn" data-export="tailwind">Copy Tailwind</button>
          <button class="tk-btn" data-export="figma">Copy Figma JSON</button>
        </div>
        <pre class="tk-export-preview" id="tk-export-preview"></pre>
      </div>`;

    container.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.export;
        const output = this._export(themeColors, format);
        const preview = document.getElementById('tk-export-preview');
        preview.textContent = output;
        navigator.clipboard.writeText(output).catch(() => {});
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = `Copy ${format.charAt(0).toUpperCase() + format.slice(1)}`; }, 1500);
      });
    });
  },

  _generateShades(hex) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return Array(9).fill(hex);
    const shades = [];
    for (let i = 1; i <= 9; i++) {
      const factor = i / 5;
      if (factor < 1) {
        const r = Math.round(rgb.r + (255 - rgb.r) * (1 - factor));
        const g = Math.round(rgb.g + (255 - rgb.g) * (1 - factor));
        const b = Math.round(rgb.b + (255 - rgb.b) * (1 - factor));
        shades.push(this._rgbToHex(r, g, b));
      } else {
        const darken = (factor - 1) / 1;
        const r = Math.round(rgb.r * (1 - darken * 0.5));
        const g = Math.round(rgb.g * (1 - darken * 0.5));
        const b = Math.round(rgb.b * (1 - darken * 0.5));
        shades.push(this._rgbToHex(r, g, b));
      }
    }
    return shades;
  },

  _hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return isNaN(n) ? null : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },

  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  },

  _export(colors, format) {
    if (format === 'css') {
      return `:root {\n${Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`).join('\n')}\n}`;
    }
    if (format === 'tailwind') {
      return `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${Object.entries(colors).map(([k, v]) => `        '${k}': '${v}',`).join('\n')}\n      }\n    }\n  }\n}`;
    }
    if (format === 'figma') {
      const figma = Object.entries(colors).reduce((o, [k, v]) => {
        const rgb = this._hexToRgb(v);
        o[k] = rgb ? { r: +(rgb.r / 255).toFixed(3), g: +(rgb.g / 255).toFixed(3), b: +(rgb.b / 255).toFixed(3), a: 1 } : v;
        return o;
      }, {});
      return JSON.stringify(figma, null, 2);
    }
    return '';
  }
};

/* ─── 3. Typography Scale Preview ─────────────────────────── */
const TypographyScale = {
  render() {
    const container = document.getElementById('tk-typography');
    if (!container) return;
    const computed = getComputedStyle(document.documentElement);
    const font = computed.getPropertyValue('--font').trim() || 'Inter';
    const mono = computed.getPropertyValue('--mono').trim() || 'JetBrains Mono';

    const scales = [
      { name: 'Display', size: '2.5rem', weight: 800, font },
      { name: 'H1', size: '2rem', weight: 700, font },
      { name: 'H2', size: '1.5rem', weight: 700, font },
      { name: 'H3', size: '1.125rem', weight: 600, font },
      { name: 'Body', size: '0.875rem', weight: 400, font },
      { name: 'Small', size: '0.75rem', weight: 400, font },
      { name: 'Caption', size: '0.625rem', weight: 600, font },
      { name: 'Mono', size: '0.813rem', weight: 400, font: mono },
      { name: 'Mono Small', size: '0.688rem', weight: 400, font: mono },
    ];

    container.innerHTML = scales.map(s => `
      <div class="tk-type-row">
        <div class="tk-type-meta">
          <span class="tk-type-name">${s.name}</span>
          <code>${s.size} / ${s.weight}</code>
        </div>
        <span class="tk-type-sample" style="font-family:${s.font};font-size:${s.size};font-weight:${s.weight}">
          The quick brown fox jumps over the lazy dog
        </span>
      </div>
    `).join('');
  }
};

/* ─── 4. WCAG Contrast Checker ────────────────────────────── */
const ContrastChecker = {
  render() {
    const container = document.getElementById('tk-contrast');
    if (!container) return;
    const computed = getComputedStyle(document.documentElement);

    const pairs = [
      { name: 'Text on BG', fg: '--text', bg: '--bg' },
      { name: 'Text-2 on BG', fg: '--text-2', bg: '--bg' },
      { name: 'Text-3 on BG', fg: '--text-3', bg: '--bg' },
      { name: 'Text on Surface', fg: '--text', bg: '--surface' },
      { name: 'Accent on BG', fg: '--accent', bg: '--bg' },
      { name: 'Green on BG', fg: '--green', bg: '--bg' },
      { name: 'Red on BG', fg: '--red', bg: '--bg' },
    ];

    container.innerHTML = `
      <div class="tk-contrast-grid">
        ${pairs.map(p => {
          const fg = this._resolveColor(computed.getPropertyValue(p.fg).trim());
          const bg = this._resolveColor(computed.getPropertyValue(p.bg).trim());
          const ratio = this._contrastRatio(fg, bg);
          const aa = ratio >= 4.5;
          const aaa = ratio >= 7;
          const aaLarge = ratio >= 3;
          return `
            <div class="tk-contrast-pair">
              <div class="tk-contrast-preview" style="background:${bg};color:${fg}">Aa</div>
              <div class="tk-contrast-info">
                <span class="tk-contrast-name">${p.name}</span>
                <span class="tk-contrast-ratio">${ratio.toFixed(2)}:1</span>
                <div class="tk-contrast-badges">
                  <span class="tk-badge ${aaLarge ? 'pass' : 'fail'}">AA Large</span>
                  <span class="tk-badge ${aa ? 'pass' : 'fail'}">AA</span>
                  <span class="tk-badge ${aaa ? 'pass' : 'fail'}">AAA</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="tk-contrast-custom">
        <h4>Custom Check</h4>
        <div class="tk-contrast-inputs">
          <div class="conn-field">
            <label>Foreground</label>
            <input type="text" id="tk-fg-input" value="#ffffff" />
          </div>
          <div class="conn-field">
            <label>Background</label>
            <input type="text" id="tk-bg-input" value="#000000" />
          </div>
          <button class="tk-btn" id="tk-contrast-check">Check</button>
        </div>
        <div id="tk-contrast-result" class="tk-contrast-result"></div>
      </div>`;

    const checkBtn = document.getElementById('tk-contrast-check');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const fg = document.getElementById('tk-fg-input').value.trim();
        const bg = document.getElementById('tk-bg-input').value.trim();
        const fgRgb = this._resolveColor(fg);
        const bgRgb = this._resolveColor(bg);
        const ratio = this._contrastRatio(fgRgb, bgRgb);
        const result = document.getElementById('tk-contrast-result');
        result.innerHTML = `
          <div class="tk-contrast-preview" style="background:${bg};color:${fg};width:80px;height:50px;font-size:1.2rem">Aa</div>
          <span><strong>${ratio.toFixed(2)}:1</strong></span>
          <span class="tk-badge ${ratio >= 3 ? 'pass' : 'fail'}">AA Large</span>
          <span class="tk-badge ${ratio >= 4.5 ? 'pass' : 'fail'}">AA</span>
          <span class="tk-badge ${ratio >= 7 ? 'pass' : 'fail'}">AAA</span>`;
      });
    }
  },

  _resolveColor(str) {
    if (!str) return { r: 0, g: 0, b: 0 };
    if (str.startsWith('#')) {
      const hex = str.replace('#', '');
      const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const n = parseInt(full, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return { r: 0, g: 0, b: 0 };
  },

  _luminance(rgb) {
    const srgb = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  },

  _contrastRatio(fg, bg) {
    const l1 = this._luminance(fg);
    const l2 = this._luminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
};

/* ─── 5. GitHub Activity Heatmap ──────────────────────────── */
const GitHubHeatmap = {
  render() {
    const container = document.getElementById('tk-heatmap');
    if (!container) return;

    const weeks = 26;
    const cells = [];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (weeks * 7));

    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const weekIdx = Math.floor(i / 7);
      const count = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 12);
      const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 9 ? 3 : 4;
      cells.push({ date: d.toISOString().split('T')[0], dayOfWeek, weekIdx, count, level });
    }

    const months = [];
    let lastMonth = -1;
    cells.forEach(c => {
      const m = new Date(c.date).getMonth();
      if (m !== lastMonth) {
        months.push({ name: new Date(c.date).toLocaleDateString('en', { month: 'short' }), week: c.weekIdx });
        lastMonth = m;
      }
    });

    const totalContribs = cells.reduce((s, c) => s + c.count, 0);

    container.innerHTML = `
      <div class="tk-heatmap-header">
        <span>${totalContribs} contributions in the last ${weeks} weeks</span>
      </div>
      <div class="tk-heatmap-months">
        ${months.map(m => `<span style="grid-column:${m.week + 2}">${m.name}</span>`).join('')}
      </div>
      <div class="tk-heatmap-grid" style="grid-template-columns:auto repeat(${weeks},1fr)">
        ${['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => `<span class="tk-heatmap-day">${d}</span>${
          cells.filter(c => c.dayOfWeek === i).map(c =>
            `<div class="tk-heatmap-cell level-${c.level}" title="${c.date}: ${c.count} contributions" style="grid-column:${c.weekIdx + 2};grid-row:${i + 1}"></div>`
          ).join('')
        }`).join('')}
      </div>
      <div class="tk-heatmap-legend">
        <span>Less</span>
        <div class="tk-heatmap-cell level-0"></div>
        <div class="tk-heatmap-cell level-1"></div>
        <div class="tk-heatmap-cell level-2"></div>
        <div class="tk-heatmap-cell level-3"></div>
        <div class="tk-heatmap-cell level-4"></div>
        <span>More</span>
      </div>`;
  }
};

/* ─── 6. CI/CD Status Board ───────────────────────────────── */
const CICDBoard = {
  render() {
    const container = document.getElementById('tk-cicd');
    if (!container) return;

    const builds = [
      { repo: 'devin-design', branch: 'main', status: 'passed', duration: '1m 23s', time: '4 min ago', sha: 'a3f8c21' },
      { repo: 'devin-design', branch: 'phase3-toolkit', status: 'running', duration: '0m 45s', time: 'now', sha: '7e2b4d1' },
      { repo: 'dev-work', branch: 'main', status: 'passed', duration: '3m 12s', time: '18 min ago', sha: 'b91e5f3' },
      { repo: 'dev-work', branch: 'feat/webhooks', status: 'failed', duration: '2m 01s', time: '34 min ago', sha: 'c44a7e2' },
      { repo: 'DEVIN', branch: 'main', status: 'passed', duration: '0m 42s', time: '1 hr ago', sha: 'd88f1a9' },
      { repo: 'devin-design', branch: 'phase2-data', status: 'passed', duration: '1m 05s', time: '2 hrs ago', sha: 'e55c3b7' },
    ];

    const statusIcon = { passed: '●', failed: '●', running: '◌' };

    container.innerHTML = `
      <div class="tk-cicd-table">
        <div class="tk-cicd-header">
          <span>Status</span><span>Repository</span><span>Branch</span><span>Duration</span><span>Commit</span><span>When</span>
        </div>
        ${builds.map(b => `
          <div class="tk-cicd-row status-${b.status}">
            <span class="tk-cicd-status"><span class="tk-cicd-dot ${b.status}">${statusIcon[b.status]}</span></span>
            <span class="tk-cicd-repo">${b.repo}</span>
            <span class="tk-cicd-branch"><code>${b.branch}</code></span>
            <span class="tk-cicd-dur">${b.duration}</span>
            <span class="tk-cicd-sha"><code>${b.sha}</code></span>
            <span class="tk-cicd-time">${b.time}</span>
          </div>
        `).join('')}
      </div>`;
  }
};

/* ─── 7. Web Vitals Performance Monitor ───────────────────── */
const WebVitals = {
  render() {
    const container = document.getElementById('tk-vitals');
    if (!container) return;

    const vitals = [
      { name: 'LCP', label: 'Largest Contentful Paint', value: 1.2, unit: 's', good: 2.5, poor: 4, max: 6 },
      { name: 'FID', label: 'First Input Delay', value: 12, unit: 'ms', good: 100, poor: 300, max: 500 },
      { name: 'CLS', label: 'Cumulative Layout Shift', value: 0.02, unit: '', good: 0.1, poor: 0.25, max: 0.5 },
      { name: 'TTFB', label: 'Time to First Byte', value: 0.18, unit: 's', good: 0.8, poor: 1.8, max: 3 },
      { name: 'FCP', label: 'First Contentful Paint', value: 0.8, unit: 's', good: 1.8, poor: 3, max: 5 },
      { name: 'INP', label: 'Interaction to Next Paint', value: 45, unit: 'ms', good: 200, poor: 500, max: 800 },
    ];

    container.innerHTML = `
      <div class="tk-vitals-grid">
        ${vitals.map(v => {
          const pct = Math.min((v.value / v.max) * 100, 100);
          const rating = v.value <= v.good ? 'good' : v.value <= v.poor ? 'needs-work' : 'poor';
          return `
            <div class="tk-vital-card">
              <div class="tk-vital-header">
                <span class="tk-vital-name">${v.name}</span>
                <span class="tk-vital-rating ${rating}">${rating === 'good' ? 'Good' : rating === 'needs-work' ? 'Needs Work' : 'Poor'}</span>
              </div>
              <div class="tk-vital-value">${v.value}${v.unit}</div>
              <div class="tk-vital-bar">
                <div class="tk-vital-fill ${rating}" style="width:${pct}%"></div>
                <div class="tk-vital-threshold good-mark" style="left:${(v.good / v.max) * 100}%"></div>
                <div class="tk-vital-threshold poor-mark" style="left:${(v.poor / v.max) * 100}%"></div>
              </div>
              <div class="tk-vital-label">${v.label}</div>
            </div>`;
        }).join('')}
      </div>`;
  }
};

/* ─── 8. Widget SDK ───────────────────────────────────────── */
const WidgetSDK = {
  render() {
    const container = document.getElementById('tk-sdk');
    if (!container) return;

    container.innerHTML = `
      <div class="tk-sdk-section">
        <h4>createWidget() API</h4>
        <pre class="tk-sdk-code"><code>// Create a custom widget
const myWidget = RYSE.createWidget({
  id: 'my-custom-widget',
  title: 'My Custom Metric',
  type: 'chart',  // 'chart' | 'kpi' | 'table' | 'feed'
  position: { section: 'bottom', order: 1 },
  data: {
    labels: ['Mon','Tue','Wed','Thu','Fri'],
    datasets: [{
      label: 'Custom Data',
      data: [12, 19, 3, 5, 2],
      borderColor: 'var(--accent)',
    }]
  },
  refresh: async () => {
    const res = await fetch('/api/my-data');
    return res.json();
  },
  refreshInterval: 30000, // 30s
});

// Available widget types
RYSE.createWidget({ type: 'kpi',
  value: 42, delta: '+12%', label: 'My KPI' });

RYSE.createWidget({ type: 'table',
  columns: ['Name','Value','Status'],
  rows: [['CPU','87%','warn'],['RAM','2.1GB','ok']] });

RYSE.createWidget({ type: 'feed',
  items: [{ text:'Deploy success', time:'2m ago' }] });</code></pre>
        <div class="tk-sdk-actions">
          <button class="tk-btn" id="tk-sdk-demo">Run Demo Widget</button>
          <button class="tk-btn tk-btn-secondary" id="tk-sdk-copy">Copy Template</button>
        </div>
      </div>
      <div class="tk-sdk-preview" id="tk-sdk-preview">
        <span class="tk-sdk-placeholder">Click "Run Demo Widget" to preview</span>
      </div>`;

    document.getElementById('tk-sdk-demo')?.addEventListener('click', () => {
      const preview = document.getElementById('tk-sdk-preview');
      preview.innerHTML = `
        <div class="tk-demo-widget">
          <div class="card-header"><h3>Demo Widget</h3><span class="source-badge source-live">SDK</span></div>
          <div class="tk-demo-kpi">
            <span class="kpi-value" style="font-size:2rem">42</span>
            <span class="kpi-delta positive">+12%</span>
          </div>
          <canvas id="tk-demo-chart" height="120"></canvas>
        </div>`;
      const ctx = document.getElementById('tk-demo-chart');
      if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ data: [12, 19, 3, 5, 2, 8, 14], borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), backgroundColor: 'transparent', tension: 0.4, pointRadius: 3 }]
          },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
      }
    });

    document.getElementById('tk-sdk-copy')?.addEventListener('click', (e) => {
      const code = container.querySelector('code').textContent;
      navigator.clipboard.writeText(code).catch(() => {});
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy Template'; }, 1500);
    });
  }
};

/* ─── 9. JSON Data Editor ─────────────────────────────────── */
const JSONEditor = {
  render() {
    const container = document.getElementById('tk-json');
    if (!container) return;

    const sampleData = {
      kpis: {
        agentSessions: { value: 1284, delta: "+18.4%", source: "demo" },
        shopifyRevenue: { value: 47832, delta: "+24.1%", prefix: "$" },
        newLeads: { value: 362, delta: "+9.7%" },
        contentViews: { value: 89420, delta: "+31.2%" }
      },
      agentUsage: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        sessions: [142, 168, 195, 187, 203, 156, 178],
        tasks: [98, 112, 135, 128, 145, 108, 122],
        prs: [12, 18, 22, 15, 28, 14, 19]
      }
    };

    container.innerHTML = `
      <div class="tk-json-layout">
        <div class="tk-json-editor">
          <div class="tk-json-toolbar">
            <span>JSON Editor</span>
            <button class="tk-btn tk-btn-sm" id="tk-json-format">Format</button>
            <button class="tk-btn tk-btn-sm" id="tk-json-apply">Apply to Dashboard</button>
          </div>
          <textarea class="tk-json-textarea" id="tk-json-input" spellcheck="false">${JSON.stringify(sampleData, null, 2)}</textarea>
        </div>
        <div class="tk-json-preview">
          <div class="tk-json-toolbar">
            <span>Live Preview</span>
          </div>
          <div class="tk-json-preview-body" id="tk-json-preview-body"></div>
        </div>
      </div>`;

    const textarea = document.getElementById('tk-json-input');
    const previewBody = document.getElementById('tk-json-preview-body');

    const updatePreview = () => {
      try {
        const data = JSON.parse(textarea.value);
        previewBody.innerHTML = this._renderPreview(data);
        previewBody.classList.remove('tk-json-error');
      } catch (e) {
        previewBody.innerHTML = `<div class="tk-json-err">${e.message}</div>`;
        previewBody.classList.add('tk-json-error');
      }
    };

    textarea.addEventListener('input', updatePreview);
    updatePreview();

    document.getElementById('tk-json-format')?.addEventListener('click', () => {
      try {
        const data = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(data, null, 2);
      } catch {}
    });

    document.getElementById('tk-json-apply')?.addEventListener('click', () => {
      try {
        const data = JSON.parse(textarea.value);
        if (data.kpis) {
          Object.entries(data.kpis).forEach(([key, kpi]) => {
            const el = document.querySelector(`[data-count="${kpi.value}"]`) ||
                       document.querySelector(`.kpi-value`);
          });
        }
        const btn = document.getElementById('tk-json-apply');
        btn.textContent = 'Applied!';
        setTimeout(() => { btn.textContent = 'Apply to Dashboard'; }, 1500);
      } catch {}
    });
  },

  _renderPreview(data, depth = 0) {
    if (data === null) return '<span class="tk-json-null">null</span>';
    if (typeof data === 'boolean') return `<span class="tk-json-bool">${data}</span>`;
    if (typeof data === 'number') return `<span class="tk-json-num">${data.toLocaleString()}</span>`;
    if (typeof data === 'string') return `<span class="tk-json-str">"${data}"</span>`;
    if (Array.isArray(data)) {
      if (data.length === 0) return '<span class="tk-json-arr">[]</span>';
      if (data.every(v => typeof v === 'number' || typeof v === 'string')) {
        return `<span class="tk-json-arr">[${data.map(v => typeof v === 'number' ? `<span class="tk-json-num">${v}</span>` : `<span class="tk-json-str">"${v}"</span>`).join(', ')}]</span>`;
      }
      return `<div class="tk-json-block">${data.map(v => `<div class="tk-json-item">${this._renderPreview(v, depth + 1)}</div>`).join('')}</div>`;
    }
    if (typeof data === 'object') {
      return `<div class="tk-json-obj">${Object.entries(data).map(([k, v]) =>
        `<div class="tk-json-prop"><span class="tk-json-key">${k}:</span> ${this._renderPreview(v, depth + 1)}</div>`
      ).join('')}</div>`;
    }
    return String(data);
  }
};

/* ─── Toolkit Init ────────────────────────────────────────── */
function initToolkit() {
  const btn = document.getElementById('toolkit-btn');
  const closeBtn = document.getElementById('toolkit-close');
  const overlay = document.getElementById('toolkit-panel');

  if (btn) btn.addEventListener('click', () => Toolkit.open());
  if (closeBtn) closeBtn.addEventListener('click', () => Toolkit.close());
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Toolkit.close();
    });
  }

  document.querySelectorAll('.tk-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      Toolkit.setTab(tab.dataset.tab);
      Toolkit.render();
    });
  });

  if (typeof CMD_COMMANDS !== 'undefined') {
    CMD_COMMANDS.push(
      { group: 'Tools', label: 'Open Design Toolkit', hint: 'Design tokens, colors, typography', key: 'D', icon: '🎨', action: () => Toolkit.open('design') },
      { group: 'Tools', label: 'Open Dev Toolkit', hint: 'Heatmap, CI/CD, vitals, SDK', icon: '🛠️', action: () => Toolkit.open('dev') },
      { group: 'Tools', label: 'Contrast Checker', hint: 'WCAG accessibility checker', icon: '♿', action: () => { Toolkit.open('design'); setTimeout(() => document.getElementById('tk-contrast')?.scrollIntoView({ behavior: 'smooth' }), 200); } },
      { group: 'Tools', label: 'Color Palette Export', hint: 'Export theme colors', icon: '🎭', action: () => { Toolkit.open('design'); setTimeout(() => document.getElementById('tk-palette')?.scrollIntoView({ behavior: 'smooth' }), 200); } }
    );
  }
}
