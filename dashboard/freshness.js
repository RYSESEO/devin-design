/* ─── Data Freshness Timestamps & Streaming Indicators ────── */
window.initFreshness = function() {
  // Map widget names to their DataStore keys
  var WIDGET_KEY_MAP = {
    'agents': 'agent_sessions',
    'revenue': 'shopify_revenue',
    'leads-kpi': 'lead_sources',
    'content-kpi': 'content_views',
    'agent-usage': 'github_activity',
    'lead-sources': 'lead_sources',
    'shopify': 'shopify_orders_chart',
    'content-perf': 'content_chart',
    'agent-feed': 'github_activity',
    'top-products': 'shopify_products',
    'pipeline': 'lead_sources',
    'channels': 'content_chart',
    'tokens': null,
    'quick-stats': null
  };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function formatAge(seconds) {
    if (seconds < 60) return 'Updated ' + Math.round(seconds) + 's ago';
    var minutes = Math.round(seconds / 60);
    return 'Updated ' + minutes + 'm ago';
  }

  function getFreshnessClass(seconds) {
    if (seconds < 30) return 'freshness-ok';
    if (seconds <= 60) return 'freshness-warn';
    return 'freshness-stale';
  }

  function updateFreshnessElements() {
    var elements = document.querySelectorAll('.widget-freshness');
    elements.forEach(function(el) {
      var widgetName = el.getAttribute('data-freshness');
      if (!widgetName) return;

      var dataKey = WIDGET_KEY_MAP[widgetName];

      // Demo-only widgets (no DataStore key)
      if (dataKey === null || dataKey === undefined) {
        el.textContent = 'Demo data';
        el.className = 'widget-freshness freshness-demo';
        return;
      }

      // Check if in demo mode
      if (typeof ConnectorManager !== 'undefined' && ConnectorManager.demoMode) {
        el.textContent = 'Demo data';
        el.className = 'widget-freshness freshness-demo';
        return;
      }

      // Check DataStore for the key
      if (typeof DataStore !== 'undefined') {
        var entry = DataStore.get(dataKey);
        if (!entry) {
          el.textContent = 'Demo data';
          el.className = 'widget-freshness freshness-demo';
          return;
        }

        if (entry.source === 'demo') {
          el.textContent = 'Demo data';
          el.className = 'widget-freshness freshness-demo';
          return;
        }

        var ageSeconds = (Date.now() - entry.updatedAt) / 1000;
        el.textContent = formatAge(ageSeconds);
        el.className = 'widget-freshness ' + getFreshnessClass(ageSeconds);
      }
    });
  }

  // Update freshness every 5 seconds
  updateFreshnessElements();
  setInterval(updateFreshnessElements, 5000);

  // Subscribe to DataStore updates for pulse animations
  if (typeof DataStore !== 'undefined') {
    DataStore.subscribe(function(key) {
      // Find widget(s) that map to this key
      var widgetNames = [];
      for (var name in WIDGET_KEY_MAP) {
        if (WIDGET_KEY_MAP[name] === key) {
          widgetNames.push(name);
        }
      }

      widgetNames.forEach(function(widgetName) {
        // Pulse the widget card
        var card = document.querySelector('[data-widget="' + widgetName + '"]');
        if (card && !prefersReducedMotion) {
          card.classList.add('widget-pulse');
          setTimeout(function() {
            card.classList.remove('widget-pulse');
          }, 600);
        }

        // Ping the source badge
        var badge = document.querySelector('[data-source-badge="' + widgetName + '"]');
        if (badge && !prefersReducedMotion) {
          badge.classList.add('source-badge-ping');
          setTimeout(function() {
            badge.classList.remove('source-badge-ping');
          }, 600);
        }

        // Immediately update the freshness text for this widget
        var freshnessEl = document.querySelector('[data-freshness="' + widgetName + '"]');
        if (freshnessEl && typeof DataStore !== 'undefined') {
          var entry = DataStore.get(key);
          if (entry && entry.source !== 'demo') {
            var ageSeconds = (Date.now() - entry.updatedAt) / 1000;
            freshnessEl.textContent = formatAge(ageSeconds);
            freshnessEl.className = 'widget-freshness ' + getFreshnessClass(ageSeconds);
          }
        }
      });
    });
  }
};
