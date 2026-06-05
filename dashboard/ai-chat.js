/* ═══════════════════════════════════════════════════════════════
   AI Chat Assistant — Conversational sidebar with data queries
   ═══════════════════════════════════════════════════════════════ */
const AIChatAssistant = (() => {
  let isOpen = false;
  let messages = [];
  let isTyping = false;

  const SAMPLE_RESPONSES = {
    revenue: "Based on the current 7-day data, Shopify revenue is **$47,832** (+24.1% vs previous period). Top contributor: SEO Audit Pro with $12,880 in revenue. The trend shows consistent growth with Thursday being the peak day at $8,400.",
    leads: "You have **362 new leads** this period (+9.7%). Lead sources breakdown:\n- Organic Search: 142 (39%)\n- Paid Ads: 78 (22%)\n- Referral: 62 (17%)\n- Social: 48 (13%)\n- Direct: 32 (9%)\n\nConversion rate from visitor to lead is 2.9%.",
    agents: "Agent activity summary:\n- **1,284 sessions** this period (+18.4%)\n- 156 tasks completed\n- 23 PRs merged\n- Average response time: 4.2s\n- Uptime: 99.7%\n\nDevin has been most active on PR reviews and deployments.",
    content: "Content performance highlights:\n- **89,420 total views** (+31.2%)\n- Blog leads with 34,200 views (38%)\n- Top post: \"2025 SEO Guide\" drove 14,200 views alone\n- Newsletter open rate: 42%\n- Engagement rate: 6.8%",
    tokens: "Token usage this period:\n- Claude 3.5 Sonnet: 840k tokens (43%)\n- GPT-4o: 520k tokens (27%)\n- Claude 3 Haiku: 380k tokens (19%)\n- GPT-4o mini: 210k tokens (11%)\n\nTotal spend: $2,140 for the 7-day period.",
    forecast: "Based on current trends, projected metrics for next 30 days:\n- Revenue: ~$198,000 (+18% growth trajectory)\n- New leads: ~1,500\n- Agent sessions: ~5,600\n- Content views: ~380,000\n\nConfidence band: \u00b112% based on weekly variance.",
    help: "I can help you with:\n- **Revenue** \u2014 Shopify sales, orders, top products\n- **Leads** \u2014 Pipeline, sources, conversion rates\n- **Agents** \u2014 Session data, tasks, PR activity\n- **Content** \u2014 Views, engagement, top posts\n- **Tokens** \u2014 Usage by model, spend\n- **Forecast** \u2014 Projected metrics\n\nJust ask naturally, e.g. \"How are leads doing?\" or \"Show me token spend\".",
  };

  const QUICK_PROMPTS = [
    { label: 'Revenue summary', query: 'revenue' },
    { label: 'Lead breakdown', query: 'leads' },
    { label: 'Agent activity', query: 'agents' },
    { label: 'Content stats', query: 'content' },
    { label: 'Token usage', query: 'tokens' },
    { label: '30-day forecast', query: 'forecast' },
  ];

  function detectIntent(text) {
    const lower = text.toLowerCase();
    if (/revenue|sales|shopify|orders|money|income|earning/.test(lower)) return 'revenue';
    if (/lead|pipeline|conversion|funnel|prospect/.test(lower)) return 'leads';
    if (/agent|devin|session|task|pr|merge|deploy/.test(lower)) return 'agents';
    if (/content|blog|views|engagement|post|article/.test(lower)) return 'content';
    if (/token|usage|spend|cost|model|claude|gpt/.test(lower)) return 'tokens';
    if (/forecast|predict|project|next|future|trend/.test(lower)) return 'forecast';
    return 'help';
  }

  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/- /g, '&bull; ');
  }

  function renderMessages() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    container.innerHTML = messages.map(function(m) {
      var msgHtml = '<div class="ai-msg ai-msg-' + m.role + '">' +
        '<div class="ai-msg-avatar">' + (m.role === 'user' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="10" y1="21" x2="14" y2="21"/></svg>') + '</div>' +
        '<div class="ai-msg-body">' + formatMessage(m.text);
      if (m.chart) {
        msgHtml += '<div class="ai-inline-chart"><canvas id="' + m.chart.id + '" width="280" height="140"></canvas></div>';
      }
      msgHtml += '</div></div>';
      return msgHtml;
    }).join('') + (isTyping ? '<div class="ai-msg ai-msg-assistant"><div class="ai-msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="10" y1="21" x2="14" y2="21"/></svg></div><div class="ai-msg-body ai-typing"><span></span><span></span><span></span></div></div>' : '');
    container.scrollTop = container.scrollHeight;
  }

  function sendMessage(text) {
    if (!text.trim() || isTyping) return;
    messages.push({ role: 'user', text: text.trim() });
    isTyping = true;
    renderMessages();

    // Try server query first
    var token = (typeof window.getToken === 'function') ? window.getToken() : null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch('/api/intelligence/query', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ question: text.trim() })
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(result) {
      isTyping = false;
      if (result && result.data) {
        // Data query response with chart
        var chartId = 'ai-chart-' + Date.now();
        var msgText = '**' + result.title + '**\n\n' + result.summary;

        // Check for live data
        if (typeof ConnectorManager !== 'undefined' && !ConnectorManager.demoMode && typeof DataStore !== 'undefined') {
          var storeEntry = DataStore.get(result.metric);
          if (storeEntry && storeEntry.source !== 'demo') {
            msgText += '\n\n_Using live data from ' + storeEntry.source + '_';
          }
        }

        messages.push({ role: 'assistant', text: msgText, chart: { id: chartId, type: result.chartType, data: result.data, title: result.title } });
      } else if (result && result.summary) {
        messages.push({ role: 'assistant', text: result.summary });
      } else {
        // Fallback to local intent detection
        var intent = detectIntent(text);
        messages.push({ role: 'assistant', text: SAMPLE_RESPONSES[intent] || SAMPLE_RESPONSES.help });
      }
      renderMessages();
      renderPendingCharts();
    })
    .catch(function() {
      // Fallback to local responses on network error
      isTyping = false;
      var intent = detectIntent(text);
      messages.push({ role: 'assistant', text: SAMPLE_RESPONSES[intent] || SAMPLE_RESPONSES.help });
      renderMessages();
    });
  }

  function renderPendingCharts() {
    messages.forEach(function(m) {
      if (m.chart && !m.chart.rendered) {
        var canvas = document.getElementById(m.chart.id);
        if (canvas) {
          renderInlineChart(canvas, m.chart.type, m.chart.data, m.chart.title);
          m.chart.rendered = true;
        }
      }
    });
  }

  function renderInlineChart(canvas, type, data, title) {
    if (!canvas || typeof Chart === 'undefined') return;
    var ctx = canvas.getContext('2d');
    var chartColors = ['#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#22c55e'];

    var config = {
      type: type === 'doughnut' ? 'doughnut' : (type === 'bar' ? 'bar' : 'line'),
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: type === 'doughnut' ? chartColors.slice(0, data.values.length) : 'rgba(168, 85, 247, 0.2)',
          borderColor: type === 'doughnut' ? chartColors.slice(0, data.values.length) : '#a855f7',
          borderWidth: type === 'doughnut' ? 0 : 2,
          fill: type === 'line',
          tension: 0.4,
          pointRadius: type === 'line' ? 2 : 0,
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: type === 'doughnut', position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } } }, title: { display: false } },
        scales: type === 'doughnut' ? {} : {
          x: { ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    };

    new Chart(ctx, config);
  }

  function open() {
    const panel = document.getElementById('ai-chat-panel');
    if (!panel) return;
    panel.classList.add('open');
    isOpen = true;
    document.getElementById('ai-chat-input')?.focus();
  }

  function close() {
    const panel = document.getElementById('ai-chat-panel');
    if (!panel) return;
    panel.classList.remove('open');
    isOpen = false;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function init() {
    const btn = document.getElementById('ai-chat-btn');
    const closeBtn = document.getElementById('ai-chat-close');
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    const quickBtns = document.getElementById('ai-chat-quick');

    if (!btn) return;

    btn.addEventListener('click', toggle);
    closeBtn?.addEventListener('click', close);

    sendBtn?.addEventListener('click', () => {
      sendMessage(input.value);
      input.value = '';
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
        input.value = '';
      }
    });

    if (quickBtns) {
      quickBtns.innerHTML = QUICK_PROMPTS.map(p =>
        `<button class="ai-quick-btn" data-query="${p.query}">${p.label}</button>`
      ).join('');
      quickBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.ai-quick-btn');
        if (btn) sendMessage(btn.dataset.query);
      });
    }

    // Welcome message
    messages.push({
      role: 'assistant',
      text: "Hi! I'm your AI dashboard assistant. Ask me about your metrics \u2014 revenue, leads, agent activity, content performance, or anything else. You can also try the quick prompts below."
    });
    renderMessages();
  }

  return { init, open, close, toggle, get isOpen() { return isOpen; } };
})();

function initAIChat() { AIChatAssistant.init(); }
