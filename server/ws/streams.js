const ACTIVITY_TEMPLATES = [
  { agent: 'Devin', action: 'completed PR review', target: 'dev-work#23', dotColor: 'green' },
  { agent: 'Devin', action: 'deployed service to', target: 'production', dotColor: 'purple' },
  { agent: 'Devin', action: 'ran CI pipeline - all checks passed', target: '', dotColor: 'blue' },
  { agent: 'Devin', action: 'started debugging', target: 'auth-service#14', dotColor: 'amber' },
  { agent: 'Devin', action: 'merged branch', target: 'feature/streaming', dotColor: 'green' },
  { agent: 'Devin', action: 'opened issue', target: 'devin-design#42', dotColor: 'blue' },
  { agent: 'Devin', action: 'optimized query performance in', target: 'analytics-db', dotColor: 'purple' },
  { agent: 'Devin', action: 'refactored module', target: 'payment-gateway', dotColor: 'green' },
  { agent: 'Devin', action: 'fixed flaky test in', target: 'e2e-suite', dotColor: 'amber' },
  { agent: 'Devin', action: 'updated dependencies for', target: 'core-lib', dotColor: 'blue' }
];

const NOTIFICATION_TEMPLATES = [
  { type: 'success', icon: '\u2705', title: 'Deployment Complete', msg: 'Production deploy finished successfully' },
  { type: 'info', icon: '\u2139\uFE0F', title: 'Session Started', msg: 'New agent session initialized' },
  { type: 'warning', icon: '\u26A0\uFE0F', title: 'High Memory Usage', msg: 'Server memory usage at 85%' },
  { type: 'success', icon: '\uD83D\uDE80', title: 'Performance Boost', msg: 'Response time improved by 23%' },
  { type: 'info', icon: '\uD83D\uDCCA', title: 'Report Ready', msg: 'Weekly analytics report generated' },
  { type: 'warning', icon: '\uD83D\uDD14', title: 'Rate Limit Warning', msg: 'API approaching rate limit threshold' },
  { type: 'success', icon: '\uD83C\uDF89', title: 'Milestone Reached', msg: '1000 successful deployments this month' },
  { type: 'info', icon: '\uD83D\uDD04', title: 'Auto-scaling', msg: 'Added 2 new instances to handle load' }
];

export class KpiStream {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.timer = null;
    this.values = {
      agents: 1284,
      revenue: 47832,
      leads: 362,
      views: 89420
    };
  }

  start() {
    this.timer = setInterval(() => {
      this.emit();
    }, 5000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  emit() {
    const metrics = [
      { key: 'agents', label: 'Agent Sessions', range: 20 },
      { key: 'revenue', label: 'Shopify Revenue', range: 500, prefix: '$' },
      { key: 'leads', label: 'New Leads', range: 10 },
      { key: 'views', label: 'Content Views', range: 1000 }
    ];

    const metric = metrics[Math.floor(Math.random() * metrics.length)];
    const delta = Math.floor(Math.random() * metric.range * 2) - metric.range;
    this.values[metric.key] = Math.max(0, this.values[metric.key] + delta);
    const deltaPercent = ((delta / (this.values[metric.key] - delta || 1)) * 100).toFixed(1);
    const sign = delta >= 0 ? '+' : '';

    this.broadcast('kpi', {
      metric: metric.key,
      value: this.values[metric.key],
      delta: `${sign}${delta}`,
      deltaPercent: `${sign}${deltaPercent}%`,
      prefix: metric.prefix || ''
    });
  }
}

export class ActivityStream {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.timer = null;
  }

  start() {
    this.scheduleNext();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleNext() {
    const delay = 10000 + Math.random() * 20000; // 10-30s
    this.timer = setTimeout(() => {
      this.emit();
      this.scheduleNext();
    }, delay);
  }

  emit() {
    const template = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
    this.broadcast('activity', {
      agent: template.agent,
      action: template.action,
      target: template.target,
      time: 'just now',
      dotColor: template.dotColor
    });
  }
}

export class NotificationStream {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.timer = null;
  }

  start() {
    this.scheduleNext();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleNext() {
    const delay = 30000 + Math.random() * 30000; // 30-60s
    this.timer = setTimeout(() => {
      this.emit();
      this.scheduleNext();
    }, delay);
  }

  emit() {
    const template = NOTIFICATION_TEMPLATES[Math.floor(Math.random() * NOTIFICATION_TEMPLATES.length)];
    this.broadcast('notifications', {
      type: template.type,
      icon: template.icon,
      title: template.title,
      msg: template.msg,
      time: 'just now'
    });
  }
}

export { ACTIVITY_TEMPLATES, NOTIFICATION_TEMPLATES };
