import { Router } from 'express';

const router = Router();

// GET /api/embeds/chart/:type - returns full HTML page with Chart.js
router.get('/chart/:type', (req, res) => {
  const { type } = req.params;
  const validTypes = ['line', 'bar', 'pie', 'kpi'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid chart type. Must be: line, bar, pie, or kpi' });
  }

  const { data, labels, title, color } = req.query;

  const chartData = data ? JSON.parse(data) : [10, 20, 30, 40, 50];
  const chartLabels = labels ? JSON.parse(labels) : ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const chartTitle = title || 'Chart';
  const chartColor = color || '#6366f1';

  if (type === 'kpi') {
    const kpiValue = Array.isArray(chartData) ? chartData[0] : chartData;
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${chartTitle}</title>
<style>
body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; background: #f8fafc; }
.kpi { text-align: center; padding: 2rem; }
.kpi-value { font-size: 3rem; font-weight: 700; color: ${chartColor}; }
.kpi-label { font-size: 1rem; color: #64748b; margin-top: 0.5rem; }
</style>
</head>
<body>
<div class="kpi">
<div class="kpi-value">${kpiValue}</div>
<div class="kpi-label">${chartTitle}</div>
</div>
</body>
</html>`;
    res.set('Content-Type', 'text/html');
    return res.send(html);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${chartTitle}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; background: #f8fafc; }
canvas { max-width: 100%; max-height: 100vh; }
</style>
</head>
<body>
<canvas id="chart"></canvas>
<script>
const ctx = document.getElementById('chart').getContext('2d');
new Chart(ctx, {
  type: '${type}',
  data: {
    labels: ${JSON.stringify(chartLabels)},
    datasets: [{
      label: '${chartTitle}',
      data: ${JSON.stringify(chartData)},
      backgroundColor: ${type === 'pie' ? JSON.stringify(chartData.map((_, i) => `hsl(${i * 60}, 70%, 60%)`)) : `'${chartColor}22'`},
      borderColor: '${chartColor}',
      borderWidth: 2,
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    plugins: { title: { display: true, text: '${chartTitle}' } }
  }
});
</script>
</body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
});

// GET /api/embeds/snippet/:type - returns a JavaScript snippet
router.get('/snippet/:type', (req, res) => {
  const { type } = req.params;
  const validTypes = ['line', 'bar', 'pie', 'kpi'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid chart type. Must be: line, bar, pie, or kpi' });
  }

  const { data, labels, title, color } = req.query;

  const chartData = data ? JSON.parse(data) : [10, 20, 30, 40, 50];
  const chartLabels = labels ? JSON.parse(labels) : ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const chartTitle = title || 'Chart';
  const chartColor = color || '#6366f1';

  let snippet;

  if (type === 'kpi') {
    const kpiValue = Array.isArray(chartData) ? chartData[0] : chartData;
    snippet = `(function() {
  var container = document.currentScript.parentElement;
  var div = document.createElement('div');
  div.style.cssText = 'text-align:center;padding:2rem;font-family:system-ui,sans-serif;';
  div.innerHTML = '<div style="font-size:3rem;font-weight:700;color:${chartColor}">${kpiValue}</div><div style="color:#64748b;margin-top:0.5rem">${chartTitle}</div>';
  container.appendChild(div);
})();`;
  } else {
    snippet = `(function() {
  var container = document.currentScript.parentElement;
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  function render() {
    new Chart(canvas.getContext('2d'), {
      type: '${type}',
      data: {
        labels: ${JSON.stringify(chartLabels)},
        datasets: [{
          label: '${chartTitle}',
          data: ${JSON.stringify(chartData)},
          backgroundColor: ${type === 'pie' ? JSON.stringify(chartData.map((_, i) => `hsl(${i * 60}, 70%, 60%)`)) : `'${chartColor}22'`},
          borderColor: '${chartColor}',
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: { responsive: true, plugins: { title: { display: true, text: '${chartTitle}' } } }
    });
  }
  if (typeof Chart !== 'undefined') { render(); }
  else {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = render;
    document.head.appendChild(script);
  }
})();`;
  }

  res.set('Content-Type', 'text/javascript');
  res.send(snippet);
});

export default router;
