/* ═══════════════════════════════════════════════════════════════
   Content Optimization Hub
   7 tools: SEO Analyzer, Readability, Calendar, Keywords,
            Performance, Headlines, Brief Generator
   ═══════════════════════════════════════════════════════════════ */

/* ─── SEO Score Analyzer ─────────────────────────────────────── */
const SEOAnalyzer = {
  analyze(url, title, meta, body) {
    const checks = [];
    const titleLen = title.length;
    checks.push({ label: 'Title Length', status: titleLen >= 30 && titleLen <= 60 ? 'pass' : titleLen > 0 ? 'warn' : 'fail', detail: `${titleLen} chars (ideal: 30–60)` });
    const metaLen = meta.length;
    checks.push({ label: 'Meta Description', status: metaLen >= 120 && metaLen <= 160 ? 'pass' : metaLen > 0 ? 'warn' : 'fail', detail: `${metaLen} chars (ideal: 120–160)` });
    const words = body.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    checks.push({ label: 'Word Count', status: wordCount >= 300 ? 'pass' : wordCount >= 100 ? 'warn' : 'fail', detail: `${wordCount} words (min: 300)` });
    const h1Match = body.match(/<h1/gi);
    checks.push({ label: 'H1 Tag', status: h1Match && h1Match.length === 1 ? 'pass' : h1Match ? 'warn' : 'fail', detail: h1Match ? `${h1Match.length} found` : 'Missing' });
    const h2Match = body.match(/<h2/gi);
    checks.push({ label: 'H2 Subheadings', status: h2Match && h2Match.length >= 2 ? 'pass' : h2Match ? 'warn' : 'fail', detail: h2Match ? `${h2Match.length} found` : 'None' });
    const imgMatch = body.match(/<img/gi);
    const altMatch = body.match(/alt=["'][^"']+["']/gi);
    checks.push({ label: 'Image Alt Text', status: !imgMatch || (altMatch && altMatch.length >= imgMatch.length) ? 'pass' : 'warn', detail: imgMatch ? `${altMatch ? altMatch.length : 0}/${imgMatch.length} have alt` : 'No images' });
    const linkMatch = body.match(/<a /gi);
    checks.push({ label: 'Internal Links', status: linkMatch && linkMatch.length >= 2 ? 'pass' : linkMatch ? 'warn' : 'fail', detail: linkMatch ? `${linkMatch.length} links` : 'None' });
    const urlClean = !url.includes(' ') && url.length < 75;
    checks.push({ label: 'URL Structure', status: urlClean ? 'pass' : 'warn', detail: url.length > 0 ? `${url.length} chars` : 'Not provided' });
    const passed = checks.filter(c => c.status === 'pass').length;
    const score = Math.round((passed / checks.length) * 100);
    return { score, checks };
  },

  renderDemo() {
    const result = this.analyze(
      '/blog/seo-audit-guide',
      'Complete SEO Audit Guide for 2025 — RYSE',
      'Learn how to perform a comprehensive SEO audit that improves rankings, fixes technical issues, and boosts organic traffic. Step-by-step guide with free checklist.',
      '<h1>Complete SEO Audit Guide</h1><p>' + 'Lorem ipsum dolor sit amet. '.repeat(20) + '</p><h2>Technical SEO</h2><p>' + 'Content block two. '.repeat(15) + '</p><h2>On-Page SEO</h2><p>' + 'Third section content. '.repeat(15) + '</p><img src="audit.png" alt="SEO audit process"><a href="/tools">Tools</a><a href="/blog">Blog</a><a href="/pricing">Pricing</a>'
    );
    const el = document.getElementById('seo-result');
    if (!el) return;
    el.innerHTML = `
      <div class="seo-score-ring"><div class="seo-score-val">${result.score}</div><div class="seo-score-label">SEO Score</div></div>
      <div class="seo-checks">${result.checks.map(c => `
        <div class="seo-check seo-${c.status}">
          <span class="seo-check-dot"></span>
          <span class="seo-check-label">${c.label}</span>
          <span class="seo-check-detail">${c.detail}</span>
        </div>`).join('')}
      </div>`;
  }
};

/* ─── Readability Analyzer ───────────────────────────────────── */
const ReadabilityAnalyzer = {
  syllableCount(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const m = word.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  },

  analyze(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalSyllables = words.reduce((sum, w) => sum + this.syllableCount(w), 0);
    const avgSentLen = words.length / Math.max(sentences.length, 1);
    const avgSyllPerWord = totalSyllables / Math.max(words.length, 1);
    const flesch = 206.835 - (1.015 * avgSentLen) - (84.6 * avgSyllPerWord);
    const fleschKincaid = (0.39 * avgSentLen) + (11.8 * avgSyllPerWord) - 15.59;
    const complexWords = words.filter(w => this.syllableCount(w) >= 3).length;
    const complexPct = (complexWords / Math.max(words.length, 1)) * 100;
    let level = 'Easy';
    if (flesch < 30) level = 'Very Difficult';
    else if (flesch < 50) level = 'Difficult';
    else if (flesch < 60) level = 'Fairly Difficult';
    else if (flesch < 70) level = 'Standard';
    else if (flesch < 80) level = 'Fairly Easy';
    return { flesch: Math.max(0, Math.min(100, flesch)).toFixed(1), fleschKincaid: Math.max(0, fleschKincaid).toFixed(1), avgSentLen: avgSentLen.toFixed(1), complexPct: complexPct.toFixed(1), wordCount: words.length, sentenceCount: sentences.length, level };
  },

  renderDemo() {
    const text = "Search engine optimization is the practice of improving your website to increase its visibility in search results. When people search for products or services related to your business, you want your site to appear prominently. Better visibility means more traffic and more opportunities to convert visitors into customers. SEO combines technical optimization with high quality content creation. The goal is to satisfy both search engine algorithms and human readers. Modern SEO requires understanding user intent and delivering relevant answers quickly.";
    const r = this.analyze(text);
    const el = document.getElementById('readability-result');
    if (!el) return;
    el.innerHTML = `
      <div class="read-score-row">
        <div class="read-score-card">
          <div class="read-score-num">${r.flesch}</div>
          <div class="read-score-sub">Flesch Score</div>
        </div>
        <div class="read-score-card">
          <div class="read-score-num">${r.fleschKincaid}</div>
          <div class="read-score-sub">Grade Level</div>
        </div>
        <div class="read-score-card">
          <div class="read-score-num">${r.level}</div>
          <div class="read-score-sub">Difficulty</div>
        </div>
      </div>
      <div class="read-metrics">
        <div class="read-metric"><span class="read-metric-val">${r.wordCount}</span><span class="read-metric-label">Words</span></div>
        <div class="read-metric"><span class="read-metric-val">${r.sentenceCount}</span><span class="read-metric-label">Sentences</span></div>
        <div class="read-metric"><span class="read-metric-val">${r.avgSentLen}</span><span class="read-metric-label">Avg Sentence Length</span></div>
        <div class="read-metric"><span class="read-metric-val">${r.complexPct}%</span><span class="read-metric-label">Complex Words</span></div>
      </div>`;
  }
};

/* ─── Content Calendar ───────────────────────────────────────── */
const ContentCalendar = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  entries: [],

  init() {
    const saved = localStorage.getItem('ryse_content_calendar');
    if (saved) { this.entries = JSON.parse(saved); }
    else {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      this.entries = [
        { id: 1, date: `${y}-${String(m+1).padStart(2,'0')}-03`, title: 'SEO Audit Guide', type: 'blog', status: 'published' },
        { id: 2, date: `${y}-${String(m+1).padStart(2,'0')}-07`, title: 'Link Building Strategies', type: 'blog', status: 'published' },
        { id: 3, date: `${y}-${String(m+1).padStart(2,'0')}-10`, title: 'Product Demo Video', type: 'video', status: 'scheduled' },
        { id: 4, date: `${y}-${String(m+1).padStart(2,'0')}-14`, title: 'Q3 Marketing Recap', type: 'social', status: 'draft' },
        { id: 5, date: `${y}-${String(m+1).padStart(2,'0')}-18`, title: 'Technical SEO Checklist', type: 'blog', status: 'scheduled' },
        { id: 6, date: `${y}-${String(m+1).padStart(2,'0')}-22`, title: 'Customer Case Study', type: 'blog', status: 'draft' },
        { id: 7, date: `${y}-${String(m+1).padStart(2,'0')}-25`, title: 'Social Media Tips Thread', type: 'social', status: 'scheduled' },
        { id: 8, date: `${y}-${String(m+1).padStart(2,'0')}-28`, title: 'Webinar: SEO in 2025', type: 'video', status: 'draft' }
      ];
      this.save();
    }
  },

  save() { localStorage.setItem('ryse_content_calendar', JSON.stringify(this.entries)); },

  render() {
    const el = document.getElementById('cal-grid');
    if (!el) return;
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('cal-month-label').textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
    let html = '<div class="cal-header-row"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="cal-days">';
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day cal-empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEntries = this.entries.filter(e => e.date === dateStr);
      const today = new Date();
      const isToday = d === today.getDate() && this.currentMonth === today.getMonth() && this.currentYear === today.getFullYear();
      html += `<div class="cal-day${isToday ? ' cal-today' : ''}"><span class="cal-day-num">${d}</span>`;
      dayEntries.forEach(e => {
        html += `<div class="cal-entry cal-${e.status}" title="${e.title}"><span class="cal-entry-type cal-type-${e.type}">${e.type[0].toUpperCase()}</span>${e.title}</div>`;
      });
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },

  prevMonth() { this.currentMonth--; if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; } this.render(); },
  nextMonth() { this.currentMonth++; if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; } this.render(); }
};

/* ─── Keyword Research Tool ──────────────────────────────────── */
const KeywordResearch = {
  database: [
    { keyword: 'seo audit', volume: 14800, difficulty: 67, cpc: 4.20, trend: 'up', related: ['seo audit tool', 'seo audit checklist', 'free seo audit'] },
    { keyword: 'link building', volume: 9900, difficulty: 74, cpc: 6.50, trend: 'stable', related: ['link building strategies', 'link building services', 'backlink checker'] },
    { keyword: 'content marketing', volume: 22100, difficulty: 81, cpc: 8.10, trend: 'up', related: ['content strategy', 'content calendar', 'content writing'] },
    { keyword: 'keyword research', volume: 18200, difficulty: 72, cpc: 5.30, trend: 'up', related: ['keyword planner', 'keyword tool', 'long tail keywords'] },
    { keyword: 'technical seo', volume: 8100, difficulty: 63, cpc: 3.80, trend: 'up', related: ['site speed', 'core web vitals', 'structured data'] },
    { keyword: 'local seo', volume: 12500, difficulty: 58, cpc: 4.90, trend: 'stable', related: ['google my business', 'local citations', 'local search'] },
    { keyword: 'shopify seo', volume: 6600, difficulty: 52, cpc: 3.20, trend: 'up', related: ['shopify seo app', 'shopify meta tags', 'shopify speed'] },
    { keyword: 'ai content writing', volume: 33100, difficulty: 45, cpc: 2.80, trend: 'up', related: ['ai writer', 'chatgpt content', 'ai blog writer'] },
    { keyword: 'page speed optimization', volume: 4400, difficulty: 61, cpc: 5.60, trend: 'stable', related: ['core web vitals', 'page speed insights', 'website speed test'] },
    { keyword: 'conversion rate optimization', volume: 7300, difficulty: 69, cpc: 7.40, trend: 'up', related: ['cro tools', 'ab testing', 'landing page optimization'] }
  ],

  render(query) {
    const el = document.getElementById('kw-results');
    if (!el) return;
    let filtered = this.database;
    if (query && query.trim()) {
      const q = query.toLowerCase();
      filtered = this.database.filter(k => k.keyword.includes(q) || k.related.some(r => r.includes(q)));
    }
    el.innerHTML = filtered.map(k => {
      const diffColor = k.difficulty > 70 ? 'kw-hard' : k.difficulty > 50 ? 'kw-medium' : 'kw-easy';
      const trendIcon = k.trend === 'up' ? '&#9650;' : k.trend === 'down' ? '&#9660;' : '&#9654;';
      return `<div class="kw-row">
        <div class="kw-term">${k.keyword}</div>
        <div class="kw-vol">${k.volume.toLocaleString()}</div>
        <div class="kw-diff ${diffColor}">${k.difficulty}</div>
        <div class="kw-cpc">$${k.cpc.toFixed(2)}</div>
        <div class="kw-trend">${trendIcon}</div>
        <div class="kw-related">${k.related.slice(0, 2).map(r => `<span class="kw-tag">${r}</span>`).join('')}</div>
      </div>`;
    }).join('');
  }
};

/* ─── Content Performance ────────────────────────────────────── */
const ContentPerformance = {
  data: [
    { title: 'Complete SEO Audit Guide', type: 'Blog', views: 12420, engagement: 8.2, conversions: 34, bounce: 32, avgTime: '4:12' },
    { title: 'Link Building Strategies 2025', type: 'Blog', views: 8930, engagement: 7.6, conversions: 21, bounce: 38, avgTime: '3:45' },
    { title: 'Product Demo Walkthrough', type: 'Video', views: 15200, engagement: 9.1, conversions: 67, bounce: 18, avgTime: '6:30' },
    { title: 'Shopify SEO Quick Wins', type: 'Blog', views: 6780, engagement: 6.9, conversions: 15, bounce: 41, avgTime: '2:58' },
    { title: 'Monthly SEO Report Template', type: 'Download', views: 4350, engagement: 8.8, conversions: 89, bounce: 22, avgTime: '1:45' },
    { title: 'Technical SEO Checklist', type: 'Blog', views: 9100, engagement: 7.4, conversions: 28, bounce: 35, avgTime: '3:22' },
    { title: 'Content Marketing Webinar', type: 'Video', views: 3200, engagement: 8.5, conversions: 42, bounce: 15, avgTime: '42:10' },
    { title: 'AI Writing Tools Comparison', type: 'Blog', views: 18700, engagement: 7.1, conversions: 53, bounce: 29, avgTime: '5:08' }
  ],

  sortKey: 'views',
  sortDir: -1,

  render() {
    const el = document.getElementById('perf-table');
    if (!el) return;
    const sorted = [...this.data].sort((a, b) => (a[this.sortKey] > b[this.sortKey] ? 1 : -1) * this.sortDir);
    el.innerHTML = `
      <div class="perf-header">
        <span class="perf-col perf-title-col">Content</span>
        <span class="perf-col perf-sortable" data-sort="views">Views</span>
        <span class="perf-col perf-sortable" data-sort="engagement">Engage</span>
        <span class="perf-col perf-sortable" data-sort="conversions">Conv.</span>
        <span class="perf-col perf-sortable" data-sort="bounce">Bounce</span>
        <span class="perf-col">Avg Time</span>
      </div>
      ${sorted.map(d => `<div class="perf-row">
        <div class="perf-col perf-title-col"><span class="perf-content-title">${d.title}</span><span class="perf-type-badge">${d.type}</span></div>
        <div class="perf-col">${d.views.toLocaleString()}</div>
        <div class="perf-col">${d.engagement}/10</div>
        <div class="perf-col">${d.conversions}</div>
        <div class="perf-col">${d.bounce}%</div>
        <div class="perf-col">${d.avgTime}</div>
      </div>`).join('')}`;
    el.querySelectorAll('.perf-sortable').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sort;
        if (this.sortKey === key) this.sortDir *= -1;
        else { this.sortKey = key; this.sortDir = -1; }
        this.render();
      });
    });
  }
};

/* ─── Headline Analyzer ──────────────────────────────────────── */
const HeadlineAnalyzer = {
  powerWords: ['ultimate','proven','essential','complete','powerful','secret','exclusive','guaranteed','incredible','breakthrough','amazing','effortless','instant','massive','critical','shocking','remarkable','revolutionary','definitive','comprehensive'],
  emotionalWords: ['love','fear','surprise','joy','trust','anger','anticipation','disgust','amazing','terrible','wonderful','awful','brilliant','devastating','inspiring','heartbreaking','thrilling','alarming','exciting','worrying'],
  commonWords: ['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','of','in','to','for','on','with','at','by','from','as','into','about','between','through','after','before','during','without','under','around','among'],

  analyze(headline) {
    const words = headline.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const charCount = headline.length;
    const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    const powerFound = lowerWords.filter(w => this.powerWords.includes(w));
    const emotionalFound = lowerWords.filter(w => this.emotionalWords.includes(w));
    const uncommonWords = lowerWords.filter(w => !this.commonWords.includes(w) && w.length > 2);
    const hasNumber = /\d/.test(headline);
    const hasQuestion = headline.trim().endsWith('?');
    const startsWithHow = /^how\b/i.test(headline.trim());
    const lengthScore = charCount >= 50 && charCount <= 70 ? 25 : charCount >= 40 && charCount <= 80 ? 15 : 5;
    const wordScore = wordCount >= 6 && wordCount <= 12 ? 20 : wordCount >= 4 && wordCount <= 15 ? 10 : 3;
    const powerScore = Math.min(powerFound.length * 10, 20);
    const emotionalScore = Math.min(emotionalFound.length * 8, 15);
    const bonusScore = (hasNumber ? 5 : 0) + (hasQuestion ? 5 : 0) + (startsWithHow ? 5 : 0);
    const score = Math.min(100, lengthScore + wordScore + powerScore + emotionalScore + bonusScore);
    return { score, wordCount, charCount, powerFound, emotionalFound, uncommonWords: uncommonWords.length, hasNumber, hasQuestion, suggestions: this.getSuggestions(score, wordCount, charCount, powerFound, hasNumber) };
  },

  getSuggestions(score, wordCount, charCount, powerFound, hasNumber) {
    const s = [];
    if (charCount < 50) s.push('Consider making the headline longer (50-70 chars ideal)');
    if (charCount > 70) s.push('Consider shortening the headline (50-70 chars ideal)');
    if (powerFound.length === 0) s.push('Add a power word like "ultimate", "proven", or "essential"');
    if (!hasNumber) s.push('Adding a number can increase CTR by up to 36%');
    if (wordCount < 6) s.push('Headlines with 6-12 words tend to perform best');
    if (score >= 70) s.push('Strong headline! Minor tweaks could push it higher.');
    return s;
  },

  render(headline) {
    const el = document.getElementById('headline-result');
    if (!el) return;
    if (!headline || !headline.trim()) { el.innerHTML = '<div class="hl-empty">Enter a headline above to analyze</div>'; return; }
    const r = this.analyze(headline);
    const scoreClass = r.score >= 70 ? 'hl-good' : r.score >= 40 ? 'hl-ok' : 'hl-weak';
    el.innerHTML = `
      <div class="hl-score-wrap">
        <div class="hl-score ${scoreClass}">${r.score}</div>
        <div class="hl-score-label">${r.score >= 70 ? 'Strong' : r.score >= 40 ? 'Average' : 'Needs Work'}</div>
      </div>
      <div class="hl-stats">
        <div class="hl-stat"><span class="hl-stat-val">${r.wordCount}</span>Words</div>
        <div class="hl-stat"><span class="hl-stat-val">${r.charCount}</span>Characters</div>
        <div class="hl-stat"><span class="hl-stat-val">${r.powerFound.length}</span>Power Words</div>
        <div class="hl-stat"><span class="hl-stat-val">${r.uncommonWords}</span>Uncommon</div>
      </div>
      ${r.powerFound.length > 0 ? `<div class="hl-found"><strong>Power words:</strong> ${r.powerFound.map(w => `<span class="hl-pw-tag">${w}</span>`).join(' ')}</div>` : ''}
      <div class="hl-suggestions">${r.suggestions.map(s => `<div class="hl-sug"><span class="hl-sug-icon">&#9679;</span>${s}</div>`).join('')}</div>`;
  }
};

/* ─── Content Brief Generator ────────────────────────────────── */
const BriefGenerator = {
  templates: {
    blog: { sections: ['Introduction & Hook', 'Problem Statement', 'Main Solution / Key Points', 'Supporting Evidence & Examples', 'Step-by-Step Guide', 'Expert Quotes / Data', 'FAQ Section', 'Conclusion & CTA'], tone: 'Informative, authoritative', wordRange: '1,500 - 2,500' },
    landing: { sections: ['Hero Section & Value Prop', 'Pain Points', 'Solution Overview', 'Features & Benefits', 'Social Proof', 'Pricing / Offer', 'FAQ', 'Final CTA'], tone: 'Persuasive, action-oriented', wordRange: '500 - 1,000' },
    email: { sections: ['Subject Line Options (3)', 'Preview Text', 'Opening Hook', 'Body Content', 'CTA Button Text', 'P.S. Line'], tone: 'Conversational, urgent', wordRange: '200 - 400' },
    social: { sections: ['Hook (first line)', 'Key Message', 'Supporting Points (3-5)', 'CTA', 'Hashtag Suggestions'], tone: 'Casual, engaging', wordRange: '50 - 280' }
  },

  generate(keyword, contentType) {
    const template = this.templates[contentType] || this.templates.blog;
    const kw = keyword || 'your target keyword';
    const matchedKw = KeywordResearch.database.find(k => k.keyword.toLowerCase().includes(kw.toLowerCase()));
    return {
      keyword: kw,
      type: contentType,
      tone: template.tone,
      wordRange: template.wordRange,
      targetAudience: 'Marketing managers, SEO professionals, and business owners',
      searchIntent: matchedKw ? 'Informational / Commercial' : 'Informational',
      volume: matchedKw ? matchedKw.volume.toLocaleString() : 'N/A',
      difficulty: matchedKw ? matchedKw.difficulty : 'N/A',
      sections: template.sections,
      relatedKeywords: matchedKw ? matchedKw.related : [`${kw} guide`, `${kw} tips`, `best ${kw}`],
      competitors: ['Ahrefs Blog', 'Moz Blog', 'Backlinko', 'Search Engine Journal']
    };
  },

  render(keyword, contentType) {
    const el = document.getElementById('brief-result');
    if (!el) return;
    const b = this.generate(keyword || 'seo audit', contentType || 'blog');
    el.innerHTML = `
      <div class="brief-header">
        <h5 class="brief-title">Content Brief: ${b.keyword}</h5>
        <span class="brief-type-badge">${b.type}</span>
      </div>
      <div class="brief-meta-grid">
        <div class="brief-meta"><span class="brief-meta-label">Target Audience</span><span>${b.targetAudience}</span></div>
        <div class="brief-meta"><span class="brief-meta-label">Tone</span><span>${b.tone}</span></div>
        <div class="brief-meta"><span class="brief-meta-label">Word Count</span><span>${b.wordRange}</span></div>
        <div class="brief-meta"><span class="brief-meta-label">Search Intent</span><span>${b.searchIntent}</span></div>
        <div class="brief-meta"><span class="brief-meta-label">Monthly Volume</span><span>${b.volume}</span></div>
        <div class="brief-meta"><span class="brief-meta-label">Difficulty</span><span>${b.difficulty}</span></div>
      </div>
      <div class="brief-section">
        <h6>Outline</h6>
        <ol class="brief-outline">${b.sections.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>
      <div class="brief-section">
        <h6>Related Keywords</h6>
        <div class="brief-tags">${b.relatedKeywords.map(r => `<span class="brief-tag">${r}</span>`).join('')}</div>
      </div>
      <div class="brief-section">
        <h6>Competitor References</h6>
        <div class="brief-tags">${b.competitors.map(c => `<span class="brief-comp-tag">${c}</span>`).join('')}</div>
      </div>`;
  }
};

/* ─── Content Hub Controller ─────────────────────────────────── */
const ContentHub = {
  isOpen: false,
  activeTab: 'seo',

  open(tab) {
    this.isOpen = true;
    if (tab) this.activeTab = tab;
    const panel = document.getElementById('content-hub-panel');
    if (panel) { panel.classList.add('ch-open'); document.body.style.overflow = 'hidden'; }
    this.setTab(this.activeTab);
    this.render();
  },

  close() {
    this.isOpen = false;
    const panel = document.getElementById('content-hub-panel');
    if (panel) { panel.classList.remove('ch-open'); document.body.style.overflow = ''; }
  },

  toggle() { this.isOpen ? this.close() : this.open(); },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.ch-tab').forEach(t => t.classList.toggle('active', t.dataset.chtab === tab));
    document.querySelectorAll('.ch-pane').forEach(p => p.classList.toggle('active', p.dataset.chpane === tab));
  },

  render() {
    switch (this.activeTab) {
      case 'seo': SEOAnalyzer.renderDemo(); break;
      case 'readability': ReadabilityAnalyzer.renderDemo(); break;
      case 'calendar': ContentCalendar.render(); break;
      case 'keywords': KeywordResearch.render(''); break;
      case 'performance': ContentPerformance.render(); break;
      case 'headlines': HeadlineAnalyzer.render(''); break;
      case 'briefs': BriefGenerator.render('seo audit', 'blog'); break;
    }
  }
};

/* ─── Boot ────────────────────────────────────────────────────── */
function initContentHub() {
  ContentCalendar.init();

  const closeBtn = document.getElementById('ch-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => ContentHub.close());

  const chBtn = document.getElementById('ch-btn');
  if (chBtn) chBtn.addEventListener('click', () => ContentHub.toggle());

  document.querySelectorAll('.ch-tab').forEach(tab => {
    tab.addEventListener('click', () => { ContentHub.setTab(tab.dataset.chtab); ContentHub.render(); });
  });

  const calPrev = document.getElementById('cal-prev');
  const calNext = document.getElementById('cal-next');
  if (calPrev) calPrev.addEventListener('click', () => ContentCalendar.prevMonth());
  if (calNext) calNext.addEventListener('click', () => ContentCalendar.nextMonth());

  const kwInput = document.getElementById('kw-search-input');
  if (kwInput) kwInput.addEventListener('input', () => KeywordResearch.render(kwInput.value));

  const hlInput = document.getElementById('hl-input');
  if (hlInput) hlInput.addEventListener('input', () => HeadlineAnalyzer.render(hlInput.value));

  const briefKeyword = document.getElementById('brief-keyword');
  const briefType = document.getElementById('brief-type');
  const briefGenBtn = document.getElementById('brief-gen-btn');
  if (briefGenBtn) {
    briefGenBtn.addEventListener('click', () => {
      BriefGenerator.render(briefKeyword ? briefKeyword.value : '', briefType ? briefType.value : 'blog');
    });
  }

  const panel = document.getElementById('content-hub-panel');
  if (panel) {
    panel.addEventListener('click', (e) => { if (e.target === panel) ContentHub.close(); });
  }
}
