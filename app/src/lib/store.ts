// Reactive store using Preact signals.
//
// Designed to mirror the original `S` object shape so the port is 1:1.
// Each piece of state is its own signal — components only re-render when
// the signals they actually read change. This is the speed win Phase 2 buys.

import { signal, computed, batch, effect } from '@preact/signals';
import type {
  Settings,
  View,
  Tab,
  KbView,
  Mode,
  Session,
  SessionResult,
  PersistedStore,
} from './types';
import { LESSONS, buildPrompt, generateFromCustomKeys, buildLiteralPrompt } from './data';
import { SynthAudio } from './audio';
import { computeMetrics } from './metrics';
import { pushSession, pushProgress, pullAll, mergeSessions, unionStrings } from './sync';
import {
  initialKeybrState, generateRound, shouldUnlockNext,
  KEYBR_LETTER_ORDER,
  type KeybrState,
} from './keybr';
import { track, trackWithContext } from './analytics';
import { setLocale } from './i18n';
import { setStatusBar } from './native';

const STORAGE_KEY = 'typing_master_v2';

function loadStore(): PersistedStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as PersistedStore;
  } catch {
    return {};
  }
}

function persist(patch: Partial<PersistedStore>): void {
  const cur = loadStore();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }));
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: 'violet',
  font: 'JetBrains Mono',
  fontSize: 30,
  cursor: 'line',
  sound: true,
  volume: 0.4,
  soundPack: 'mechanical',
  promptLength: 20,
  timer: 'count-up',
  hlKeys: true,
  nextPreview: true,
  autoAdvance: false,
  // locale + kbLayout default to undefined → i18n auto-detects browser lang
  // and layout falls back to QWERTY in KeyboardCard.
};

const persisted = loadStore();

// ─── UI / view signals ────────────────────────────────
export const view = signal<View>('home');
export const activeTab = signal<Tab>('lessons');
export const drawerOpen = signal(false);
export const modePopoverOpen = signal(false);
export const shortcutsHelpOpen = signal(false);
export const zen = signal(false);

// ─── Settings ─────────────────────────────────────────
export const settings = signal<Settings>({ ...DEFAULT_SETTINGS, ...(persisted.settings || {}) });

// ─── Practice state ───────────────────────────────────
export const mode = signal<Mode>(LESSONS[0]);
export const prompt = signal<string>('');
export const pos = signal(0);
export const errorIdx = signal<Set<number>>(new Set());
export const errorCount = signal(0);
export const startTs = signal<number | null>(null);
export const elapsed = signal(0);
export const streak = signal(0);
export const bestStreak = signal(0);
export const activeKeys = signal<Set<string>>(new Set());
export const keyFreq = signal<Record<string, number>>({});
export const keyErrs = signal<Record<string, number>>({});
export const kbView = signal<KbView>('frequency');
export const result = signal<SessionResult | null>(null);
export const tutorialActive = signal(false);

// ─── Curriculum ───────────────────────────────────────
export const history = signal<Session[]>(persisted.history || []);
export const unlockedLessons = signal<string[]>(persisted.unlockedLessons || ['lesson-1']);
export const completedLessons = signal<string[]>(persisted.completedLessons || []);

// Per-lesson "skip the intro guide" preference. Persisted via a separate
// localStorage key so it doesn't bloat the main store payload.
const SKIPPED_GUIDE_KEY = 'typing_master_skipped_guides';
function loadSkippedGuides(): Set<string> {
  try {
    const raw = localStorage.getItem(SKIPPED_GUIDE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}
export const skippedGuides = signal<Set<string>>(loadSkippedGuides());

export function dismissGuideForever(lessonId: string): void {
  const next = new Set(skippedGuides.value);
  next.add(lessonId);
  skippedGuides.value = next;
  localStorage.setItem(SKIPPED_GUIDE_KEY, JSON.stringify([...next]));
}

// ─── Custom keys + refresher drill ────────────────────
export const customKeys = signal<Set<string>>(new Set(['a','s','d','f','j','k','l']));
export const refresherActive = signal(false);
export const refresherKeys = signal<Set<string>>(new Set());

// ─── Adaptive (keybr) state ──────────────────────────
function loadKeybrState(): KeybrState {
  const p = (loadStore().keybr) as KeybrState | undefined;
  if (!p) return initialKeybrState();
  return {
    unlockedCount: p.unlockedCount ?? 3,
    stats: p.stats ?? {},
    targetWpm: p.targetWpm ?? 25,
    totalRounds: p.totalRounds ?? 0,
  };
}
export const keybrState = signal<KeybrState>(loadKeybrState());

export function setKeybrState(next: KeybrState): void {
  keybrState.value = next;
  persist({ keybr: next });
}

/** The synthetic Mode value used while running adaptive practice. */
export const ADAPTIVE_MODE: Mode = { id: 'adaptive', label: 'Adaptive (keybr)', src: 'adaptive' };

// ─── Derived (computed) ───────────────────────────────
export const stats = computed(() => computeMetrics({
  pos: pos.value,
  errorIdxSize: errorIdx.value.size,
  errorCount: errorCount.value,
  elapsedSec: elapsed.value,
  promptLength: prompt.value.length,
}));

export const targetKeys = computed<Set<string>>(() => {
  const m = mode.value;
  if (m.id === 'custom-set') return customKeys.value;
  if (!settings.value.hlKeys || !m) return new Set();
  const keys = ('keys' in m && m.keys) || '';
  return new Set(keys.toLowerCase().split(''));
});

export const heatMap = computed<Record<string, number>>(() => {
  const src = kbView.value === 'errors' ? keyErrs.value : keyFreq.value;
  const vals = Object.values(src);
  if (!vals.length) return {};
  const max = Math.max(...vals);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
  }
  return out;
});

// ─── Timer plumbing ───────────────────────────────────
let timerInterval: ReturnType<typeof setInterval> | null = null;

function clearTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ─── Actions ──────────────────────────────────────────

export function applySettingsToAudio(): void {
  SynthAudio.setVolume(settings.value.volume);
  SynthAudio.setEnabled(settings.value.sound);
  SynthAudio.setPack(settings.value.soundPack);
}

export function updateSetting<K extends keyof Settings>(k: K, v: Settings[K]): void {
  settings.value = { ...settings.value, [k]: v };
  persist({ settings: settings.value });
  applySettingsToAudio();
  if (k === 'promptLength' && pos.value === 0) restart();
  // Locale changes flow through the i18n module's own setLocale so the
  // <html lang> attribute and reactive t() calls update.
  if (k === 'locale' && typeof v === 'string') {
    void setLocale(v as never);
  }
}

export function resetTyping(): void {
  batch(() => {
    pos.value = 0;
    errorIdx.value = new Set();
    errorCount.value = 0;
    streak.value = 0;
    startTs.value = null;
    elapsed.value = 0;
    result.value = null;
  });
  clearTimer();
}

export function restart(): void {
  resetTyping();
  let next = '';
  const m = mode.value;
  if (m.id === 'adaptive') {
    next = generateRound(keybrState.value, { words: 12 });
  } else if (refresherActive.value) {
    next = generateFromCustomKeys(refresherKeys.value, settings.value.promptLength);
  } else if (m.id === 'custom-set') {
    next = generateFromCustomKeys(customKeys.value, settings.value.promptLength);
  } else if ('instructions' in m) {
    next = m.literal
      ? buildLiteralPrompt(m.pool, settings.value.promptLength)
      : generateFromCustomKeys(new Set(m.pool.join('').split('')), settings.value.promptLength);
  } else {
    next = buildPrompt(m, settings.value.promptLength);
  }
  batch(() => {
    prompt.value = next;
    keyFreq.value = {};
    keyErrs.value = {};
  });
}

export function pickMode(m: Mode): void {
  resetTyping();
  // Lessons get a tutorial guide BEFORE typing starts, unless the user has
  // dismissed it forever for this lesson.
  const isLesson = 'instructions' in m;
  const shouldShowGuide = isLesson && !skippedGuides.value.has(m.id);
  batch(() => {
    mode.value = m;
    keyFreq.value = {};
    keyErrs.value = {};
    refresherActive.value = false;
    refresherKeys.value = new Set();
    tutorialActive.value = shouldShowGuide;
  });
  let next = '';
  if (m.id === 'custom-set') {
    next = generateFromCustomKeys(customKeys.value, settings.value.promptLength);
  } else if (m.id === 'adaptive') {
    next = generateRound(keybrState.value, { words: 12 });
  } else if (isLesson) {
    const lesson = m as { pool: string[]; literal?: boolean };
    next = lesson.literal
      ? buildLiteralPrompt(lesson.pool, settings.value.promptLength)
      : generateFromCustomKeys(new Set(lesson.pool.join('').split('')), settings.value.promptLength);
  } else {
    next = buildPrompt(m, settings.value.promptLength);
  }
  prompt.value = next;
}

export function pickAndStart(m: Mode): void {
  pickMode(m);
  view.value = 'practice';
  modePopoverOpen.value = false;
  trackWithContext('lesson_start', {
    modeId: m.id,
    modeLabel: 'title' in m ? (m as { title: string }).title : m.label,
  });
}

export function startRefresherDrill(): void {
  refresherActive.value = true;
  restart();
}

export function goHome(): void {
  view.value = 'home';
  modePopoverOpen.value = false;
}

export function resetProgress(): void {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  batch(() => {
    history.value = [];
    unlockedLessons.value = ['lesson-1'];
    completedLessons.value = [];
  });
  persist({ history: [], unlockedLessons: ['lesson-1'], completedLessons: [] });
}

export function shareResult(toast: (msg: string) => void): void {
  if (!result.value) return;
  const m = mode.value;
  const title = 'title' in m ? m.title : m.label;
  const text = `I scored ${result.value.wpm} WPM at ${result.value.acc}% accuracy on ${title} — Typing Master by S-Corp`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => toast('Result copied to clipboard'))
      .catch(() => toast('Could not copy — your browser blocked clipboard access'));
  } else {
    toast('Clipboard not available in this browser');
  }
}

/** Returns true if the just-finished round caused a new letter to unlock. */
function adaptiveRoundComplete(): boolean {
  const next: KeybrState = { ...keybrState.value, totalRounds: keybrState.value.totalRounds + 1 };
  let unlocked = false;
  if (shouldUnlockNext(next) && next.unlockedCount < KEYBR_LETTER_ORDER.length) {
    next.unlockedCount += 1;
    unlocked = true;
  }
  setKeybrState(next);
  return unlocked;
}

export const adaptiveJustUnlocked = signal<string | null>(null);

export function completeSession(): void {
  if (startTs.value == null) return;

  // Adaptive mode is continuous — no results card, no history row, just
  // bookkeeping + a fresh round.
  if (mode.value.id === 'adaptive') {
    const unlocked = adaptiveRoundComplete();
    if (unlocked) {
      const newLetter = KEYBR_LETTER_ORDER[keybrState.value.unlockedCount - 1];
      adaptiveJustUnlocked.value = newLetter;
      SynthAudio.best();
      track('adaptive_letter_unlocked', { letter: newLetter, unlocked_count: keybrState.value.unlockedCount });
    } else {
      SynthAudio.complete();
    }
    track('adaptive_round_complete', { unlocked_count: keybrState.value.unlockedCount });
    clearTimer();
    restart();
    return;
  }
  const time = Math.max(0.1, (Date.now() - startTs.value) / 1000);
  const m = computeMetrics({
    pos: pos.value,
    errorIdxSize: errorIdx.value.size,
    errorCount: errorCount.value,
    elapsedSec: time,
    promptLength: prompt.value.length,
  });
  const finalWpm = m.wpm;
  const finalRaw = m.rawWpm;
  const acc = m.acc;
  const finalCorrect = m.currentlyCorrect;

  const struggle = Object.entries(keyErrs.value)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ k, n }));

  const sameMode = history.value.filter(h => h.modeId === mode.value.id);
  const prevBest = sameMode.length ? Math.max(...sameMode.map(h => h.wpm)) : 0;
  // PB only counts when there's a prior session in the SAME mode.
  const isBest = sameMode.length > 0 && finalWpm > prevBest;
  const prevWpm = sameMode.length ? sameMode[sameMode.length - 1].wpm : null;

  const cur = mode.value;
  const modeLabel = 'title' in cur ? cur.title : cur.label;

  const session: Session = {
    date: Date.now(),
    modeId: cur.id,
    modeLabel,
    wpm: finalWpm,
    acc,
    time: Math.round(time),
  };
  history.value = [...history.value, session].slice(-20);
  persist({ history: history.value });
  // Fire-and-forget cloud push. Local copy is already saved above, so a
  // network failure here is silently tolerated — we'll re-sync next time.
  void pushSession(session).catch(() => { /* ignore */ });

  if (isBest) SynthAudio.best(); else SynthAudio.complete();
  trackWithContext('lesson_complete', {
    modeId: cur.id,
    modeLabel,
    extra: { wpm: finalWpm, acc, time_sec: Math.round(time), is_best: isBest, errors: errorCount.value },
  });
  if (isBest) trackWithContext('personal_best', { modeId: cur.id, modeLabel, extra: { wpm: finalWpm } });
  clearTimer();

  let lockedNext = false;
  let refresherTriggered = false;

  if ('instructions' in cur && !refresherActive.value) {
    if (acc < 85 && struggle.length > 0) {
      refresherTriggered = true;
      refresherKeys.value = new Set(struggle.map(s => s.k));
      trackWithContext('lesson_refresher_triggered', { modeId: cur.id, modeLabel, extra: { acc } });
    } else {
      let progressChanged = false;
      if (!completedLessons.value.includes(cur.id)) {
        completedLessons.value = [...completedLessons.value, cur.id];
        persist({ completedLessons: completedLessons.value });
        progressChanged = true;
      }
      const idx = LESSONS.findIndex(l => l.id === cur.id);
      if (idx !== -1 && idx < LESSONS.length - 1) {
        const nextId = LESSONS[idx + 1].id;
        if (!unlockedLessons.value.includes(nextId)) {
          unlockedLessons.value = [...unlockedLessons.value, nextId];
          persist({ unlockedLessons: unlockedLessons.value });
          progressChanged = true;
          lockedNext = true;
        }
      }
      if (progressChanged) {
        void pushProgress(unlockedLessons.value, completedLessons.value)
          .catch(() => { /* ignore network errors */ });
      }
    }
  }

  if (settings.value.autoAdvance) {
    restart();
    return;
  }

  result.value = {
    wpm: finalWpm,
    raw: finalRaw,
    acc,
    errors: errorCount.value,
    correct: finalCorrect,
    time: Math.round(time),
    struggle,
    isBest,
    prevWpm,
    lockedNext,
    refresherTriggered,
  };
}

/** Called from the global keydown handler once the user begins typing. */
export function startTimer(): void {
  if (startTs.value != null) return;
  startTs.value = Date.now();
  timerInterval = setInterval(() => {
    const newElapsed = (Date.now() - (startTs.value || Date.now())) / 1000;
    const t = settings.value.timer;
    if (t !== 'off' && t !== 'count-up') {
      const limit = parseInt(t, 10);
      if (newElapsed >= limit) {
        elapsed.value = limit;
        clearTimer();
        completeSession();
        return;
      }
    }
    elapsed.value = newElapsed;
  }, 100);
}

/** Apply theme + accent + font CSS variables to <html>/<body>. */
export function applyVisualSettings(): void {
  const root = document.documentElement;
  const s = settings.value;

  const prefersLight =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: light)').matches
      : false;
  let activeTheme: 'light' | 'dark' = s.theme === 'auto'
    ? (prefersLight ? 'light' : 'dark')
    : s.theme;
  document.body.className = `theme-${activeTheme} accent-${s.accent} cursor-${s.cursor}`;

  // On native (Capacitor), keep the OS status bar in sync with the theme.
  // setStatusBar is a no-op on web, so this costs nothing there.
  void setStatusBar(activeTheme, activeTheme === 'dark' ? '#07071a' : '#f5f5fc');

  let fontValue: string;
  if (s.font === 'JetBrains Mono') fontValue = "'JetBrains Mono', 'Fira Code', monospace";
  else if (s.font === 'Fira Code') fontValue = "'Fira Code', 'JetBrains Mono', monospace";
  else fontValue = "'Courier New', Courier, monospace";

  root.style.setProperty('--font-mono', fontValue);
  root.style.setProperty('--font-size-typing', s.fontSize + 'px');

  const swatches: Record<string, { primary: string; glow: string; gradient: string }> = {
    violet: { primary: '#8b5cf6', glow: '0 0 40px rgba(139, 92, 246, 0.55)', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' },
    cyan:   { primary: '#22d3ee', glow: '0 0 40px rgba(34, 211, 238, 0.55)', gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' },
    lime:   { primary: '#a3e635', glow: '0 0 40px rgba(163, 230, 53, 0.55)', gradient: 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)' },
    amber:  { primary: '#f59e0b', glow: '0 0 40px rgba(245, 158, 11, 0.55)', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)' },
  };
  const c = swatches[s.accent] || swatches.violet;
  root.style.setProperty('--accent', c.primary);
  root.style.setProperty('--accent-glow', c.glow);
  root.style.setProperty('--accent-gradient', c.gradient);
}

// Re-apply theme / accent / font / font-size / cursor whenever ANY settings
// field changes. This is the reactive glue that makes the theme toggle and the
// settings drawer update the page LIVE. Before this, applyVisualSettings() ran
// only on mount, so visual changes were persisted but silently needed a reload
// to show up — which read as "the theme/settings tab doesn't work".
// effect() also runs once immediately, covering the initial paint.
// Guarded by `document` so it stays a no-op during the Node SEO build / SSR.
if (typeof document !== 'undefined') {
  effect(() => {
    // Read settings.value so this effect re-runs on every settings change.
    void settings.value;
    applyVisualSettings();
  });
}

// Wire the auto-theme listener once: when the OS flips light/dark and the user
// is on theme:'auto', repaint. (The effect above doesn't cover this because the
// OS preference isn't part of the settings signal.)
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (settings.value.theme === 'auto') applyVisualSettings();
  });
}

// Sync indicator + hydration ──────────────────────────────────
export const syncing = signal(false);
export const lastSyncError = signal<string | null>(null);

/** Pull remote state, merge with local, persist. Called on sign-in and after
 *  a user explicitly hits "Refresh from cloud" in the settings drawer. */
export async function hydrateFromCloud(): Promise<void> {
  syncing.value = true;
  lastSyncError.value = null;
  try {
    const remote = await pullAll();
    batch(() => {
      history.value = mergeSessions(history.value, remote.sessions);
      unlockedLessons.value = unionStrings(unlockedLessons.value, remote.unlocked);
      completedLessons.value = unionStrings(completedLessons.value, remote.completed);
    });
    persist({
      history: history.value,
      unlockedLessons: unlockedLessons.value,
      completedLessons: completedLessons.value,
    });
  } catch (e) {
    lastSyncError.value = e instanceof Error ? e.message : String(e);
  } finally {
    syncing.value = false;
  }
}
