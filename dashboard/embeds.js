/* ═══════════════════════════════════════════════════════════════
   Phase 5 — Embeds Panel
   Embed configurator with chart type, data source, preview, and code copy
   ═══════════════════════════════════════════════════════════════ */

/* ─── Helper: escape ─────────────────────────────── */
function _embedEscape(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ Embeds Panel Controller ═══ */
var EmbedsPanel = {
  isOpen: false,
  _initialized: false,
  _config: {
    chartType: 'line',
    title: 'My Chart',
    data: '[10, 20, 30, 40, 50]',
    color: '#a855f7'
  },

  open: function() {
    var panel = document.getElementById('embeds-panel');
    if (!panel) return;
    panel.classList.add('embed-open');
    this.isOpen = true;
    if (!this._initialized) {
      this._init();
      this._initialized = true;
    }
    this.updatePreview();
  },

  close: function() {
    var panel = document.getElementById('embeds-panel');
    if (!panel) return;
    panel.classList.remove('embed-open');
    this.isOpen = false;
  },

  toggle: function() {
    if (this.isOpen) this.close();
    else this.open();
  },

  _init: function() {
    var self = this;
    var closeBtn = document.getElementById('embed-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    var typeSelect = document.getElementById('embed-type');
    var titleInput = document.getElementById('embed-title');
    var dataInput = document.getElementById('embed-data');
    var colorInput = document.getElementById('embed-color');

    if (typeSelect) {
      typeSelect.value = self._config.chartType;
      typeSelect.addEventListener('change', function() {
        self._config.chartType = typeSelect.value;
        self.updatePreview();
      });
    }

    if (titleInput) {
      titleInput.value = self._config.title;
      titleInput.addEventListener('input', function() {
        self._config.title = titleInput.value;
        self.updatePreview();
      });
    }

    if (dataInput) {
      dataInput.value = self._config.data;
      dataInput.addEventListener('input', function() {
        self._config.data = dataInput.value;
        self.updatePreview();
      });
    }

    if (colorInput) {
      colorInput.value = self._config.color;
      colorInput.addEventListener('input', function() {
        self._config.color = colorInput.value;
        self.updatePreview();
      });
    }

    var copyIframeBtn = document.getElementById('embed-copy-iframe');
    if (copyIframeBtn) {
      copyIframeBtn.addEventListener('click', function() {
        var snippet = self.getIframeSnippet();
        self._copyText(snippet, copyIframeBtn);
      });
    }

    var copyScriptBtn = document.getElementById('embed-copy-script');
    if (copyScriptBtn) {
      copyScriptBtn.addEventListener('click', function() {
        var snippet = self.getScriptSnippet();
        self._copyText(snippet, copyScriptBtn);
      });
    }
  },

  getEmbedUrl: function() {
    var params = new URLSearchParams();
    params.set('title', this._config.title);
    params.set('data', this._config.data);
    params.set('color', this._config.color);
    return '/api/embeds/chart/' + encodeURIComponent(this._config.chartType) + '?' + params.toString();
  },

  getIframeSnippet: function() {
    var url = this.getEmbedUrl();
    return '<iframe src="' + url + '" width="600" height="400" frameborder="0"></iframe>';
  },

  getScriptSnippet: function() {
    return '<script src="/api/embeds/snippet/' + encodeURIComponent(this._config.chartType) +
      '?title=' + encodeURIComponent(this._config.title) +
      '&data=' + encodeURIComponent(this._config.data) +
      '&color=' + encodeURIComponent(this._config.color) +
      '"><\/script>';
  },

  updatePreview: function() {
    var iframe = document.getElementById('embed-preview-iframe');
    if (iframe) {
      iframe.src = this.getEmbedUrl();
    }

    var iframeCode = document.getElementById('embed-iframe-code');
    if (iframeCode) {
      iframeCode.value = this.getIframeSnippet();
    }

    var scriptCode = document.getElementById('embed-script-code');
    if (scriptCode) {
      scriptCode.value = this.getScriptSnippet();
    }
  },

  _copyText: function(text, btn) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 2000);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = orig; }, 2000);
    }
  }
};

/* ═══ Global init function ═══ */
window.initEmbeds = function() {
  EmbedsPanel.toggle();
  return true;
};
