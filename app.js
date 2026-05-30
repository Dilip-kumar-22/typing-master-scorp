/* app.js — Core State Machine, Touch-Typing Curriculum Pages, and Input handling modules. */

// ─── STORAGE MODULE ────────────────────────────────────
const STORAGE_KEY = 'typing_master_v2';
function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}
function saveStore(patch) {
  const s = loadStore();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, ...patch }));
}

const DEFAULT_SETTINGS = {
  theme: 'dark', accent: 'violet', font: 'JetBrains Mono', fontSize: 30,
  cursor: 'line', sound: true, volume: 0.4, soundPack: 'mechanical',
  promptLength: 20, timer: 'count-up', hlKeys: true, nextPreview: true, autoAdvance: false,
};

// ─── MASTER STATE ──────────────────────────────────────
const S = {
  view: 'home', // 'home' | 'practice'
  activeTab: 'lessons', // 'lessons' | 'challenges' | 'custom'
  settings: { ...DEFAULT_SETTINGS, ...(loadStore().settings || {}) },
  
  mode: window.LESSONS[0], // current active mode/lesson
  prompt: '',
  pos: 0,
  errorIdx: new Set(),
  errorCount: 0,
  startTs: null,
  elapsed: 0,
  streak: 0,
  bestStreak: 0,
  activeKeys: new Set(),
  
  keyFreq: {},
  keyErrs: {},
  kbView: 'frequency', // 'frequency' | 'errors'
  drawerOpen: false,
  zen: false,
  result: null,
  
  history: loadStore().history || [],
  modePopoverOpen: false,
  customKeys: new Set(['a','s','d','f','j','k','l']),
  expandedCards: {},
  timerInterval: null,
  shortcutsHelpOpen: false,

  // Curriculum updates
  unlockedLessons: loadStore().unlockedLessons || ['lesson-1'],
  completedLessons: loadStore().completedLessons || [],
  tutorialActive: false, // displays instructions card before starting a lesson
  refresherActive: false, // triggers adaptive miss-keys drill
  refresherKeys: new Set(),
  skippedGuides: new Set(loadStore().skippedGuides || [])
};

// Apply audio synthesizer volume and profiles
window.SynthAudio.setVolume(S.settings.volume);
window.SynthAudio.setEnabled(S.settings.sound);
window.SynthAudio.setPack(S.settings.soundPack);

// ─── VISUAL STYLES CONFIG ─────────────────────────────
function applyVisualSettings() {
  const root = document.documentElement;
  const settings = S.settings;

  // Theme overrides
  let activeTheme = settings.theme;
  if (activeTheme === 'auto') {
    activeTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.body.className = `theme-${activeTheme} accent-${settings.accent} cursor-${settings.cursor}`;

  // Font family overrides
  let fontValue = settings.font;
  if (fontValue === 'JetBrains Mono') {
    fontValue = "'JetBrains Mono', 'Fira Code', monospace";
  } else if (fontValue === 'Fira Code') {
    fontValue = "'Fira Code', 'JetBrains Mono', monospace";
  } else {
    fontValue = "'Courier New', Courier, monospace";
  }
  root.style.setProperty('--font-mono', fontValue);

  // Font size overrides
  root.style.setProperty('--font-size-typing', settings.fontSize + 'px');

  // Accent re-coloring mapping
  const swatches = {
    violet: {
      primary: '#8b5cf6',
      glow: '0 0 40px rgba(139, 92, 246, 0.55)',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
    },
    cyan: {
      primary: '#22d3ee',
      glow: '0 0 40px rgba(34, 211, 238, 0.55)',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)'
    },
    lime: {
      primary: '#a3e635',
      glow: '0 0 40px rgba(163, 230, 53, 0.55)',
      gradient: 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)'
    },
    amber: {
      primary: '#f59e0b',
      glow: '0 0 40px rgba(245, 158, 11, 0.55)',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)'
    }
  };

  const choice = swatches[settings.accent] || swatches.violet;
  root.style.setProperty('--accent', choice.primary);
  root.style.setProperty('--accent-glow', choice.glow);
  root.style.setProperty('--accent-gradient', choice.gradient);
}

// Init visual deck styles
applyVisualSettings();

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (S.settings.theme === 'auto') applyVisualSettings();
});

// ─── HELPERS ───────────────────────────────────────────
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'className') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'innerHTML') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
    else if (Array.isArray(c)) c.forEach(cc => { if (cc) el.appendChild(cc); });
    else el.appendChild(c);
  }
  return el;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

function svgIcon(paths, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function escapeHTML(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, ms = 2400) {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 220);
  }, ms);
}

// ─── COMPUTED METRICS ─────────────────────────────────
// Pure function — single source of truth for WPM/accuracy.
// Used by both the live stats bar and the final results card.
function computeMetrics({ pos, errorIdxSize, errorCount, elapsedSec, promptLength }) {
  const currentlyCorrect = Math.max(0, pos - errorIdxSize);
  // Accuracy = of what is now on screen, how much is correct.
  // Backspace-corrected mistakes recover the displayed accuracy
  // because errorIdxSize shrinks when the user fixes them.
  // (errorCount remains as a lifetime "Errors made" counter.)
  const acc = pos === 0
    ? 100
    : Math.max(0, Math.min(100, Math.round((currentlyCorrect / pos) * 100)));
  const minutes = Math.max(elapsedSec / 60, 0.01);
  const wpm = Math.max(0, Math.round((currentlyCorrect / 5) / minutes));
  const rawWpm = Math.max(0, Math.round(((pos + errorCount) / 5) / minutes));
  const progress = !promptLength ? 0 : pos / promptLength;
  return { wpm, rawWpm, acc, progress, currentlyCorrect };
}

function getStats() {
  return computeMetrics({
    pos: S.pos,
    errorIdxSize: S.errorIdx.size,
    errorCount: S.errorCount,
    elapsedSec: S.elapsed,
    promptLength: S.prompt.length,
  });
}

function getTargetKeys() {
  if (S.mode && S.mode.id === 'custom-set') return S.customKeys;
  if (!S.settings.hlKeys || !S.mode) return new Set();
  return new Set((S.mode.keys || '').toLowerCase().split(''));
}

function getHeatMap() {
  const src = S.kbView === 'errors' ? S.keyErrs : S.keyFreq;
  const vals = Object.values(src);
  if (!vals.length) return {};
  const max = Math.max(...vals);
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
  }
  return out;
}

function getFingerInstruction() {
  if (S.pos >= S.prompt.length) return 'Session finished!';
  const expected = S.prompt[S.pos];
  const finger = window.FINGER_MAP[expected] || 'Index Finger';
  return `👉 Stroke with your ${finger}`;
}

// ─── PRACTICE STATE CONTROLLERS ───────────────────────
function resetTyping() {
  S.pos = 0; S.errorIdx = new Set(); S.errorCount = 0;
  S.streak = 0; S.startTs = null; S.elapsed = 0; S.result = null;
  if (S.timerInterval) { clearInterval(S.timerInterval); S.timerInterval = null; }
}

function restart() {
  resetTyping();
  if (S.refresherActive) {
    S.prompt = window.generateFromCustomKeys(S.refresherKeys, S.settings.promptLength);
  } else if (S.mode.id === 'custom-set') {
    S.prompt = window.generateFromCustomKeys(S.customKeys, S.settings.promptLength);
  } else if (S.mode.instructions) {
    // Lesson chapter
    S.prompt = window.generateFromCustomKeys(new Set(S.mode.pool.join('').split('')), S.settings.promptLength);
  } else {
    S.prompt = window.buildPrompt(S.mode, S.settings.promptLength);
  }
  S.keyFreq = {}; S.keyErrs = {};
  render();
}

function pickMode(item) {
  resetTyping();
  S.mode = item;
  S.keyFreq = {}; S.keyErrs = {};
  S.refresherActive = false;
  S.refresherKeys.clear();

  if (item.id === 'custom-set') {
    S.prompt = window.generateFromCustomKeys(S.customKeys, S.settings.promptLength);
    S.tutorialActive = false;
  } else if (item.instructions) {
    // Lesson chapter -> show the guide first, unless the user has dismissed it forever.
    S.prompt = window.generateFromCustomKeys(new Set(item.pool.join('').split('')), S.settings.promptLength);
    S.tutorialActive = !S.skippedGuides.has(item.id);
  } else {
    S.prompt = window.buildPrompt(item, S.settings.promptLength);
    S.tutorialActive = false;
  }
}

function dismissGuideForever(lessonId) {
  S.skippedGuides.add(lessonId);
  saveStore({ skippedGuides: [...S.skippedGuides] });
}

function pickAndStart(item) {
  pickMode(item);
  S.view = 'practice';
  S.modePopoverOpen = false;
  render();
}

function startPractice() {
  S.tutorialActive = false;
  render();
}

function startRefresherDrill() {
  S.refresherActive = true;
  restart();
}

function goHome() {
  S.view = 'home';
  S.modePopoverOpen = false;
  render();
}

function updateSetting(k, v) {
  S.settings[k] = v;
  saveStore({ settings: S.settings });
  applyVisualSettings();
  if (k === 'volume') window.SynthAudio.setVolume(v);
  if (k === 'sound') window.SynthAudio.setEnabled(v);
  if (k === 'soundPack') window.SynthAudio.setPack(v);
  if (k === 'promptLength' && S.pos === 0) {
    restart();
  }
  render();
}

function shareResult() {
  if (!S.result) return;
  const text = `I scored ${S.result.wpm} WPM at ${S.result.acc}% accuracy on ${S.mode.title || S.mode.label} — Typing Master by S-Corp`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Result copied to clipboard'))
      .catch(() => showToast('Could not copy — your browser blocked clipboard access'));
  } else {
    showToast('Clipboard not available in this browser');
  }
}

function resetProgress() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    S.history = [];
    S.unlockedLessons = ['lesson-1'];
    S.completedLessons = [];
    saveStore({ history: [], unlockedLessons: ['lesson-1'], completedLessons: [] });
    render();
  }
}

// ─── COMPLETE SESSION ─────────────────────────────────
function completeSession() {
  const time = Math.max(0.1, (Date.now() - S.startTs) / 1000);
  const m = computeMetrics({
    pos: S.pos,
    errorIdxSize: S.errorIdx.size,
    errorCount: S.errorCount,
    elapsedSec: time,
    promptLength: S.prompt.length,
  });
  const finalWpm = m.wpm;
  const finalRaw = m.rawWpm;
  const acc = m.acc;
  const finalCorrect = m.currentlyCorrect;
  const struggle = Object.entries(S.keyErrs).sort((a,b) => b[1]-a[1]).map(([k,n]) => ({k,n}));

  const sameMode = S.history.filter(h => h.modeId === S.mode.id);
  const prevBest = sameMode.length ? Math.max(...sameMode.map(h => h.wpm)) : 0;
  // Personal best only counts when there is a prior session in the SAME mode.
  // Previously this used global history length, so the first run of a new mode
  // would silently auto-PB whenever the user had any prior history.
  const isBest = sameMode.length > 0 && finalWpm > prevBest;
  const prevWpm = sameMode.length ? sameMode[sameMode.length-1].wpm : null;
  
  const session = {
    date: Date.now(), modeId: S.mode.id,
    modeLabel: S.mode.label || S.mode.title,
    wpm: finalWpm, acc, time: Math.round(time)
  };
  S.history = [...S.history, session].slice(-20);
  saveStore({ history: S.history });
  
  if (isBest) window.SynthAudio.best(); else window.SynthAudio.complete();
  if (S.timerInterval) { clearInterval(S.timerInterval); S.timerInterval = null; }

  // Curriculum unlocking logic
  let lockedNext = false;
  let refresherTriggered = false;

  if (S.mode.instructions && !S.refresherActive) {
    if (acc < 85 && struggle.length > 0) {
      // Trigger adaptive miss-keys refresher drill!
      refresherTriggered = true;
      S.refresherKeys = new Set(struggle.map(s => s.k));
    } else {
      // Add checkmark completion
      if (!S.completedLessons.includes(S.mode.id)) {
        S.completedLessons.push(S.mode.id);
        saveStore({ completedLessons: S.completedLessons });
      }
      
      // Unlock next chapter
      const idx = window.LESSONS.findIndex(l => l.id === S.mode.id);
      if (idx !== -1 && idx < window.LESSONS.length - 1) {
        const nextId = window.LESSONS[idx+1].id;
        if (!S.unlockedLessons.includes(nextId)) {
          S.unlockedLessons.push(nextId);
          saveStore({ unlockedLessons: S.unlockedLessons });
          lockedNext = true;
        }
      }
    }
  }

  // Handle continuous auto-advance
  if (S.settings.autoAdvance) {
    restart();
    return;
  }

  S.result = {
    wpm: finalWpm, raw: finalRaw, acc, errors: S.errorCount,
    correct: finalCorrect, time: Math.round(time), struggle,
    isBest, prevWpm, lockedNext, refresherTriggered
  };
  
  render();
  if (acc > 95) fireConfetti();
  animateResultWpm(finalWpm);
  animateDonut(acc);
}

// ─── KEYBOARD LISTENERS ────────────────────────────────
document.addEventListener('keydown', e => {
  // Global hotkeys available on all views
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    S.zen = !S.zen;
    render();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    S.drawerOpen = !S.drawerOpen;
    render();
    return;
  }

  if (S.view !== 'practice') {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      toggleShortcutsHelp();
    }
    return;
  }

  // Drawer or results overlay open → never steal typing input from the drawer.
  if (S.drawerOpen) return;
  if (S.result) return;
  if (S.tutorialActive) return; // Disable typing until instructions are closed

  const expected = S.prompt[S.pos];
  const got = e.key;

  const k = e.key.length === 1 ? e.key.toLowerCase() : e.code;
  S.activeKeys.add(k);
  renderKeyboardActiveState();

  if (e.key === 'Escape') {
    e.preventDefault();
    resetTyping();
    S.keyFreq = {}; S.keyErrs = {};
    render();
    return;
  }

  // Tab restarts the prompt — but only on a plain Tab (no modifiers),
  // so the user can still Ctrl/Shift+Tab to switch browser tabs.
  if (e.key === 'Tab' && expected !== '\t' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    restart();
    return;
  }

  if (e.key === '?' && !S.startTs) {
    e.preventDefault();
    toggleShortcutsHelp();
    return;
  }

  // Backspace correction
  if (e.key === 'Backspace') {
    e.preventDefault();
    if (expected === '\b') {
      window.SynthAudio.correct();
      S.keyFreq['\b'] = (S.keyFreq['\b'] || 0) + 1;
      S.pos++;
      S.streak++;
      S.bestStreak = Math.max(S.bestStreak, S.streak);
    } else {
      if (S.pos > 0) {
        S.pos--;
        S.errorIdx.delete(S.pos);
        if (S.streak > 0) S.streak--;
      }
    }
    updateTypingDisplay();
    updateStatsDisplay();
    return;
  }

  if (S.result) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  let isTargetMatch = false;
  let isCorrect = false;

  if (expected === '\n' && e.key === 'Enter') {
    isTargetMatch = true;
    isCorrect = true;
  } else if (expected === '\t' && e.key === 'Tab') {
    isTargetMatch = true;
    isCorrect = true;
  } else if (e.key.length === 1) {
    isTargetMatch = true;
    isCorrect = (got === expected);
  }

  if (!isTargetMatch) return;

  e.preventDefault();

  if (!S.startTs) {
    S.startTs = Date.now();
    S.timerInterval = setInterval(() => {
      S.elapsed = (Date.now() - S.startTs) / 1000;
      
      let isFinished = false;
      if (S.settings.timer !== 'off' && S.settings.timer !== 'count-up') {
        const limit = parseInt(S.settings.timer);
        if (S.elapsed >= limit) {
          S.elapsed = limit;
          isFinished = true;
        }
      }
      updateStatsDisplay();
      if (isFinished) {
        clearInterval(S.timerInterval);
        S.timerInterval = null;
        completeSession();
      }
    }, 100);
  }

  const logKey = got.length === 1 ? got.toLowerCase() : (got === 'Enter' ? '\n' : '\t');
  S.keyFreq[logKey] = (S.keyFreq[logKey] || 0) + 1;

  if (isCorrect) {
    window.SynthAudio.correct();
    S.pos++;
    S.streak++;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
  } else {
    window.SynthAudio.wrong();
    S.errorCount++;
    S.errorIdx.add(S.pos);
    const errKey = expected.length === 1 ? expected.toLowerCase() : (expected === '\n' ? '\n' : '\t');
    S.keyErrs[errKey] = (S.keyErrs[errKey] || 0) + 1;
    S.streak = 0;
    S.pos++;
  }
  if (expected === ' ') window.SynthAudio.word();

  updateTypingDisplay();
  updateStatsDisplay();

  if (S.pos >= S.prompt.length) {
    completeSession();
  }
});

document.addEventListener('keyup', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.code;
  S.activeKeys.delete(k);
  renderKeyboardActiveState();
});

// If the window loses focus mid-keypress, the matching keyup never fires
// and the 3D keyboard would show a key stuck "down" forever.
window.addEventListener('blur', () => {
  if (S.activeKeys.size === 0) return;
  S.activeKeys.clear();
  renderKeyboardActiveState();
});

// ─── MASTER DOM RENDERING ─────────────────────────────
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(renderTopbar());
  
  if (S.view === 'home') {
    const home = h('div', { className: 'home' });
    home.appendChild(renderHero());
    home.appendChild(renderModesNavigation());
    home.appendChild(renderActiveTabContent());
    home.appendChild(renderStatsStrip());
    if (S.history.length > 0) home.appendChild(renderTrendCard());
    if (S.history.length > 0) home.appendChild(renderRecentSessions());
    home.appendChild(renderFooter());
    app.appendChild(home);
  } else {
    const practice = h('div', { className: 'practice' });
    practice.appendChild(renderPracticeHead());
    practice.appendChild(renderStatsBar());
    
    if (S.tutorialActive) {
      practice.appendChild(renderTutorialCard());
    } else {
      practice.appendChild(renderTypingCard());
      if (S.mode.id === 'custom-set') practice.appendChild(renderCustomKeysPanel());
      practice.appendChild(renderKeyboardCard());
    }
    app.appendChild(practice);
  }
  
  if (S.result) app.appendChild(renderResultsOverlay());
  if (S.drawerOpen) app.appendChild(renderSettingsDrawer());
  if (S.shortcutsHelpOpen) app.appendChild(renderShortcutsModal());
}

// ─── DOM COMPONENTS ───────────────────────────────────
function renderTopbar() {
  const bar = h('div', { className: 'topbar' });

  // Brand logo & title
  const brand = h('div', { className: 'brand', onClick: goHome });
  brand.innerHTML = `
    <div class="brand-mark">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="3"/>
        <line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/>
        <line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/>
        <line x1="7" y1="15" x2="17" y2="15"/>
      </svg>
    </div>
    <div class="brand-title"><div class="t1">Typing Master</div><div class="t2">by S-Corp · v2.0</div></div>`;
  bar.appendChild(brand);

  const actions = h('div', { className: 'topbar-actions' });

  // Theme switcher
  const tt = h('div', { className: 'theme-toggle' });
  const lightBtn = h('button', { className: S.settings.theme === 'light' ? 'on' : '', title: 'Light Mode',
    onClick: () => updateSetting('theme', 'light') });
  lightBtn.innerHTML = svgIcon('<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>', 14);
  const darkBtn = h('button', { className: S.settings.theme === 'dark' ? 'on' : '', title: 'Dark Mode',
    onClick: () => updateSetting('theme', 'dark') });
  darkBtn.innerHTML = svgIcon('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', 14);
  tt.appendChild(lightBtn); tt.appendChild(darkBtn);
  actions.appendChild(tt);

  // Settings
  const settingsBtn = h('button', { className: 'icon-btn' + (S.drawerOpen ? ' is-active' : ''), title: 'Settings',
    onClick: () => { S.drawerOpen = true; render(); } });
  settingsBtn.innerHTML = svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');
  actions.appendChild(settingsBtn);

  bar.appendChild(actions);
  return bar;
}

function renderHero() {
  const bestWpm = S.history.length ? Math.max(...S.history.map(h => h.wpm)) : 0;
  const section = h('section', { className: 'hero' });
  const completedCount = S.completedLessons.length;
  const progressPercent = Math.round((completedCount / window.LESSONS.length) * 100);

  section.innerHTML = `
    <div class="hero-bg"></div>
    <div class="hero-inner">
      <div class="hero-left">
        <div class="hero-tag"><span class="pulse"></span> Curriculum progress: ${completedCount}/${window.LESSONS.length} chapters (${progressPercent}%)</div>
        <h1 class="hero-title">Train your fingers.<br/><span class="grad">Sharpen your mind.</span></h1>
        <p class="hero-sub">Drill Home Row coordinate foundations, upper/lower row extensions, capital shifts, syntax sprint challenges, and custom selectors. Focus on accuracy first!</p>
        <div class="hero-cta">
          <button class="btn primary lg" id="hero-start">${svgIcon('<polygon points="6 4 20 12 6 20 6 4"/>', 16).replace('fill="none"','fill="currentColor"').replace('stroke="currentColor"','')} Start practice</button>
          <div class="hero-mode-chip"><span class="lbl">Last selected</span><span class="val">${S.mode.title || S.mode.label}</span></div>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-orb">
          <div class="orb-ring r1"></div><div class="orb-ring r2"></div><div class="orb-ring r3"></div>
          <div class="orb-core"><div class="orb-num">${bestWpm || '—'}</div><div class="orb-lbl">Best WPM</div></div>
        </div>
      </div>
    </div>`;
  setTimeout(() => {
    document.getElementById('hero-start')?.addEventListener('click', () => { S.view = 'practice'; render(); });
  }, 0);
  return section;
}

function renderModesNavigation() {
  const nav = h('nav', { className: 'modes-nav' });
  const tabs = [
    { id: 'lessons', label: '📚 Lessons Curriculum' },
    { id: 'challenges', label: '🏆 Challenges' },
    { id: 'custom', label: '🛠️ Custom picker' }
  ];
  tabs.forEach(t => {
    const isActive = S.activeTab === t.id ? ' is-active' : '';
    const btn = h('button', { className: 'modes-nav-btn' + isActive, onClick: () => { S.activeTab = t.id; render(); } }, t.label);
    nav.appendChild(btn);
  });
  return nav;
}

function renderActiveTabContent() {
  const container = h('div', { className: 'tab-content' });
  
  if (S.activeTab === 'lessons') {
    // Restructured Chapter Curriculum Grid
    container.innerHTML = '<div class="section-head"><h2>📚 Touch-Typing Curriculum Chapters</h2><p>Unlock chapters sequentially to build complete muscle coordinate memory. Pass lessons with >85% accuracy.</p></div>';
    const grid = h('div', { className: 'modes-grid' });
    
    window.LESSONS.forEach((lesson, index) => {
      const isUnlocked = S.unlockedLessons.includes(lesson.id);
      const isCompleted = S.completedLessons.includes(lesson.id);
      const isActive = S.mode.id === lesson.id;
      
      const card = h('div', { className: 'modecard tone-violet', style: { opacity: isUnlocked ? 1 : 0.45 } });
      
      let badgeHtml = '';
      if (!isUnlocked) badgeHtml = `<span class="lock-badge">🔒 Locked</span>`;
      else if (isCompleted) badgeHtml = `<span class="check-badge">✓ Complete</span>`;
      else badgeHtml = `<span class="check-badge" style="background:rgba(139,92,246,0.15);color:var(--violet-2)">★ Unlocked</span>`;
      
      card.innerHTML = `
        <div class="mc-head" style="margin-bottom:8px">
          <div class="mc-icon">${index + 1}</div>
          <div style="flex:1"><div class="mc-title" style="font-size:15px">${lesson.title}</div><div class="mc-meta">${lesson.subtitle}</div></div>
          ${badgeHtml}
        </div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;line-height:1.5">${lesson.instructions.slice(0, 75)}...</div>
        <div class="mc-items">
          <button class="mc-item${isActive?' is-active':''}" ${isUnlocked?'':'disabled'} data-lesson-id="${lesson.id}">
            <span class="dot"></span><span>${isActive ? 'Selected' : 'Load chapter'}</span>
            ${svgIcon('<polyline points="9 18 15 12 9 6"/>', 14).replace('<svg','<svg class="arrow"')}
          </button>
        </div>`;
        
      setTimeout(() => {
        card.querySelector('[data-lesson-id]')?.addEventListener('click', () => {
          pickAndStart(lesson);
        });
      }, 0);
      grid.appendChild(card);
    });
    container.appendChild(grid);
    
  } else if (S.activeTab === 'challenges') {
    // Challenge lists
    container.innerHTML = '<div class="section-head"><h2>🏆 Elite Speed & Accuracy Challenges</h2><p>Push your speed metrics with seeded Daily Challenges, multi-line punctuation drills, or py/js code runs.</p></div>';
    const grid = h('div', { className: 'modes-grid' });
    
    window.CHALLENGES.forEach(ch => {
      const isActive = S.mode.id === ch.id;
      const card = h('div', { className: 'modecard tone-cyan' });
      card.innerHTML = `
        <div class="mc-head" style="margin-bottom:12px">
          <div class="mc-icon">⚡</div>
          <div><div class="mc-title">${ch.label}</div><div class="mc-meta">Challenge Mode</div></div>
        </div>
        <p style="font-size:12px;color:var(--text-2);margin-bottom:16px;line-height:1.5">${ch.desc}</p>
        <div class="mc-items">
          <button class="mc-item${isActive?' is-active':''}" data-ch-id="${ch.id}">
            <span class="dot"></span><span>${isActive ? 'Selected' : 'Take challenge'}</span>
            ${svgIcon('<polyline points="9 18 15 12 9 6"/>', 14).replace('<svg','<svg class="arrow"')}
          </button>
        </div>`;
      setTimeout(() => {
        card.querySelector('[data-ch-id]')?.addEventListener('click', () => {
          pickAndStart(ch);
        });
      }, 0);
      grid.appendChild(card);
    });
    container.appendChild(grid);
    
  } else {
    // Custom keys selector loading
    container.innerHTML = '<div class="section-head"><h2>🛠️ QWERTY Coordinate Builder</h2><p>Practice custom selected coordinate grids. Perfect for focus training on specific struggle key groups.</p></div>';
    const row = h('div', { style: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '22px' } });
    
    const settingsCard = h('div', { className: 'modecard tone-amber', style: { height: 'max-content' } });
    const isActive = S.mode.id === 'custom-set';
    settingsCard.innerHTML = `
      <div class="mc-head">
        <div class="mc-icon">⚒️</div>
        <div><div class="mc-title">Custom Coordinate set</div><div class="mc-meta">Key Laboratory</div></div>
      </div>
      <p style="font-size:12px;color:var(--text-2);margin-bottom:16px;line-height:1.5">Pick keycaps on the right coordinates map to build specialized prompts. Focus exclusively on keys you struggle with.</p>
      <button class="btn primary" style="width:100%;justify-content:center" id="custom-lab-start" ${S.customKeys.size < 2 ? 'disabled' : ''}>${isActive ? 'Start training' : 'Load coordinates Set'}</button>`;
    
    setTimeout(() => {
      document.getElementById('custom-lab-start')?.addEventListener('click', () => {
        const customItem = { id: 'custom-set', label: 'Custom Key set', keys: '', src: 'custom' };
        pickAndStart(customItem);
      });
    }, 0);

    row.appendChild(settingsCard);
    row.appendChild(renderCustomKeysPanel());
    container.appendChild(row);
  }
  
  return container;
}

function renderStatsStrip() {
  const bestWpm = S.history.length ? Math.max(...S.history.map(h => h.wpm)) : 0;
  const avgWpm = S.history.length ? Math.round(S.history.reduce((s,h) => s + h.wpm, 0) / S.history.length) : 0;
  const totalTime = S.history.reduce((s,h) => s + (h.time || 0), 0);
  const minutes = Math.floor(totalTime / 60);

  const strip = h('section', { className: 'stats-strip' });
  strip.innerHTML = `
    <div class="mini-stat tone-violet"><div class="ms-lbl">Best WPM</div><div class="ms-val"><span>${bestWpm}</span></div></div>
    <div class="mini-stat tone-cyan"><div class="ms-lbl">Avg WPM</div><div class="ms-val"><span>${avgWpm}</span></div></div>
    <div class="mini-stat tone-magenta"><div class="ms-lbl">Total time</div><div class="ms-val"><span>${minutes}</span><span class="u">min</span></div></div>
    <div class="mini-stat tone-lime"><div class="ms-lbl">Sessions</div><div class="ms-val"><span>${S.history.length}</span><span class="u">/ 20</span></div></div>`;
  return strip;
}

function renderTrendCard() {
  const section = h('section', { className: 'trend-card' });
  const data = S.history.slice(-20).map(h => h.wpm);
  let trendLabel = '';
  if (S.history.length >= 2) {
    trendLabel = S.history[S.history.length-1].wpm >= S.history[S.history.length-2].wpm
      ? '<span class="up">↑ improving</span>' : '<span class="down">↓ slow run</span>';
  }
  section.innerHTML = `
    <div class="trend-head">
      <div><h3>WPM trend</h3><p>Last ${Math.min(20, S.history.length)} sessions</p></div>
      <div class="trend-pill">${trendLabel}</div>
    </div>`;
  section.appendChild(renderTrendSVG(data));
  return section;
}

function renderTrendSVG(data) {
  if (!data.length) return h('div', { style: { color: 'var(--text-3)', fontSize: '12px', padding: '8px 0' } }, 'No sessions yet.');
  const max = Math.max(...data, 60), min = Math.min(...data, 0);
  const w = 360, ht = 90, pad = 10;
  const stepX = (w - pad*2) / Math.max(1, data.length-1);
  const yOf = v => ht - pad - ((v - min) / Math.max(1, max - min)) * (ht - pad*2);
  const pts = data.map((v,i) => [pad + i*stepX, yOf(v)]);
  const path = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pad + (data.length-1)*stepX} ${ht-pad} L ${pad} ${ht-pad} Z`;

  const container = h('div', { style: { marginTop: '8px' } });
  container.innerHTML = `
    <svg width="100%" viewBox="0 0 ${w} ${ht}" style="display:block">
      <defs>
        <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(139,92,246,0.35)"/><stop offset="100%" stop-color="rgba(139,92,246,0)"/></linearGradient>
      </defs>
      <path d="${area}" fill="url(#trendFill)"/>
      <path d="${path}" fill="none" stroke="url(#trendStroke)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p,i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?4:2.4}" fill="${i===pts.length-1?'#fff':'#a78bfa'}" stroke="${i===pts.length-1?'#8b5cf6':'none'}" stroke-width="2"/>`).join('')}
    </svg>
    <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-3);margin-top:6px">
      <span>min ${min}</span><span>last ${data[data.length-1]} wpm</span><span>best ${max}</span>
    </div>`;
  return container;
}

function renderRecentSessions() {
  const section = h('section', { className: 'recent' });
  section.innerHTML = `<div class="section-head"><h2>Recent sessions</h2><p>Your last ${Math.min(8, S.history.length)} runs</p></div>`;
  const table = h('div', { className: 'recent-table' });
  table.innerHTML = '<div class="recent-head"><div>Mode</div><div>WPM</div><div>Accuracy</div><div>Time</div><div>When</div></div>';
  [...S.history].reverse().slice(0,8).forEach(s => {
    const accColor = s.acc >= 95 ? '#4ade80' : (s.acc >= 85 ? '#facc15' : '#fb7185');
    table.innerHTML += `<div class="recent-row">
      <div class="m">${escapeHTML(s.modeLabel || s.modeId)}</div>
      <div class="w" style="color:var(--accent)">${s.wpm}</div>
      <div style="color:${accColor}">${s.acc}%</div>
      <div>${s.time}s</div>
      <div class="d">${timeAgo(s.date)}</div>
    </div>`;
  });
  section.appendChild(table);
  return section;
}

function renderFooter() {
  const footer = h('footer', { className: 'home-foot' });
  footer.innerHTML = '<span>Typing Master · S-Corp · v2.0</span><span style="cursor:pointer" id="footer-shortcuts-trigger">Press <kbd>?</kbd> for keyboard shortcuts</span>';
  setTimeout(() => {
    document.getElementById('footer-shortcuts-trigger')?.addEventListener('click', toggleShortcutsHelp);
  }, 0);
  return footer;
}

// ─── PRACTICE VIEWS & HEADS ───────────────────────────
function renderPracticeHead() {
  const head = h('div', { className: 'practice-head' });
  const categoryLabel = S.refresherActive ? 'Adaptive Drill' : (S.mode.instructions ? 'Lesson Chapter' : 'Challenge Mode');

  head.innerHTML = `
    <button class="back-btn" id="back-home">${svgIcon('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>', 14)} Home</button>
    <div class="practice-mode-pick">
      <span class="group">${categoryLabel}</span>
      <span class="sep">·</span>
      <button class="picker" id="mode-picker">${S.refresherActive ? 'Missed Keys Refresher' : (S.mode.title || S.mode.label)}
        ${svgIcon('<polyline points="6 9 12 15 18 9"/>', 12).replace('<svg', '<svg style="transform:rotate('+(S.modePopoverOpen?'180':'0')+'deg);transition:transform 0.2s ease"')}
      </button>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn ghost" id="restart-btn">${svgIcon('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', 14)} Restart</button>
    </div>`;

  setTimeout(() => {
    document.getElementById('back-home')?.addEventListener('click', goHome);
    document.getElementById('restart-btn')?.addEventListener('click', restart);
    document.getElementById('mode-picker')?.addEventListener('click', () => {
      S.modePopoverOpen = !S.modePopoverOpen;
      render();
    });
  }, 0);

  if (S.modePopoverOpen) {
    const popover = h('div', { className: 'mode-popover', onClick: e => e.stopPropagation() });
    
    // Lessons group
    let lessonHtml = `<div class="grp"><div class="grp-lbl">Lessons</div>`;
    window.LESSONS.forEach(l => {
      const isUnlocked = S.unlockedLessons.includes(l.id);
      if (isUnlocked) lessonHtml += `<button class="pop-item${S.mode.id===l.id && !S.refresherActive ?' on':''}" data-pop-mode="${escapeHTML(l.id)}">${escapeHTML(l.title.split(':')[0])}</button>`;
    });
    popover.innerHTML += lessonHtml + '</div>';

    // Challenges group
    let chHtml = `<div class="grp"><div class="grp-lbl">Challenges</div>`;
    window.CHALLENGES.forEach(c => {
      chHtml += `<button class="pop-item${S.mode.id===c.id && !S.refresherActive ?' on':''}" data-pop-mode="${escapeHTML(c.id)}">${escapeHTML(c.label)}</button>`;
    });
    popover.innerHTML += chHtml + '</div>';

    head.querySelector('.practice-mode-pick').appendChild(popover);

    setTimeout(() => {
      popover.querySelectorAll('[data-pop-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.popMode;
          const allItems = [...window.LESSONS, ...window.CHALLENGES];
          const it = allItems.find(i => i.id === id);
          if (it) {
            pickMode(it);
            S.modePopoverOpen = false;
            render();
          }
        });
      });
    }, 0);
  }

  return head;
}

function getTimeDisplayVal() {
  if (S.zen) return 0;
  if (S.settings.timer !== 'off' && S.settings.timer !== 'count-up') {
    return Math.max(0, parseInt(S.settings.timer) - Math.floor(S.elapsed));
  }
  return Math.floor(S.elapsed);
}

function renderStatsBar() {
  const stats = getStats();
  const prevSession = S.history.filter(h => h.modeId === S.mode.id).slice(-2)[0];
  const wpmDelta = prevSession ? stats.wpm - prevSession.wpm : null;
  const isCountdown = S.settings.timer !== 'off' && S.settings.timer !== 'count-up';
  const limit = isCountdown ? parseInt(S.settings.timer) : 0;
  const timeProgress = isCountdown ? (S.elapsed / limit) * 100 : stats.progress * 100;

  const bar = h('div', { className: 'stats-bar', id: 'stats-bar' });
  bar.innerHTML = `
    <div class="stat wpm"><div class="lbl">WPM</div><div class="val"><span id="stat-wpm">${S.zen ? 0 : stats.wpm}</span><span class="unit">raw <span id="stat-raw">${S.zen ? 0 : stats.rawWpm}</span></span></div>
      ${wpmDelta != null ? `<div class="delta ${wpmDelta>=0?'up':'down'}">${wpmDelta>=0?'↑':'↓'} ${Math.abs(wpmDelta)}</div>` : ''}
      <div class="bar"><span id="stat-wpm-bar" style="width:${Math.min(100,stats.wpm)}%"></span></div>
    </div>
    <div class="stat acc"><div class="lbl">Accuracy</div><div class="val"><span id="stat-acc">${S.zen ? 100 : stats.acc}</span><span class="unit">%</span></div></div>
    <div class="stat err"><div class="lbl">Errors</div><div class="val"><span id="stat-err">${S.zen ? 0 : S.errorCount}</span></div></div>
    <div class="stat streak"><div class="lbl">Streak</div><div class="val"><span id="stat-streak">${S.zen ? 0 : S.streak}</span><span class="unit">keys</span></div></div>
    <div class="stat time"><div class="lbl">Time</div><div class="val"><span id="stat-time">${getTimeDisplayVal()}</span><span class="unit">s</span></div>
      <div class="bar"><span id="stat-progress-bar" style="width:${timeProgress}%"></span></div>
    </div>
    <div class="controls">
      <button class="btn ${S.zen?'primary':'ghost'}" id="zen-btn">${svgIcon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>', 14)} Zen</button>
      <button class="btn" id="newtext-btn">New text</button>
      <button class="btn primary" id="restart-btn2">${svgIcon('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', 14)} Restart</button>
    </div>`;

  setTimeout(() => {
    document.getElementById('zen-btn')?.addEventListener('click', () => { S.zen = !S.zen; render(); });
    document.getElementById('newtext-btn')?.addEventListener('click', restart);
    document.getElementById('restart-btn2')?.addEventListener('click', restart);
  }, 0);

  return bar;
}

function updateStatsDisplay() {
  const stats = getStats();
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('stat-wpm', S.zen ? 0 : stats.wpm);
  el('stat-raw', S.zen ? 0 : stats.rawWpm);
  el('stat-acc', S.zen ? 100 : stats.acc);
  el('stat-err', S.zen ? 0 : S.errorCount);
  el('stat-streak', S.zen ? 0 : S.streak);
  el('stat-time', getTimeDisplayVal());
  const wpmBar = document.getElementById('stat-wpm-bar');
  if (wpmBar) wpmBar.style.width = Math.min(100, stats.wpm) + '%';
  const progBar = document.getElementById('stat-progress-bar');
  if (progBar) {
    const isCountdown = S.settings.timer !== 'off' && S.settings.timer !== 'count-up';
    const limit = isCountdown ? parseInt(S.settings.timer) : 0;
    const timeProgress = isCountdown ? (S.elapsed / limit) * 100 : stats.progress * 100;
    progBar.style.width = timeProgress + '%';
  }
}

function renderTutorialCard() {
  const card = h('div', { className: 'lesson-card' });
  const allowedKeysSet = getTargetKeys();
  const keysPreview = allowedKeysSet.size > 0
    ? [...allowedKeysSet]
        .map(c => c === ' ' ? '␣' : c === '\t' ? '⇥' : c === '\n' ? '⏎' : c === '\b' ? '⌫' : c)
        .join(' ').toUpperCase()
    : 'ALL KEYS';

  // Use the rich multi-paragraph `guide` if the lesson defines one;
  // fall back to the one-line `instructions` for older lessons.
  const paragraphs = (Array.isArray(S.mode.guide) && S.mode.guide.length > 0)
    ? S.mode.guide
    : [S.mode.instructions];
  const tipHtml = S.mode.tip
    ? `<div class="lesson-guide-tip"><strong>Pro tip</strong>${escapeHTML(S.mode.tip)}</div>`
    : '';

  card.innerHTML = `
    <div class="lesson-title-tag">📖 Tutorial · ${escapeHTML(S.mode.subtitle)}</div>
    <h2>${escapeHTML(S.mode.title)}</h2>
    <div style="padding:14px 18px;border:1px solid var(--hairline);border-radius:12px;background:rgba(0,0,0,0.15);margin:14px 0 6px;font-family:var(--font-mono);font-size:12px;color:var(--text-3)">
      <span style="color:var(--accent)">Active Target Keys:</span> ${keysPreview}
    </div>
    <div class="lesson-guide">
      ${paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('')}
      ${tipHtml}
    </div>
    <label class="lesson-guide-toggle">
      <input type="checkbox" id="tutorial-skip-forever"/>
      Don't show this guide again for this chapter
    </label>
    <div class="lesson-guide-actions">
      <button class="btn ghost" id="tutorial-skip-once">Skip just for now</button>
      <button class="btn primary lg" id="tutorial-close-start">Start Typing Practice</button>
    </div>`;

  setTimeout(() => {
    const start = () => {
      const skip = document.getElementById('tutorial-skip-forever');
      if (skip && skip.checked) dismissGuideForever(S.mode.id);
      startPractice();
    };
    document.getElementById('tutorial-close-start')?.addEventListener('click', start);
    document.getElementById('tutorial-skip-once')?.addEventListener('click', startPractice);
  }, 0);

  return card;
}

function renderTypingCard() {
  const stage = h('div', { className: 'typing-stage' });
  const card = h('div', { className: 'typing-card', id: 'typing-card' });

  card.innerHTML = '<div class="tilt-glare"></div>';

  const tag = h('div', { className: 'typing-mode-tag' });
  tag.innerHTML = `<span class="pulse"></span> ` + (S.refresherActive ? 'Adaptive Misses Refresher' : (S.mode.title || S.mode.label));
  card.appendChild(tag);

  // monospaced prompt letters
  const textEl = h('div', { className: 'typing-text', id: 'typing-text',
    style: { fontFamily: S.settings.font + ', "JetBrains Mono", monospace', fontSize: S.settings.fontSize + 'px' } });

  // Big Active Character Display for EdClub-style feel
  const activeCharBox = h('div', { className: 'active-char-display', id: 'active-char-display' });
  const curChar = S.prompt[S.pos] === ' ' ? '␣' : S.prompt[S.pos] || '';
  activeCharBox.innerHTML = `<span>${curChar}</span>`;
  card.appendChild(activeCharBox);

  if (S.zen && S.startTs) {
    textEl.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-2)"><div style="font-size:18px;opacity:0.7">zen mode · stats hidden</div><div style="margin-top:16px;font-size:48px;font-family:var(--font-mono)">◐ ◑ ◒ ◓</div></div>';
  } else {
    textEl.innerHTML = buildTypingHTML();
  }
  card.appendChild(textEl);

  // Dynamic Hand cue guidance
  const fingerCueEl = h('div', { className: 'finger-cue', id: 'live-finger-cue' });
  fingerCueEl.innerHTML = `<span>${getFingerInstruction()}</span>`;
  card.appendChild(fingerCueEl);

  const foot = h('div', { className: 'typing-foot' });
  foot.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px">
      <span>Press any key to begin</span>
      <span style="color:var(--text-3)">·</span>
      <span><kbd>Tab</kbd> to restart</span>
      <span style="color:var(--text-3)">·</span>
      <span><kbd>Esc</kbd> to reset</span>
    </div>
    <div style="color:var(--text-3)" id="chars-typed-foot">${S.pos}/${S.prompt.length} chars</div>`;
  card.appendChild(foot);

  // Mouse parallax
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = (0.5 - y) * 6, ry = (x - 0.5) * 8;
    card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    card.style.setProperty('--mx', (x*100).toFixed(1)+'%');
    card.style.setProperty('--my', (y*100).toFixed(1)+'%');
  });
  card.addEventListener('mouseleave', () => { card.style.transform = 'rotateX(0) rotateY(0)'; });

  stage.appendChild(card);
  return stage;
}

function buildTypingHTML() {
  const chars = S.prompt.split('');
  let html = '';
  let curWordIdx = -1;

  let ci = 0;
  for (let i = 0; i < chars.length; i++) {
    if (i === S.pos) { curWordIdx = ci; break; }
    if (chars[i] === ' ' || chars[i] === '\n') ci++;
  }
  if (curWordIdx === -1) curWordIdx = ci;

  ci = 0;
  let curWord = [];
  const words = [];
  for (let i = 0; i < chars.length; i++) {
    curWord.push(i);
    if (chars[i] === ' ' || chars[i] === '\n' || i === chars.length - 1) {
      words.push({indices: curWord, idx: ci});
      curWord = []; ci++;
    }
  }

  for (const word of words) {
    if (!S.settings.nextPreview && word.idx > curWordIdx + 1) {
      continue;
    }
    const isNextWord = word.idx > curWordIdx + 2;
    html += `<span class="word${isNextWord ? ' next' : ''}">`;
    for (const i of word.indices) {
      let cls = '';
      if (i < S.pos) cls = S.errorIdx.has(i) ? 'wrong' : 'done';
      else if (i === S.pos) cls = 'cur';
      
      let ch = chars[i];
      if (ch === '\n') ch = '\u23CE\n';
      else if (ch === '\t') ch = '\u21E5\t';
      else if (ch === '\b') ch = '\u232B';
      
      html += `<span class="ch ${cls}" data-idx="${i}">${ch}</span>`;
    }
    html += '</span>';
  }
  return html;
}

function updateTypingDisplay() {
  const textEl = document.getElementById('typing-text');
  if (!textEl) return;
  if (S.zen && S.startTs) return;
  textEl.innerHTML = buildTypingHTML();

  // Auto-scroll
  const curEl = textEl.querySelector('.ch.cur');
  if (curEl) {
    const textRect = textEl.getBoundingClientRect();
    const curRect = curEl.getBoundingClientRect();
    if (curRect.top > textRect.top + textRect.height * 0.6) {
      textEl.scrollTop += curRect.top - textRect.top - textRect.height * 0.3;
    }
  }

  // Update char count
  const foot = document.getElementById('chars-typed-foot');
  if (foot) foot.textContent = S.pos + '/' + S.prompt.length + ' chars';

  // Update live finger cues
  const fingerCue = document.getElementById('live-finger-cue');
  if (fingerCue) fingerCue.innerHTML = `<span>${getFingerInstruction()}</span>`;

  // Update big active char
  const activeBox = document.getElementById('active-char-display');
  if (activeBox) {
    let cur = S.prompt[S.pos] || '';
    if (cur === ' ') cur = '␣';
    else if (cur === '\n') cur = '⏎';
    else if (cur === '\t') cur = '⇥';
    
    // Add pop animation class by re-inserting
    activeBox.innerHTML = `<span class="pop">${cur}</span>`;
  }
}

// ─── 3D KEYBOARD HEATMAPS ──────────────────────────────
function renderKeyboardCard() {
  const card = h('div', { className: 'kb-card' });
  const targetKeys = getTargetKeys();
  const heat = getHeatMap();

  card.innerHTML = `
    <div class="kb-head">
      <h4>${S.kbView === 'errors' ? 'Error heatmap' : 'Frequency heatmap'} ·
        <span style="color:var(--text-3);margin-left:6px">${targetKeys.size > 0 ? targetKeys.size + ' target keys glowing' : 'live coordinate tracking'}</span>
      </h4>
      <div class="kb-toggle">
        <button class="${S.kbView==='frequency'?'on':''}" id="kb-freq">Frequency</button>
        <button class="${S.kbView==='errors'?'on':''}" id="kb-err">Errors</button>
      </div>
    </div>`;

  const stage = h('div', { className: 'kb-stage' });
  const kb = h('div', { className: 'kb', id: 'keyboard' });

  window.KB_ROWS.forEach(row => {
    const rowEl = h('div', { className: 'kb-row' });
    row.forEach(def => {
      const keyEl = renderKey(def, targetKeys, heat);
      rowEl.appendChild(keyEl);
    });
    kb.appendChild(rowEl);
  });

  stage.appendChild(kb);
  card.appendChild(stage);

  // Legend
  card.innerHTML += `
    <div class="kb-legend">
      <span>Heat scale:</span>
      <div class="scale"><div class="s" style="background:rgba(255,255,255,0.04)"></div><span>none</span></div>
      <div class="scale"><div class="s" style="background:hsl(50 90% 62%)"></div><span>low</span></div>
      <div class="scale"><div class="s" style="background:hsl(32 95% 58%)"></div><span>med</span></div>
      <div class="scale"><div class="s" style="background:hsl(12 92% 54%)"></div><span>high</span></div>
      <div class="scale"><div class="s" style="background:hsl(320 92% 56%)"></div><span>peak</span></div>
      <span style="margin-left:auto;color:var(--text-3)">Best streak: <strong style="color:var(--lime);font-family:var(--font-mono)">${S.bestStreak}</strong></span>
    </div>`;

  setTimeout(() => {
    document.getElementById('kb-freq')?.addEventListener('click', () => { S.kbView = 'frequency'; render(); });
    document.getElementById('kb-err')?.addEventListener('click', () => { S.kbView = 'errors'; render(); });
  }, 0);

  return card;
}

function renderKey(def, targetKeys, heat) {
  let label, sub, char, w;
  if (Array.isArray(def)) {
    [char, sub] = def; label = char; w = '';
  } else {
    label = def.label; sub = ''; char = def.code; w = def.w || '';
  }
  const lower = (Array.isArray(def) ? def[0] : '').toLowerCase();
  const isTarget = targetKeys.has(lower);
  const isDown = S.activeKeys.has(lower) || S.activeKeys.has(char);
  const heatLvl = heat[lower] || 0;
  const heatClass = heatLvl > 0 ? ' h-' + heatLvl : '';

  const keyEl = h('div', {
    className: 'key ' + w + heatClass + (isTarget ? ' is-target' : '') + (isDown ? ' is-down' : ''),
    'data-key': lower || char,
  });
  keyEl.innerHTML = `<span class="legend">${sub ? '<span class="sub">'+sub+'</span>' : ''}${label}</span>`;
  return keyEl;
}

function renderKeyboardActiveState() {
  const kb = document.getElementById('keyboard');
  if (!kb) return;
  kb.querySelectorAll('.key').forEach(keyEl => {
    const k = keyEl.dataset.key;
    if (S.activeKeys.has(k)) keyEl.classList.add('is-down');
    else keyEl.classList.remove('is-down');
  });
}

// ─── CUSTOM KEYS POPULATE PANEL ────────────────────────
function renderCustomKeysPanel() {
  const panel = h('div', { className: 'custom-panel' });
  const rows = [
    { keys: '1234567890'.split(''), pad: 0 },
    { keys: 'qwertyuiop'.split(''), pad: 0 },
    { keys: 'asdfghjkl'.split(''), pad: 10 },
    { keys: 'zxcvbnm'.split(''), pad: 24 },
    { keys: "-=[]\\;',./`".split(''), pad: 0 },
  ];
  const specials = [
    { label: 'Tab', k: '\t', flex: 1.2 },
    { label: 'Space', k: ' ', flex: 2.8 },
    { label: 'Enter', k: '\n', flex: 1.4 },
    { label: '⌫ Bksp', k: '\b', flex: 1.4 },
  ];

  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-size:12px;color:var(--text-2);letter-spacing:0.16em;text-transform:uppercase;font-weight:600">Coordinate set · ${S.customKeys.size} keys</div>
    <button class="btn ghost" id="regen-btn" style="font-size:11px;padding:6px 12px">Regenerate</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px">`;

  rows.forEach(row => {
    html += `<div style="display:flex;gap:4px;padding-left:${row.pad}px">`;
    row.keys.forEach(k => {
      const on = S.customKeys.has(k) ? ' on' : '';
      html += `<div class="ck-mini-key${on}" data-ck="${k}">${k.toUpperCase()}</div>`;
    });
    html += '</div>';
  });
  html += `<div style="display:flex;gap:4px;margin-top:2px">`;
  specials.forEach(s => {
    const on = S.customKeys.has(s.k) ? ' on' : '';
    html += `<div class="ck-special${on}" style="flex:${s.flex}" data-cks="${s.k}">${s.label}</div>`;
  });
  html += '</div></div>';

  html += `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--hairline);display:flex;flex-wrap:wrap;gap:4px">
    <button class="preset-chip" data-preset="letters">All letters</button>
    <button class="preset-chip" data-preset="numbers">All numbers</button>
    <button class="preset-chip" data-preset="symbols">All symbols</button>
    <button class="preset-chip" data-preset="home">Home row</button>
    <button class="preset-chip" data-preset="space">+ Space</button>
    <button class="preset-chip" data-preset="clear">Clear</button>
  </div>`;

  const preview = [...S.customKeys].slice(0,10).map(c => c===' '?'␣':c==='\t'?'⇥':c==='\n'?'⏎':c==='\b'?'⌫':c).join(' ').toUpperCase();
  html += `<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-3);font-family:var(--font-mono)">
    <span>${S.customKeys.size} keys active</span>
    <span style="color:var(--accent)">${preview}${S.customKeys.size > 10 ? '…' : ''}</span>
  </div>`;

  panel.innerHTML = html;

  setTimeout(() => {
    panel.querySelectorAll('.ck-mini-key').forEach(el => {
      el.addEventListener('click', () => {
        const k = el.dataset.ck;
        if (S.customKeys.has(k)) S.customKeys.delete(k); else S.customKeys.add(k);
        render();
      });
    });
    panel.querySelectorAll('.ck-special').forEach(el => {
      el.addEventListener('click', () => {
        const k = el.dataset.cks;
        if (S.customKeys.has(k)) S.customKeys.delete(k); else S.customKeys.add(k);
        render();
      });
    });
    panel.querySelectorAll('.preset-chip').forEach(el => {
      el.addEventListener('click', () => {
        const p = el.dataset.preset;
        if (p === 'letters') 'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => S.customKeys.add(c));
        else if (p === 'numbers') '1234567890'.split('').forEach(c => S.customKeys.add(c));
        else if (p === 'symbols') "-=[]\\;',./`".split('').forEach(c => S.customKeys.add(c));
        else if (p === 'home') { S.customKeys.clear(); 'asdfghjkl'.split('').forEach(c => S.customKeys.add(c)); }
        else if (p === 'space') S.customKeys.add(' ');
        else if (p === 'clear') S.customKeys.clear();
        render();
      });
    });
    document.getElementById('regen-btn')?.addEventListener('click', () => {
      if (S.customKeys.size >= 2) {
        restart();
      }
    });
  }, 0);

  return panel;
}

// ─── RESULTS COMPLETED OVERLAY ────────────────────────
function renderResultsOverlay() {
  const r = S.result;
  const delta = r.prevWpm != null ? r.wpm - r.prevWpm : null;

  const overlay = h('div', { className: 'results-overlay', onClick: () => { S.result = null; render(); } });
  const card = h('div', { className: 'results-card', onClick: e => e.stopPropagation() });

  let deltaHtml = '';
  if (delta != null) {
    const cls = delta >= 0 ? 'up' : 'down';
    const color = delta >= 0 ? '#4ade80' : '#fb7185';
    const bg = delta >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)';
    const border = delta >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)';
    deltaHtml = `<div style="margin-top:14px;display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:13px;color:${color};padding:4px 10px;border-radius:999px;background:${bg};border:1px solid ${border}">${delta>=0?'↑':'↓'} ${Math.abs(delta)} vs last session</div>`;
  }

  let struggleHtml = '';
  if (r.struggle.length === 0) {
    struggleHtml = '<div style="color:var(--text-3);font-size:13px;padding:12px 0">No struggle keys — clean touch run.</div>';
  } else {
    struggleHtml = r.struggle.slice(0,4).map(s =>
      `<div class="struggle-row"><div class="k">${s.k===' '?'␣':s.k.toUpperCase()}</div><div class="bar"><span style="width:${Math.min(100,s.n*18)}%"></span></div><div class="n">${s.n} miss${s.n>1?'es':''}</div></div>`
    ).join('');
  }

  // Pre-Chapter unlocking notification
  let notificationHtml = '';
  if (r.refresherTriggered) {
    notificationHtml = `
      <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.3);text-align:left">
        <h4 style="margin:0;color:#fb7185;font-size:14px">⚠️ Adaptive Training Recommended</h4>
        <p style="margin:6px 0 10px;font-size:12px;color:var(--text-2);line-height:1.55">Accuracy was below 85%. Before unlocking the next chapter, we recommend completing a quick Adaptive Refresher Drill targeting your misses keys.</p>
        <button class="btn primary" id="results-refresher-btn" style="background:#fb7185;box-shadow:none;font-size:11px;padding:6px 12px">Start Refresher Drill</button>
      </div>`;
  } else if (r.lockedNext) {
    notificationHtml = `
      <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);text-align:left">
        <h4 style="margin:0;color:#4ade80;font-size:14px">🏆 Next Chapter Unlocked!</h4>
        <p style="margin:4px 0 0;font-size:12px;color:var(--text-2)">Congratulations! You successfully unlocked the next TOUCH-TYPING training coordinate chapter.</p>
      </div>`;
  }

  card.innerHTML = `
    <div class="results-head">
      <h2>${r.isBest ? '🏆 New Personal Best!' : 'Session Complete'}</h2>
      <button class="close" id="results-close">${svgIcon('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>')}</button>
    </div>
    <div class="results-body">
      <div class="results-hero">
        <div class="big-wpm" id="result-wpm">0</div>
        <div class="lbl">words per minute</div>
        ${deltaHtml}
        <div class="results-grid">
          <div class="mini"><div class="l">Raw WPM</div><div class="v">${r.raw}</div></div>
          <div class="mini"><div class="l">Time</div><div class="v">${r.time}<span style="font-size:12px;color:var(--text-3)"> s</span></div></div>
          <div class="mini"><div class="l">Correct</div><div class="v" style="color:#4ade80">${r.correct}</div></div>
          <div class="mini"><div class="l">Errors</div><div class="v" style="color:#fb7185">${r.errors}</div></div>
        </div>
      </div>
      <div>
        <div class="donut-wrap"><svg id="donut-svg" width="200" height="200" style="transform:rotate(-90deg)">
          <defs>
            <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>
          </defs>
          <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="14"/>
          <circle id="donut-arc" cx="100" cy="100" r="84" fill="none" stroke="url(#donutGrad)" stroke-width="14" stroke-linecap="round" stroke-dasharray="0 528" style="filter:drop-shadow(0 0 8px rgba(139,92,246,0.5))"/>
        </svg>
        <div style="position:absolute;display:grid;place-items:center;inset:0">
          <div style="text-align:center">
            <div id="donut-pct" style="font-family:var(--font-mono);font-size:42px;font-weight:700;line-height:1;background:linear-gradient(180deg,#fff,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent">0%</div>
            <div style="font-size:11px;color:var(--text-3);letter-spacing:0.18em;text-transform:uppercase;margin-top:6px">Accuracy</div>
          </div>
        </div>
        </div>
        <div style="font-size:11px;color:var(--text-3);letter-spacing:0.18em;text-transform:uppercase;font-weight:600;margin:6px 0">Keys you struggled with</div>
        <div class="struggle-list">${struggleHtml}</div>
        ${notificationHtml}
      </div>
    </div>
    <div class="results-actions">
      <button class="btn ghost" id="share-btn">${svgIcon('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>', 14)} Share result</button>
      <button class="btn" id="newmode-btn">New mode</button>
      <button class="btn primary" id="retry-btn">Try again</button>
    </div>`;

  const donutWrap = card.querySelector('.donut-wrap');
  if (donutWrap) donutWrap.style.position = 'relative';

  overlay.appendChild(card);

  setTimeout(() => {
    document.getElementById('results-close')?.addEventListener('click', () => { S.result = null; render(); });
    document.getElementById('share-btn')?.addEventListener('click', shareResult);
    document.getElementById('newmode-btn')?.addEventListener('click', () => { S.result = null; goHome(); });
    document.getElementById('retry-btn')?.addEventListener('click', () => { S.result = null; restart(); });
    document.getElementById('results-refresher-btn')?.addEventListener('click', () => { S.result = null; startRefresherDrill(); });
  }, 0);

  return overlay;
}

function animateResultWpm(target) {
  const el = document.getElementById('result-wpm');
  if (!el) return;
  const t0 = performance.now();
  const dur = 1100;
  function tick(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = Math.round(target * e);
    if (k < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateDonut(pct) {
  const arc = document.getElementById('donut-arc');
  const label = document.getElementById('donut-pct');
  if (!arc || !label) return;
  const r = 84, c = 2 * Math.PI * r;
  const t0 = performance.now();
  const dur = 900;
  function tick(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    const animPct = pct * e;
    arc.setAttribute('stroke-dasharray', ((animPct / 100) * c).toFixed(1) + ' ' + c.toFixed(1));
    label.textContent = Math.round(animPct) + '%';
    if (k < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function fireConfetti() {
  const cvs = document.getElementById('confetti-canvas');
  if (!cvs) return;
  cvs.classList.remove('hidden');
  const ctx = cvs.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cvs.width = window.innerWidth * dpr;
  cvs.height = window.innerHeight * dpr;
  cvs.style.width = window.innerWidth + 'px';
  cvs.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  const colors = ['#8b5cf6','#22d3ee','#ec4899','#a3e635','#f59e0b','#22c55e'];
  const W = window.innerWidth, H = window.innerHeight;
  const parts = [];
  for (let i = 0; i < 180; i++) {
    parts.push({
      x: W/2 + (Math.random()-0.5)*120, y: H/2 + (Math.random()-0.5)*60,
      vx: (Math.random()-0.5)*12, vy: Math.random()*-14 - 4,
      g: 0.35 + Math.random()*0.15, r: 4 + Math.random()*4,
      c: colors[Math.floor(Math.random()*colors.length)],
      a: Math.random()*Math.PI*2, va: (Math.random()-0.5)*0.3, life: 1,
    });
  }
  function step() {
    ctx.clearRect(0,0,W,H);
    let alive = false;
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g;
      p.a += p.va; p.life -= 0.005;
      if (p.life > 0 && p.y < H+40) alive = true;
      if (p.life <= 0) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*1.6);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(step);
    else cvs.classList.add('hidden');
  }
  requestAnimationFrame(step);
}

// ─── SETTINGS DRAWER ───────────────────────────────────
function renderSettingsDrawer() {
  const frag = document.createDocumentFragment();

  const scrim = h('div', { className: 'drawer-scrim', onClick: () => { S.drawerOpen = false; render(); } });
  const drawer = h('div', { className: 'drawer' });

  drawer.innerHTML = `
    <div class="drawer-head"><h3>Settings</h3><button class="icon-btn" id="close-drawer">${svgIcon('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>')}</button></div>
    <div class="drawer-body">
      <div class="setting-row"><div class="lbl"><span class="name">Theme</span><span class="v">${S.settings.theme}</span></div>
        <div class="seg">${['light','dark','auto'].map(v => `<button class="${S.settings.theme===v?'on':''}" data-set="theme:${v}">${v}</button>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Accent color</span></div>
        <div class="swatch-row">${window.ACCENTS.map(a => `<div class="swatch${S.settings.accent===a.id?' on':''}" style="background:${a.c}" data-set="accent:${a.id}"></div>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Font</span><span class="v">${S.settings.font}</span></div>
        <div class="seg">${['JetBrains Mono','Fira Code','Courier'].map(v => `<button class="${S.settings.font===v?'on':''}" data-set="font:${v}" style="font-size:11px">${v.split(' ')[0]}</button>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Font size</span><span class="v">${S.settings.fontSize}px</span></div>
        <input class="range" type="range" min="20" max="40" step="1" value="${S.settings.fontSize}" data-range="fontSize"/>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Cursor style</span><span class="v">${S.settings.cursor}</span></div>
        <div class="seg">${['line','block','underline'].map(v => `<button class="${S.settings.cursor===v?'on':''}" data-set="cursor:${v}">${v}</button>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Sound</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div class="switch${S.settings.sound?' on':''}" data-toggle="sound"></div>
          <input class="range" type="range" min="0" max="100" step="1" value="${S.settings.volume*100}" data-range="volume" style="flex:1;margin-left:12px;opacity:${S.settings.sound?1:0.4}" ${S.settings.sound?'':'disabled'}/>
        </div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Sound pack</span><span class="v">${S.settings.soundPack}</span></div>
        <div class="seg">${['mechanical','soft','typewriter'].map(v => `<button class="${S.settings.soundPack===v?'on':''}" data-set="soundPack:${v}" style="font-size:11px">${v}</button>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Prompt length</span><span class="v">${S.settings.promptLength} words</span></div>
        <div class="seg">${[10,20,40,60,80].map(v => `<button class="${S.settings.promptLength===v?'on':''}" data-set="promptLength:${v}">${v}</button>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Timer mode</span><span class="v">${S.settings.timer}</span></div>
        <div class="seg">${['off','count-up','30s','60s','120s'].map(v => `<button class="${S.settings.timer===v?'on':''}" data-set="timer:${v}" style="font-size:11px">${v}</button>`).join('')}</div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Highlight mode keys on keyboard</span></div>
        <div class="switch${S.settings.hlKeys?' on':''}" data-toggle="hlKeys"></div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Show next words preview</span></div>
        <div class="switch${S.settings.nextPreview?' on':''}" data-toggle="nextPreview"></div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Auto-advance to next prompt</span></div>
        <div class="switch${S.settings.autoAdvance?' on':''}" data-toggle="autoAdvance"></div>
      </div>
      <div class="setting-row"><div class="lbl"><span class="name">Session history</span><span class="v">${S.history.length} of 20</span></div>
        <div id="drawer-trend"></div>
      </div>
      <div class="setting-row">
        <button class="btn" id="reset-progress-btn" style="background:rgba(244,63,94,0.12);border-color:rgba(244,63,94,0.35);color:#fb7185;width:100%;justify-content:center">Reset progress</button>
      </div>
    </div>`;

  frag.appendChild(scrim);
  frag.appendChild(drawer);

  setTimeout(() => {
    document.getElementById('close-drawer')?.addEventListener('click', () => { S.drawerOpen = false; render(); });

    drawer.querySelectorAll('[data-set]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [key, val] = btn.dataset.set.split(':');
        const numericKeys = new Set(['promptLength']);
        updateSetting(key, numericKeys.has(key) ? parseInt(val) : val);
      });
    });

    drawer.querySelectorAll('[data-toggle]').forEach(sw => {
      sw.addEventListener('click', () => {
        updateSetting(sw.dataset.toggle, !S.settings[sw.dataset.toggle]);
      });
    });

    drawer.querySelectorAll('[data-range]').forEach(range => {
      range.addEventListener('input', () => {
        const k = range.dataset.range;
        updateSetting(k, k === 'volume' ? +range.value / 100 : +range.value);
      });
    });

    document.getElementById('reset-progress-btn')?.addEventListener('click', resetProgress);

    const trendContainer = document.getElementById('drawer-trend');
    if (trendContainer) {
      const data = S.history.slice(-20).map(h => h.wpm);
      trendContainer.appendChild(renderTrendSVG(data));
    }
  }, 0);

  return frag;
}

// ─── SHORTCUTS HELP MODAL ─────────────────────────────
function toggleShortcutsHelp() {
  S.shortcutsHelpOpen = !S.shortcutsHelpOpen;
  render();
}

function renderShortcutsModal() {
  const overlay = h('div', { className: 'results-overlay', onClick: toggleShortcutsHelp });
  const card = h('div', { className: 'results-card', style: { maxWidth: '480px', padding: '28px', transformStyle: 'preserve-3d' }, onClick: e => e.stopPropagation() });

  card.innerHTML = `
    <div class="results-head" style="margin-bottom:18px">
      <h2>⌨️ Keyboard Shortcuts</h2>
      <button class="close" id="shortcuts-close">${svgIcon('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>')}</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;font-size:14px;color:var(--text-1)">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed var(--hairline)">
        <span>Restart Typing Prompt</span>
        <kbd style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-strong);border-bottom-width:2px;padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#fff">Tab</kbd>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed var(--hairline)">
        <span>Reset Typing Session & Heatmap</span>
        <kbd style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-strong);border-bottom-width:2px;padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#fff">Esc</kbd>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed var(--hairline)">
        <span>Toggle Zen Mode</span>
        <kbd style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-strong);border-bottom-width:2px;padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#fff">Ctrl + Z</kbd>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed var(--hairline)">
        <span>Open Settings Drawer</span>
        <kbd style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-strong);border-bottom-width:2px;padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#fff">Ctrl + Shift + S</kbd>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed var(--hairline)">
        <span>Toggle Shortcuts Dialog</span>
        <kbd style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-strong);border-bottom-width:2px;padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#fff">?</kbd>
      </div>
    </div>
    <div style="margin-top:24px;display:flex;justify-content:flex-end">
      <button class="btn primary" id="shortcuts-ok-btn" style="padding:8px 22px">Got it</button>
    </div>`;

  setTimeout(() => {
    document.getElementById('shortcuts-close')?.addEventListener('click', toggleShortcutsHelp);
    document.getElementById('shortcuts-ok-btn')?.addEventListener('click', toggleShortcutsHelp);
  }, 0);

  overlay.appendChild(card);
  return overlay;
}

// ─── INITIALIZATION ────────────────────────────────────
// Expose pure functions for unit testing without a DOM harness.
window.computeMetrics = computeMetrics;
window.escapeHTML = escapeHTML;

restart();

// Outside click closing
document.addEventListener('click', e => {
  if (S.modePopoverOpen && !e.target.closest('.practice-mode-pick')) {
    S.modePopoverOpen = false;
    render();
  }
});
