// Shared types for the Typing Master app.

export type View = 'home' | 'practice';
export type Tab = 'lessons' | 'challenges' | 'custom' | 'adaptive' | 'multiplayer' | 'teams';
export type KbView = 'frequency' | 'errors';
export type Theme = 'light' | 'dark' | 'auto';
export type Accent = 'violet' | 'cyan' | 'lime' | 'amber';
export type Cursor = 'line' | 'block' | 'underline';
export type FontFamily = 'JetBrains Mono' | 'Fira Code' | 'Courier';
export type SoundPack = 'mechanical' | 'soft' | 'typewriter';
export type TimerMode = 'off' | 'count-up' | '30s' | '60s' | '120s';

export interface Settings {
  theme: Theme;
  accent: Accent;
  font: FontFamily;
  fontSize: number;
  cursor: Cursor;
  sound: boolean;
  volume: number;
  soundPack: SoundPack;
  promptLength: number;
  timer: TimerMode;
  hlKeys: boolean;
  nextPreview: boolean;
  autoAdvance: boolean;
  /** UI language. Defaults to browser preference, falls back to 'en'. */
  locale?: import('./i18n').LocaleCode;
  /** Physical keyboard layout rendered on the 3D heatmap. */
  kbLayout?: import('./layouts').KbLayoutId;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  /** One-line summary, shown on the chapter card on Home. */
  instructions: string;
  /** Multi-paragraph guide shown in the TutorialCard before practice starts. */
  guide?: string[];
  /** Optional "pro tip" pull-quote at the bottom of the guide. */
  tip?: string;
  keys: string;
  pool: string[];
  /**
   * How `pool` is turned into a typing prompt:
   *  - falsy (default): `pool` is a CHARACTER SOURCE — its letters are flattened
   *    into a set and random "words" are generated (the classic drill behavior,
   *    right for mechanical chapters like `ffff jjjj`).
   *  - true: `pool` entries are real words/sentences and are used VERBATIM —
   *    entries are picked (and joined for multi-word pools) to reach roughly the
   *    requested length. Right for fluency chapters and pangrams so the learner
   *    types real text instead of random-letter soup.
   */
  literal?: boolean;
}

export interface Challenge {
  id: string;
  label: string;
  desc: string;
  src: string;
  sentences?: boolean;
}

/** A Mode is anything the user can practice — a Lesson, a Challenge, the
 * synthetic "custom-set" mode driven by the QWERTY picker, or the
 * keybr-style adaptive mode. */
export interface CustomSetMode {
  id: 'custom-set';
  label: string;
  keys: string;
  src: 'custom';
}

export interface AdaptiveMode {
  id: 'adaptive';
  label: string;
  src: 'adaptive';
}

export type Mode = Lesson | Challenge | CustomSetMode | AdaptiveMode;

export interface Session {
  date: number;
  modeId: string;
  modeLabel: string;
  wpm: number;
  acc: number;
  time: number;
}

export interface StruggleKey {
  k: string;
  n: number;
}

export interface SessionResult {
  wpm: number;
  raw: number;
  acc: number;
  errors: number;
  correct: number;
  time: number;
  struggle: StruggleKey[];
  isBest: boolean;
  prevWpm: number | null;
  lockedNext: boolean;
  refresherTriggered: boolean;
}

export interface Metrics {
  wpm: number;
  rawWpm: number;
  acc: number;
  progress: number;
  currentlyCorrect: number;
}

export interface MetricsInput {
  pos: number;
  errorIdxSize: number;
  errorCount: number;
  elapsedSec: number;
  promptLength: number;
}

export type KeyDef = [string, string] | { label: string; w: string; code: string };

export interface AccentSwatch {
  id: Accent;
  c: string;
}

export interface PersistedStore {
  settings?: Partial<Settings>;
  history?: Session[];
  unlockedLessons?: string[];
  completedLessons?: string[];
  // Phase-5 adaptive engine. Stored as a plain JSON object (the inner
  // type is defined in lib/keybr.ts to avoid a circular import here).
  keybr?: {
    unlockedCount: number;
    targetWpm: number;
    totalRounds: number;
    stats: Record<string, { letter: string; hits: number; misses: number; recentTimes: number[] }>;
  };
}

// Type-guard helpers.
export function isLesson(m: Mode): m is Lesson {
  return 'instructions' in m && 'pool' in m;
}
export function isChallenge(m: Mode): m is Challenge {
  return 'desc' in m && 'label' in m && !('instructions' in m);
}
export function isCustomSet(m: Mode): m is CustomSetMode {
  return m.id === 'custom-set';
}
export function isAdaptive(m: Mode): m is AdaptiveMode {
  return m.id === 'adaptive';
}
export function modeTitle(m: Mode): string {
  if (isLesson(m)) return m.title;
  if (isChallenge(m)) return m.label;
  return m.label;
}
