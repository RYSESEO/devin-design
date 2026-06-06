/* ─── Connection Health Monitor ───────────────────────────── */
(function() {
  // Module-scoped timer reference to prevent leaks on re-initialization
  var _pingTimer = null;
  var _visibilityHandler = null;

  window.initHealthMonitor = function() {
    var BASE_INTERVAL = 30000; // 30 seconds
    var MAX_INTERVAL = 300000; // 5 minutes cap
    var currentInterval = BASE_INTERVAL;
    var healthData = {}; // { connectorId: { status, latency, lastCheck } }
    var collapsed = localStorage.getItem('ryse-health-collapsed') === 'true';
    var paused = document.hidden; // start paused if tab is already hidden

    // Guard against re-initialization: clear any existing timer
    if (_pingTimer) {
      clearInterval(_pingTimer);
      _pingTimer = null;
    }
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
      _visibilityHandler = null;
    }

    var bar = document.getElementById('health-bar');
    var itemsEl = document.getElementById('health-bar-items');
    var toggleBtn = document.getElementById('health-bar-toggle');
    var diagBtn = document.getElementById('health-diag-btn');
    var diagPanel = document.getElementById('diag-panel');
    var diagClose = document.getElementById('diag-close');
    var diagBody = document.getElementById('diag-body');

    if (!bar || !itemsEl) return;

    // Apply saved collapsed state
    if (collapsed) {
      bar.classList.add('health-bar-collapsed');
    }

    // Toggle collapse
    toggleBtn.addEventListener('click', function() {
      collapsed = !collapsed;
      bar.classList.toggle('health-bar-collapsed', collapsed);
      localStorage.setItem('ryse-health-collapsed', String(collapsed));
    });

    // Diagnostics panel open/close
    diagBtn.addEventListener('click', function() {
      diagPanel.hidden = false;
      document.body.style.overflow = 'hidden';
      renderDiagPanel();
    });

    diagClose.addEventListener('click', closeDiagPanel);
    diagPanel.addEventListener('click', function(e) {
      if (e.target === diagPanel) closeDiagPanel();
    });

    function closeDiagPanel() {
      diagPanel.hidden = true;
      document.body.style.overflow = '';
    }

    // Visibility change: pause pings when tab is backgrounded, resume when visible
    _visibilityHandler = function() {
      if (document.hidden) {
        paused = true;
      } else {
        paused = false;
        // Run an immediate check when tab becomes visible again
        runHealthChecks();
      }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);

    // Get auth token for requests
    function getToken() {
      return typeof window.getToken === 'function' ? window.getToken() : null;
    }

    // Restart the interval with updated timing (for backoff)
    function restartInterval() {
      if (_pingTimer) {
        clearInterval(_pingTimer);
      }
      _pingTimer = setInterval(runHealthChecks, currentInterval);
    }

    // Ping a connector proxy endpoint and measure latency
    function pingConnector(connectorId) {
      var endpoints = {
        shopify: { url: '/api/proxy/shopify', body: { endpoint: '/shop.json', method: 'GET' } },
        github: { url: '/api/proxy/github', body: { endpoint: '/user', method: 'GET' } }
      };

      var config = endpoints[connectorId];
      if (!config) return Promise.resolve(null);

      var token = getToken();
      var start = performance.now();

      return fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify(config.body)
      }).then(function(resp) {
        var latency = Math.round(performance.now() - start);
        if (resp.ok) {
          return { status: 'ok', latency: latency };
        } else if (resp.status >= 500) {
          return { status: 'error', latency: latency };
        } else {
          return { status: 'warn', latency: latency };
        }
      }).catch(function() {
        return { status: 'error', latency: null };
      });
    }

    // Get WebSocket health from realtime client
    function getWebSocketHealth() {
      var client = window.__realtimeClient;
      if (!client) return { status: 'error', latency: null };
      var state = client.state;
      if (state === 'connected') return { status: 'ok', latency: null };
      if (state === 'reconnecting') return { status: 'warn', latency: null };
      return { status: 'error', latency: null };
    }

    // Run a health check cycle
    function runHealthChecks() {
      // Skip pings when tab is backgrounded
      if (paused) return;

      var connectors = typeof ConnectorManager !== 'undefined' ? ConnectorManager.connectors : [];
      var promises = [];
      var hadError = false;

      connectors.forEach(function(connector) {
        if (connector.status === 'connected') {
          var id = connector.id;
          if (id === 'shopify' || id === 'github') {
            promises.push(
              pingConnector(id).then(function(result) {
                if (result) {
                  healthData[id] = {
                    status: result.status,
                    latency: result.latency,
                    lastCheck: Date.now()
                  };
                  if (result.status === 'error' || result.status === 'warn') {
                    hadError = true;
                  }
                }
              })
            );
          }
        }
      });

      // WebSocket status
      var wsHealth = getWebSocketHealth();
      healthData['websocket'] = {
        status: wsHealth.status,
        latency: wsHealth.latency,
        lastCheck: Date.now()
      };

      Promise.all(promises).then(function() {
        renderHealthBar();

        // Exponential backoff on errors, reset on success
        if (hadError) {
          // Double the interval, cap at MAX_INTERVAL
          var newInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
          if (newInterval !== currentInterval) {
            currentInterval = newInterval;
            restartInterval();
          }
        } else if (currentInterval !== BASE_INTERVAL) {
          // All OK: reset to base interval
          currentInterval = BASE_INTERVAL;
          restartInterval();
        }
      });
    }

    // Render health bar items
    function renderHealthBar() {
      var connectors = typeof ConnectorManager !== 'undefined' ? ConnectorManager.connectors : [];
      var html = '';

      connectors.forEach(function(connector) {
        if (connector.status === 'connected') {
          var data = healthData[connector.id];
          var dotClass = 'health-dot';
          var latencyText = '--';

          if (data) {
            dotClass += ' health-dot-' + data.status;
            latencyText = data.latency !== null ? data.latency + 'ms' : '--';
          } else {
            dotClass += ' health-dot-warn';
          }

          html += '<div class="health-item">' +
            '<span class="' + dotClass + '"></span>' +
            '<span class="health-item-name">' + connector.name + '</span>' +
            '<span class="health-item-latency">' + latencyText + '</span>' +
            '</div>';
        }
      });

      // WebSocket
      var wsData = healthData['websocket'];
      var wsDotClass = 'health-dot';
      if (wsData) {
        wsDotClass += ' health-dot-' + wsData.status;
      } else {
        wsDotClass += ' health-dot-error';
      }
      html += '<div class="health-item">' +
        '<span class="' + wsDotClass + '"></span>' +
        '<span class="health-item-name">WebSocket</span>' +
        '<span class="health-item-latency">' + (wsData && wsData.status === 'connected' ? 'live' : wsData ? wsData.status : '--') + '</span>' +
        '</div>';

      itemsEl.innerHTML = html;
    }

    // Render diagnostic panel
    function renderDiagPanel() {
      var connectors = typeof ConnectorManager !== 'undefined' ? ConnectorManager.connectors : [];
      var html = '';

      connectors.forEach(function(connector) {
        html += '<div class="diag-connector">' +
          '<div class="diag-connector-header">' +
          '<h4>' + connector.name + '</h4>' +
          '<span class="diag-status diag-status-' + connector.status + '">' + connector.status + '</span>' +
          '</div>' +
          '<div class="diag-steps" id="diag-steps-' + connector.id + '">' +
          '<div class="diag-step"><span class="diag-step-icon">&#9679;</span> Waiting to run...</div>' +
          '</div>' +
          '<button class="diag-run-btn" data-connector="' + connector.id + '">Run Diagnostics</button>' +
          '</div>';
      });

      // WebSocket entry
      html += '<div class="diag-connector">' +
        '<div class="diag-connector-header">' +
        '<h4>WebSocket</h4>' +
        '<span class="diag-status diag-status-' + (healthData['websocket'] ? healthData['websocket'].status : 'error') + '">' +
        (window.__realtimeClient ? window.__realtimeClient.state : 'disconnected') +
        '</span>' +
        '</div>' +
        '<div class="diag-steps" id="diag-steps-websocket">' +
        '<div class="diag-step"><span class="diag-step-icon">&#9679;</span> Waiting to run...</div>' +
        '</div>' +
        '<button class="diag-run-btn" data-connector="websocket">Run Diagnostics</button>' +
        '</div>';

      diagBody.innerHTML = html;

      // Attach run buttons
      diagBody.querySelectorAll('.diag-run-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var connId = btn.getAttribute('data-connector');
          btn.disabled = true;
          btn.textContent = 'Running...';
          runDiagnostics(connId).then(function() {
            btn.disabled = false;
            btn.textContent = 'Run Diagnostics';
          });
        });
      });
    }

    // Run step-by-step diagnostics for a connector
    function runDiagnostics(connectorId) {
      var stepsEl = document.getElementById('diag-steps-' + connectorId);
      if (!stepsEl) return Promise.resolve();

      var steps = [];

      if (connectorId === 'websocket') {
        steps = [
          { label: 'Check realtime client exists', fn: checkWsClientExists },
          { label: 'Check WebSocket state', fn: checkWsState }
        ];
      } else {
        steps = [
          { label: 'Check credentials saved', fn: function() { return checkCredentials(connectorId); } },
          { label: 'Check server proxy reachable', fn: checkServerHealth },
          { label: 'Check upstream API responds', fn: function() { return checkUpstream(connectorId); } },
          { label: 'Check data parse', fn: function() { return checkDataParse(connectorId); } }
        ];
      }

      // Clear and show running state
      stepsEl.innerHTML = steps.map(function(s) {
        return '<div class="diag-step diag-step-running">' +
          '<span class="diag-step-icon">&#8635;</span> ' + s.label +
          '</div>';
      }).join('');

      // Run each step sequentially
      var idx = 0;
      function runNext() {
        if (idx >= steps.length) return Promise.resolve();
        var step = steps[idx];
        var stepEls = stepsEl.querySelectorAll('.diag-step');
        var currentEl = stepEls[idx];

        return step.fn().then(function(result) {
          if (result.pass) {
            currentEl.className = 'diag-step diag-step-pass';
            currentEl.innerHTML = '<span class="diag-step-icon">&#10003;</span> ' + step.label +
              (result.detail ? ' <span class="diag-step-detail">' + result.detail + '</span>' : '');
          } else {
            currentEl.className = 'diag-step diag-step-fail';
            currentEl.innerHTML = '<span class="diag-step-icon">&#10007;</span> ' + step.label +
              (result.detail ? ' <span class="diag-step-detail">' + result.detail + '</span>' : '');
          }
          idx++;
          return runNext();
        });
      }

      return runNext();
    }

    // Diagnostic step: check credentials
    function checkCredentials(connectorId) {
      var connector = typeof ConnectorManager !== 'undefined' ? ConnectorManager.get(connectorId) : null;
      if (!connector) return Promise.resolve({ pass: false, detail: 'Connector not found' });
      var hasCredentials = connector.status === 'connected' || connector.status === 'connecting';
      return Promise.resolve({
        pass: hasCredentials,
        detail: hasCredentials ? 'Status: ' + connector.status : 'Not connected'
      });
    }

    // Diagnostic step: check server health
    function checkServerHealth() {
      var token = getToken();
      return fetch('/api/health', {
        headers: { 'Authorization': token ? 'Bearer ' + token : '' }
      }).then(function(resp) {
        return { pass: resp.ok, detail: resp.ok ? resp.status + ' OK' : 'Status ' + resp.status };
      }).catch(function(e) {
        return { pass: false, detail: e.message || 'Network error' };
      });
    }

    // Diagnostic step: check upstream API
    function checkUpstream(connectorId) {
      return pingConnector(connectorId).then(function(result) {
        if (!result) return { pass: false, detail: 'No proxy endpoint configured' };
        return {
          pass: result.status === 'ok',
          detail: result.latency !== null ? result.latency + 'ms' : 'Failed'
        };
      });
    }

    // Diagnostic step: check data parse
    function checkDataParse(connectorId) {
      var endpoints = {
        shopify: { url: '/api/proxy/shopify', body: { endpoint: '/shop.json', method: 'GET' } },
        github: { url: '/api/proxy/github', body: { endpoint: '/user', method: 'GET' } }
      };
      var config = endpoints[connectorId];
      if (!config) return Promise.resolve({ pass: false, detail: 'No endpoint' });

      var token = getToken();
      return fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify(config.body)
      }).then(function(resp) {
        if (!resp.ok) return { pass: false, detail: 'HTTP ' + resp.status };
        return resp.json().then(function(data) {
          var hasData = data && typeof data === 'object' && Object.keys(data).length > 0;
          return { pass: hasData, detail: hasData ? 'Valid JSON response' : 'Empty response' };
        });
      }).catch(function(e) {
        return { pass: false, detail: e.message || 'Parse error' };
      });
    }

    // Diagnostic step: check WS client exists
    function checkWsClientExists() {
      var exists = !!window.__realtimeClient;
      return Promise.resolve({ pass: exists, detail: exists ? 'Client initialized' : 'Client not found' });
    }

    // Diagnostic step: check WS state
    function checkWsState() {
      var client = window.__realtimeClient;
      if (!client) return Promise.resolve({ pass: false, detail: 'No client' });
      var state = client.state;
      return Promise.resolve({
        pass: state === 'connected',
        detail: 'State: ' + state
      });
    }

    // Subscribe to connector changes
    if (typeof ConnectorManager !== 'undefined') {
      var _healthCheckInFlight = false;
      var _healthDebounceTimer = null;
      ConnectorManager.subscribe(function() {
        clearTimeout(_healthDebounceTimer);
        _healthDebounceTimer = setTimeout(function() {
          if (_healthCheckInFlight) return;
          _healthCheckInFlight = true;
          var result;
          try {
            result = runHealthChecks();
          } catch (e) {
            _healthCheckInFlight = false;
            return;
          }
          if (result && typeof result.then === 'function') {
            result.then(function() { _healthCheckInFlight = false; })
              .catch(function() { _healthCheckInFlight = false; });
          } else {
            _healthCheckInFlight = false;
          }
        }, 500);
      });
    }

    // Initial check and start interval
    runHealthChecks();
    _pingTimer = setInterval(runHealthChecks, currentInterval);

    // Expose for external use
    window.HealthMonitor = {
      refresh: runHealthChecks,
      runDiagnostics: runDiagnostics,
      getData: function() { return healthData; }
    };
  };
})();
