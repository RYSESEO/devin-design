/* ═══════════════════════════════════════════════════════════════
   Voice Command Interface — Web Speech API hands-free control
   ═══════════════════════════════════════════════════════════════ */
const VoiceControl = (() => {
  let isListening = false;
  let recognition = null;
  let supported = false;

  const VOICE_COMMANDS = [
    { patterns: [/go to (kpi|dashboard|home|top)/i, /show (kpi|metrics)/i], action: () => scrollTo('section-kpi'), feedback: 'Navigating to KPIs' },
    { patterns: [/go to (agent|usage)/i, /show agent/i], action: () => scrollTo('section-agent-usage'), feedback: 'Navigating to Agent Usage' },
    { patterns: [/go to shopify/i, /show (orders|revenue|shopify)/i], action: () => scrollTo('section-shopify'), feedback: 'Navigating to Shopify' },
    { patterns: [/go to (activity|feed)/i, /show activity/i], action: () => scrollTo('section-activity'), feedback: 'Navigating to Activity' },
    { patterns: [/go to content/i, /show content/i], action: () => scrollTo('section-content'), feedback: 'Navigating to Content' },
    { patterns: [/theme (default|dark)/i], action: () => { if (typeof applyTheme === 'function') applyTheme('default'); }, feedback: 'Switching to Default theme' },
    { patterns: [/theme glass/i, /liquid glass/i], action: () => { if (typeof applyTheme === 'function') applyTheme('glass'); }, feedback: 'Switching to Glass theme' },
    { patterns: [/theme (brutal|brutalist)/i], action: () => { if (typeof applyTheme === 'function') applyTheme('brutalist'); }, feedback: 'Switching to Brutalist theme' },
    { patterns: [/theme (cyber|cyberpunk|neon)/i], action: () => { if (typeof applyTheme === 'function') applyTheme('cyberpunk'); }, feedback: 'Switching to Cyberpunk theme' },
    { patterns: [/next theme/i, /cycle theme/i], action: () => { if (typeof cycleTheme === 'function') cycleTheme(); }, feedback: 'Cycling to next theme' },
    { patterns: [/open (command|palette|search)/i], action: () => { if (typeof openCommandPalette === 'function') openCommandPalette(); }, feedback: 'Opening command palette' },
    { patterns: [/open (notification|alert)/i, /show notification/i], action: () => { if (typeof toggleNotifications === 'function') toggleNotifications(); }, feedback: 'Toggling notifications' },
    { patterns: [/open (chat|assistant|ai)/i], action: () => { if (typeof AIChatAssistant !== 'undefined') AIChatAssistant.open(); }, feedback: 'Opening AI Chat' },
    { patterns: [/open (social|media)/i], action: () => { if (typeof SocialDashboard !== 'undefined') SocialDashboard.open(); }, feedback: 'Opening Social Dashboard' },
    { patterns: [/open (content hub|hub)/i], action: () => { if (typeof ContentHub !== 'undefined') ContentHub.open(); }, feedback: 'Opening Content Hub' },
    { patterns: [/open (intel|intelligence)/i], action: () => { if (typeof Intelligence !== 'undefined') Intelligence.open(); }, feedback: 'Opening Intelligence panel' },
    { patterns: [/open (toolkit|tools|dev)/i], action: () => { if (typeof Toolkit !== 'undefined') Toolkit.open(); }, feedback: 'Opening Toolkit' },
    { patterns: [/open (eco|ecosystem)/i], action: () => { if (typeof Ecosystem !== 'undefined') Ecosystem.open(); }, feedback: 'Opening Ecosystem' },
    { patterns: [/open (widget|builder)/i], action: () => { if (typeof WidgetBuilder !== 'undefined') WidgetBuilder.open(); }, feedback: 'Opening Widget Builder' },
    { patterns: [/open competitive/i, /competitor/i], action: () => { if (typeof CompetitiveIntel !== 'undefined') CompetitiveIntel.open(); }, feedback: 'Opening Competitive Intelligence' },
    { patterns: [/close|dismiss|hide|escape/i], action: () => closeAll(), feedback: 'Closing panels' },
    { patterns: [/export|screenshot|capture/i], action: () => { if (typeof exportDashboard === 'function') exportDashboard(); }, feedback: 'Exporting dashboard' },
    { patterns: [/stop listening|stop voice/i], action: () => stop(), feedback: 'Voice control stopped' },
  ];

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeAll() {
    if (typeof AIChatAssistant !== 'undefined' && AIChatAssistant.isOpen) AIChatAssistant.close();
    if (typeof SocialDashboard !== 'undefined' && SocialDashboard.isOpen) SocialDashboard.close();
    if (typeof ContentHub !== 'undefined' && ContentHub.isOpen) ContentHub.close();
    if (typeof Intelligence !== 'undefined' && Intelligence.isOpen) Intelligence.close();
    if (typeof Toolkit !== 'undefined' && Toolkit.isOpen) Toolkit.close();
    if (typeof Ecosystem !== 'undefined' && Ecosystem.isOpen) Ecosystem.close();
    if (typeof WidgetBuilder !== 'undefined' && WidgetBuilder.isOpen) WidgetBuilder.close();
    if (typeof CompetitiveIntel !== 'undefined' && CompetitiveIntel.isOpen) CompetitiveIntel.close();
    if (typeof closeNotifications === 'function') closeNotifications();
    if (typeof closeCommandPalette === 'function') closeCommandPalette();
  }

  function showFeedback(text, type) {
    let toast = document.getElementById('voice-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'voice-toast';
      toast.className = 'voice-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.className = `voice-toast voice-toast-${type || 'info'} voice-toast-show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove('voice-toast-show'); }, 2500);
  }

  function processTranscript(transcript) {
    const text = transcript.trim();
    if (!text) return;

    showFeedback(`\uD83C\uDF99\uFE0F "${text}"`, 'info');

    for (const cmd of VOICE_COMMANDS) {
      for (const pattern of cmd.patterns) {
        if (pattern.test(text)) {
          setTimeout(() => {
            cmd.action();
            showFeedback(`\u2705 ${cmd.feedback}`, 'success');
          }, 300);
          return;
        }
      }
    }

    showFeedback(`\u2753 Command not recognized: "${text}"`, 'warning');
  }

  function start() {
    if (!supported || isListening) return;
    try {
      recognition.start();
      isListening = true;
      updateUI();
      showFeedback('\uD83C\uDF99\uFE0F Voice control active \u2014 say a command', 'success');
    } catch (e) {
      showFeedback('\u274C Could not start voice recognition', 'error');
    }
  }

  function stop() {
    if (!supported || !isListening) return;
    recognition.stop();
    isListening = false;
    updateUI();
    showFeedback('\uD83C\uDF99\uFE0F Voice control stopped', 'info');
  }

  function toggle() {
    isListening ? stop() : start();
  }

  function updateUI() {
    const btn = document.getElementById('voice-btn');
    if (btn) {
      btn.classList.toggle('voice-active', isListening);
      btn.title = isListening ? 'Stop Voice Control (V)' : 'Start Voice Control (V)';
    }
    const indicator = document.getElementById('voice-indicator');
    if (indicator) indicator.hidden = !isListening;
  }

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const btn = document.getElementById('voice-btn');
      if (btn) btn.title = 'Voice control not supported in this browser';
      return;
    }

    supported = true;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        processTranscript(last[0].transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        showFeedback('\u274C Microphone access denied', 'error');
        isListening = false;
        updateUI();
      } else if (event.error !== 'no-speech') {
        showFeedback(`\u26A0\uFE0F Voice error: ${event.error}`, 'warning');
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (e) { /* restart failed */ }
      }
    };

    const btn = document.getElementById('voice-btn');
    if (btn) btn.addEventListener('click', toggle);

    updateUI();
  }

  return { init, start, stop, toggle, get isListening() { return isListening; }, get supported() { return supported; } };
})();

function initVoiceControl() { VoiceControl.init(); }
