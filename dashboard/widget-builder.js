/* ═══════════════════════════════════════════════════════════════
   No-Code Widget Builder — visual drag-and-drop widget creation
   ═══════════════════════════════════════════════════════════════ */
const WidgetBuilder = (() => {
  let isOpen = false;
  let widgets = [];
  let draggedType = null;
  let nextId = 1;

  const WIDGET_TYPES = [
    { type: 'kpi', label: 'KPI Card', icon: '#', description: 'Single metric with delta' },
    { type: 'line-chart', label: 'Line Chart', icon: '\u2571', description: 'Time series line graph' },
    { type: 'bar-chart', label: 'Bar Chart', icon: '\u2593', description: 'Vertical bar chart' },
    { type: 'donut', label: 'Donut Chart', icon: '\u25CB', description: 'Pie/donut breakdown' },
    { type: 'table', label: 'Data Table', icon: '\u2261', description: 'Tabular data display' },
    { type: 'text', label: 'Text Block', icon: 'T', description: 'Rich text content' },
    { type: 'progress', label: 'Progress Bar', icon: '\u25AC', description: 'Goal progress indicator' },
    { type: 'list', label: 'Feed/List', icon: '\u2630', description: 'Activity feed or list' },
  ];

  const SAMPLE_DATA = {
    'kpi': { title: 'Total Users', value: '12,480', delta: '+14.2%', positive: true },
    'line-chart': { title: 'Weekly Trend', data: [42, 58, 65, 48, 72, 55, 61] },
    'bar-chart': { title: 'Daily Orders', data: [28, 35, 42, 38, 51, 45, 48] },
    'donut': { title: 'Traffic Sources', segments: [{ label: 'Organic', value: 45 }, { label: 'Paid', value: 25 }, { label: 'Social', value: 20 }, { label: 'Direct', value: 10 }] },
    'table': { title: 'Top Pages', rows: [['/', '12.4K', '3.2%'], ['/blog', '8.1K', '4.1%'], ['/pricing', '5.6K', '6.8%']] },
    'text': { title: 'Notes', content: 'Custom text widget. Double-click to edit.' },
    'progress': { title: 'Q2 Revenue Goal', current: 68, target: 100, unit: '%' },
    'list': { title: 'Recent Events', items: ['User signup spike +22%', 'New campaign launched', 'API latency improved', 'Feature flag enabled'] },
  };

  function createWidget(type, x, y) {
    const id = `wb-${nextId++}`;
    const data = JSON.parse(JSON.stringify(SAMPLE_DATA[type] || {}));
    const widget = { id, type, data, x: x || 0, y: y || widgets.length };
    widgets.push(widget);
    return widget;
  }

  function removeWidget(id) {
    widgets = widgets.filter(w => w.id !== id);
    renderCanvas();
  }

  function renderWidgetPreview(widget) {
    const d = widget.data;
    switch (widget.type) {
      case 'kpi':
        return `<div class="wb-preview-kpi">
          <div class="wb-kpi-title">${d.title}</div>
          <div class="wb-kpi-value">${d.value}</div>
          <div class="wb-kpi-delta ${d.positive ? 'positive' : 'negative'}">${d.delta}</div>
        </div>`;
      case 'line-chart':
        const max = Math.max(...d.data);
        const points = d.data.map((v, i) => `${(i / (d.data.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ');
        return `<div class="wb-preview-chart">
          <div class="wb-chart-title">${d.title}</div>
          <svg viewBox="0 0 100 100" class="wb-mini-chart"><polyline points="${points}" fill="none" stroke="var(--accent, #a855f7)" stroke-width="2"/></svg>
        </div>`;
      case 'bar-chart':
        const bmax = Math.max(...d.data);
        return `<div class="wb-preview-chart">
          <div class="wb-chart-title">${d.title}</div>
          <div class="wb-mini-bars">${d.data.map(v => `<div class="wb-mini-bar" style="height:${(v / bmax) * 100}%"></div>`).join('')}</div>
        </div>`;
      case 'donut':
        return `<div class="wb-preview-donut">
          <div class="wb-chart-title">${d.title}</div>
          <div class="wb-donut-segments">${d.segments.map(s => `<span class="wb-seg">${s.label}: ${s.value}%</span>`).join('')}</div>
        </div>`;
      case 'table':
        return `<div class="wb-preview-table">
          <div class="wb-chart-title">${d.title}</div>
          <table class="wb-mini-table">${d.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
        </div>`;
      case 'text':
        return `<div class="wb-preview-text">
          <div class="wb-chart-title">${d.title}</div>
          <p>${d.content}</p>
        </div>`;
      case 'progress':
        return `<div class="wb-preview-progress">
          <div class="wb-chart-title">${d.title}</div>
          <div class="wb-progress-bar"><div class="wb-progress-fill" style="width:${d.current}%"></div></div>
          <span class="wb-progress-label">${d.current}${d.unit} of ${d.target}${d.unit}</span>
        </div>`;
      case 'list':
        return `<div class="wb-preview-list">
          <div class="wb-chart-title">${d.title}</div>
          <ul>${d.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>`;
      default:
        return `<div class="wb-preview-empty">Widget</div>`;
    }
  }

  function renderCanvas() {
    const canvas = document.getElementById('wb-canvas');
    if (!canvas) return;

    if (widgets.length === 0) {
      canvas.innerHTML = `<div class="wb-empty">
        <div class="wb-empty-icon">\uD83D\uDDBC\uFE0F</div>
        <p>Drag widgets from the palette to build your custom dashboard</p>
      </div>`;
      return;
    }

    canvas.innerHTML = widgets.map(w => `
      <div class="wb-widget" data-id="${w.id}" draggable="true">
        <div class="wb-widget-toolbar">
          <span class="wb-widget-type">${WIDGET_TYPES.find(t => t.type === w.type)?.label || w.type}</span>
          <div class="wb-widget-actions">
            <button class="wb-edit-btn" data-id="${w.id}" title="Edit">\u270E</button>
            <button class="wb-remove-btn" data-id="${w.id}" title="Remove">\u00D7</button>
          </div>
        </div>
        <div class="wb-widget-body">${renderWidgetPreview(w)}</div>
      </div>
    `).join('');

    // Bind remove buttons
    canvas.querySelectorAll('.wb-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeWidget(btn.dataset.id);
      });
    });

    // Make canvas widgets reorderable
    canvas.querySelectorAll('.wb-widget').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', el.dataset.id);
        el.classList.add('wb-dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('wb-dragging');
      });
    });
  }

  function renderPalette() {
    const palette = document.getElementById('wb-palette');
    if (!palette) return;
    palette.innerHTML = WIDGET_TYPES.map(wt => `
      <div class="wb-palette-item" draggable="true" data-type="${wt.type}">
        <span class="wb-palette-icon">${wt.icon}</span>
        <div class="wb-palette-info">
          <span class="wb-palette-label">${wt.label}</span>
          <span class="wb-palette-desc">${wt.description}</span>
        </div>
      </div>
    `).join('');

    palette.querySelectorAll('.wb-palette-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedType = item.dataset.type;
        e.dataTransfer.setData('text/plain', item.dataset.type);
        item.classList.add('wb-palette-dragging');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('wb-palette-dragging');
        draggedType = null;
      });
      // Click to add
      item.addEventListener('click', () => {
        createWidget(item.dataset.type);
        renderCanvas();
      });
    });
  }

  function initCanvasDrop() {
    const canvas = document.getElementById('wb-canvas');
    if (!canvas) return;

    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      canvas.classList.add('wb-canvas-dragover');
    });

    canvas.addEventListener('dragleave', () => {
      canvas.classList.remove('wb-canvas-dragover');
    });

    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      canvas.classList.remove('wb-canvas-dragover');
      const data = e.dataTransfer.getData('text/plain');

      // Check if it's a widget type from palette
      if (WIDGET_TYPES.find(wt => wt.type === data)) {
        createWidget(data);
        renderCanvas();
      } else {
        // Reorder existing widgets
        const draggedId = data;
        const target = e.target.closest('.wb-widget');
        if (target && target.dataset.id !== draggedId) {
          const dragIdx = widgets.findIndex(w => w.id === draggedId);
          const targetIdx = widgets.findIndex(w => w.id === target.dataset.id);
          if (dragIdx > -1 && targetIdx > -1) {
            const [moved] = widgets.splice(dragIdx, 1);
            widgets.splice(targetIdx, 0, moved);
            renderCanvas();
          }
        }
      }
    });
  }

  function renderTemplates() {
    const container = document.getElementById('wb-templates');
    if (!container) return;
    const templates = [
      { name: 'Marketing Dashboard', widgets: ['kpi', 'kpi', 'line-chart', 'donut', 'table'] },
      { name: 'Engineering Metrics', widgets: ['kpi', 'bar-chart', 'progress', 'list'] },
      { name: 'Executive Summary', widgets: ['kpi', 'kpi', 'kpi', 'line-chart', 'donut'] },
      { name: 'Content Tracker', widgets: ['kpi', 'line-chart', 'table', 'list'] },
    ];

    container.innerHTML = templates.map(t => `
      <div class="wb-template-card" data-widgets='${JSON.stringify(t.widgets)}'>
        <div class="wb-template-name">${t.name}</div>
        <div class="wb-template-preview">${t.widgets.map(w => `<span class="wb-template-dot">${WIDGET_TYPES.find(wt => wt.type === w)?.icon || '?'}</span>`).join('')}</div>
        <button class="wb-template-use">Use Template</button>
      </div>
    `).join('');

    container.querySelectorAll('.wb-template-card').forEach(card => {
      card.querySelector('.wb-template-use').addEventListener('click', () => {
        const types = JSON.parse(card.dataset.widgets);
        widgets = [];
        nextId = 1;
        types.forEach(type => createWidget(type));
        renderCanvas();
        // Switch to canvas tab
        document.querySelectorAll('.wb-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.wb-pane').forEach(p => p.classList.remove('active'));
        document.querySelector('.wb-tab[data-wbtab="canvas"]')?.classList.add('active');
        document.querySelector('.wb-pane[data-wbpane="canvas"]')?.classList.add('active');
      });
    });
  }

  function open() {
    const panel = document.getElementById('wb-panel');
    if (!panel) return;
    panel.classList.add('open');
    isOpen = true;
    renderPalette();
    renderCanvas();
    renderTemplates();
    initCanvasDrop();
  }

  function close() {
    const panel = document.getElementById('wb-panel');
    if (!panel) return;
    panel.classList.remove('open');
    isOpen = false;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function init() {
    const btn = document.getElementById('wb-btn');
    const closeBtn = document.getElementById('wb-close');

    if (btn) btn.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', close);

    // Tab switching
    document.querySelectorAll('.wb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.wb-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.wb-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.querySelector(`.wb-pane[data-wbpane="${tab.dataset.wbtab}"]`);
        if (pane) pane.classList.add('active');
      });
    });

    // Clear all
    const clearBtn = document.getElementById('wb-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        widgets = [];
        nextId = 1;
        renderCanvas();
      });
    }
  }

  return { init, open, close, toggle, get isOpen() { return isOpen; } };
})();

function initWidgetBuilder() { WidgetBuilder.init(); }
