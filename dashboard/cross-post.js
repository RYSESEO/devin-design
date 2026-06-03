/* ═══════════════════════════════════════════════════════════════
   Cross-Channel Posting — bridges Content Hub + Social Dashboard
   Features: compose, platform select, preview per channel,
             schedule, unified feed, character limits, hashtags
   ═══════════════════════════════════════════════════════════════ */

const CrossPost = {
  posts: [],
  nextId: 1,

  platformLimits: {
    instagram: { name: 'Instagram', icon: 'IG', color: '#E1306C', maxChars: 2200, hasImage: true, hashtagLimit: 30 },
    twitter:   { name: 'Twitter / X', icon: 'TW', color: '#1DA1F2', maxChars: 280, hasImage: true, hashtagLimit: 5 },
    linkedin:  { name: 'LinkedIn', icon: 'LI', color: '#0A66C2', maxChars: 3000, hasImage: true, hashtagLimit: 10 },
    tiktok:    { name: 'TikTok', icon: 'TK', color: '#FF0050', maxChars: 2200, hasImage: false, hashtagLimit: 8 },
    youtube:   { name: 'YouTube', icon: 'YT', color: '#FF0000', maxChars: 5000, hasImage: true, hashtagLimit: 15 }
  },

  init() {
    const saved = localStorage.getItem('ryse_cross_posts');
    if (saved) {
      this.posts = JSON.parse(saved);
      this.nextId = this.posts.length ? Math.max(...this.posts.map(p => p.id)) + 1 : 1;
    } else {
      const now = new Date();
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      this.posts = [
        { id: 1, content: 'Just published our Complete SEO Audit Guide for 2025! Learn how to find and fix the issues hurting your rankings. Link in bio. #SEO #DigitalMarketing #SEOAudit', platforms: ['instagram','twitter','linkedin'], status: 'published', scheduledAt: fmt(new Date(now - 86400000*2)), type: 'blog' },
        { id: 2, content: 'Thread: 10 SEO mistakes that are silently killing your organic traffic. Most sites make at least 3 of these. Here\'s how to fix each one...', platforms: ['twitter','linkedin'], status: 'published', scheduledAt: fmt(new Date(now - 86400000)), type: 'social' },
        { id: 3, content: 'Exciting news! Our Product Demo Video is live. See how RYSE can transform your SEO workflow in under 5 minutes. #ProductLaunch #SEOTools', platforms: ['instagram','twitter','linkedin','youtube'], status: 'scheduled', scheduledAt: fmt(new Date(now.getTime() + 86400000)), type: 'video' },
        { id: 4, content: 'POV: You just discovered your competitor\'s entire backlink strategy using one simple tool. Here\'s the exact process I use for every client audit...', platforms: ['tiktok','instagram'], status: 'scheduled', scheduledAt: fmt(new Date(now.getTime() + 86400000*2)), type: 'social' },
        { id: 5, content: 'Q3 Content Marketing Recap: 340% organic traffic growth, 89 new keywords in top 10, and 28 closed deals from content alone. Full breakdown coming tomorrow.', platforms: ['linkedin','twitter'], status: 'draft', scheduledAt: '', type: 'blog' },
        { id: 6, content: 'New blog post: Technical SEO Checklist for 2025. Everything from Core Web Vitals to structured data, mobile-first indexing, and crawl budget optimization.', platforms: ['instagram','twitter','linkedin','tiktok'], status: 'draft', scheduledAt: '', type: 'blog' }
      ];
      this.nextId = 7;
      this.save();
    }
  },

  save() { localStorage.setItem('ryse_cross_posts', JSON.stringify(this.posts)); },

  createPost(content, platforms, scheduledAt, type) {
    const post = { id: this.nextId++, content, platforms, status: scheduledAt ? 'scheduled' : 'draft', scheduledAt: scheduledAt || '', type: type || 'social' };
    this.posts.unshift(post);
    this.save();
    return post;
  },

  deletePost(id) {
    this.posts = this.posts.filter(p => p.id !== id);
    this.save();
  },

  /* ─── Composer (renders inside Content Hub "Cross Post" tab) ── */
  renderComposer() {
    const el = document.getElementById('crosspost-composer');
    if (!el) return;
    const platforms = Object.entries(this.platformLimits);
    el.innerHTML = `
      <div class="xp-compose-area">
        <textarea class="xp-textarea" id="xp-content" placeholder="Write your post content..." rows="4"></textarea>
        <div class="xp-char-count" id="xp-char-count">0 characters</div>
      </div>
      <div class="xp-platform-select">
        <span class="xp-label">Platforms:</span>
        <div class="xp-platform-checks">${platforms.map(([key, p]) => `
          <label class="xp-plat-check">
            <input type="checkbox" value="${key}" class="xp-plat-cb" checked />
            <span class="xp-plat-badge" style="background:${p.color}">${p.icon}</span>
            <span class="xp-plat-name">${p.name}</span>
          </label>`).join('')}
        </div>
      </div>
      <div class="xp-options-row">
        <div class="xp-option">
          <label class="xp-label">Content Type:</label>
          <select class="ch-select xp-type-select" id="xp-type">
            <option value="social">Social Post</option>
            <option value="blog">Blog Promo</option>
            <option value="video">Video</option>
            <option value="email">Newsletter</option>
          </select>
        </div>
        <div class="xp-option">
          <label class="xp-label">Schedule:</label>
          <input type="datetime-local" class="ch-input xp-schedule-input" id="xp-schedule" />
        </div>
      </div>
      <div class="xp-preview-section">
        <span class="xp-label">Platform Previews:</span>
        <div class="xp-previews" id="xp-previews"></div>
      </div>
      <div class="xp-actions">
        <button class="ch-action-btn xp-post-btn" id="xp-schedule-btn">Schedule Post</button>
        <button class="ch-action-btn xp-draft-btn" id="xp-draft-btn">Save as Draft</button>
      </div>`;

    const textarea = document.getElementById('xp-content');
    const charCount = document.getElementById('xp-char-count');
    const updatePreviews = () => this.updatePreviews(textarea.value);

    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length} characters`;
      updatePreviews();
    });

    document.querySelectorAll('.xp-plat-cb').forEach(cb => {
      cb.addEventListener('change', updatePreviews);
    });

    document.getElementById('xp-schedule-btn').addEventListener('click', () => {
      const content = textarea.value.trim();
      if (!content) return;
      const platforms = [...document.querySelectorAll('.xp-plat-cb:checked')].map(cb => cb.value);
      if (!platforms.length) return;
      const schedule = document.getElementById('xp-schedule').value;
      const type = document.getElementById('xp-type').value;
      this.createPost(content, platforms, schedule, type);
      textarea.value = '';
      charCount.textContent = '0 characters';
      document.getElementById('xp-previews').innerHTML = '';
      this.renderFeed();
      this.renderScheduledInSocial();
    });

    document.getElementById('xp-draft-btn').addEventListener('click', () => {
      const content = textarea.value.trim();
      if (!content) return;
      const platforms = [...document.querySelectorAll('.xp-plat-cb:checked')].map(cb => cb.value);
      if (!platforms.length) return;
      const type = document.getElementById('xp-type').value;
      this.createPost(content, platforms, '', type);
      textarea.value = '';
      charCount.textContent = '0 characters';
      document.getElementById('xp-previews').innerHTML = '';
      this.renderFeed();
      this.renderScheduledInSocial();
    });
  },

  updatePreviews(content) {
    const el = document.getElementById('xp-previews');
    if (!el) return;
    const selectedPlatforms = [...document.querySelectorAll('.xp-plat-cb:checked')].map(cb => cb.value);
    if (!content || !selectedPlatforms.length) { el.innerHTML = '<div class="xp-preview-empty">Select platforms and type content to see previews</div>'; return; }

    el.innerHTML = selectedPlatforms.map(key => {
      const p = this.platformLimits[key];
      const truncated = content.length > p.maxChars;
      const preview = truncated ? content.slice(0, p.maxChars - 3) + '...' : content;
      const charClass = content.length > p.maxChars ? 'xp-over' : content.length > p.maxChars * 0.8 ? 'xp-warn' : 'xp-ok';
      return `
        <div class="xp-preview-card">
          <div class="xp-preview-head">
            <span class="xp-preview-icon" style="background:${p.color}">${p.icon}</span>
            <span class="xp-preview-name">${p.name}</span>
            <span class="xp-preview-chars ${charClass}">${content.length}/${p.maxChars}</span>
          </div>
          <div class="xp-preview-body">${preview}</div>
          ${truncated ? '<div class="xp-preview-warning">Content will be truncated for this platform</div>' : ''}
        </div>`;
    }).join('');
  },

  /* ─── Unified Feed (renders inside Content Hub "Cross Post" tab below composer) ── */
  renderFeed() {
    const el = document.getElementById('crosspost-feed');
    if (!el) return;
    const statusOrder = { scheduled: 0, draft: 1, published: 2 };
    const sorted = [...this.posts].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    el.innerHTML = `
      <h5 class="xp-feed-title">Post Queue (${this.posts.length})</h5>
      ${sorted.map(post => {
        const statusClass = `xp-status-${post.status}`;
        return `<div class="xp-feed-card ${statusClass}">
          <div class="xp-feed-head">
            <span class="xp-feed-status">${post.status}</span>
            <div class="xp-feed-platforms">${post.platforms.map(key => {
              const p = this.platformLimits[key];
              return p ? `<span class="xp-feed-plat" style="background:${p.color}" title="${p.name}">${p.icon}</span>` : '';
            }).join('')}</div>
            ${post.scheduledAt ? `<span class="xp-feed-time">${new Date(post.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>` : ''}
            <button class="xp-feed-del" data-xpid="${post.id}" title="Delete">&#10005;</button>
          </div>
          <p class="xp-feed-text">${post.content}</p>
          <span class="xp-feed-type">${post.type}</span>
        </div>`;
      }).join('')}`;

    el.querySelectorAll('.xp-feed-del').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deletePost(parseInt(btn.dataset.xpid));
        this.renderFeed();
        this.renderScheduledInSocial();
      });
    });
  },

  /* ─── Scheduled posts view (renders inside Social Dashboard "Scheduled" tab) ── */
  renderScheduledInSocial() {
    const el = document.getElementById('social-scheduled');
    if (!el) return;
    const scheduled = this.posts.filter(p => p.status === 'scheduled' || p.status === 'draft');
    const published = this.posts.filter(p => p.status === 'published');

    el.innerHTML = `
      <div class="xp-sched-section">
        <h5 class="xp-sched-title">Upcoming Posts (${scheduled.length})</h5>
        ${scheduled.length === 0 ? '<div class="xp-sched-empty">No scheduled posts. Create one in the Content Hub (C).</div>' : ''}
        ${scheduled.map(post => `
          <div class="xp-sched-card xp-status-${post.status}">
            <div class="xp-sched-head">
              <span class="xp-feed-status">${post.status}</span>
              <div class="xp-feed-platforms">${post.platforms.map(key => {
                const p = this.platformLimits[key];
                return p ? `<span class="xp-feed-plat" style="background:${p.color}" title="${p.name}">${p.icon}</span>` : '';
              }).join('')}</div>
              ${post.scheduledAt ? `<span class="xp-feed-time">${new Date(post.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>` : '<span class="xp-feed-time">Not scheduled</span>'}
            </div>
            <p class="xp-feed-text">${post.content}</p>
          </div>`).join('')}
      </div>
      <div class="xp-sched-section">
        <h5 class="xp-sched-title">Recently Published (${published.length})</h5>
        ${published.map(post => `
          <div class="xp-sched-card xp-status-published">
            <div class="xp-sched-head">
              <span class="xp-feed-status">published</span>
              <div class="xp-feed-platforms">${post.platforms.map(key => {
                const p = this.platformLimits[key];
                return p ? `<span class="xp-feed-plat" style="background:${p.color}" title="${p.name}">${p.icon}</span>` : '';
              }).join('')}</div>
              ${post.scheduledAt ? `<span class="xp-feed-time">${new Date(post.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>` : ''}
            </div>
            <p class="xp-feed-text">${post.content}</p>
          </div>`).join('')}
      </div>`;
  }
};

/* ─── Boot ────────────────────────────────────────────────────── */
function initCrossPost() {
  CrossPost.init();
}
