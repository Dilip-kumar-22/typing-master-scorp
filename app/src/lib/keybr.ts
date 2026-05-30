// Adaptive learning engine, inspired by keybr.com.
//
// Mental model:
//   1. There's an ORDERED list of all 26 letters. The user starts with the
//      first 3 unlocked and progressively unlocks more.
//   2. Each letter has its own running stats (hits / misses / per-keystroke
//      timing) which determine its "speed" in WPM.
//   3. When EVERY currently-unlocked letter is "mastered" (sustained speed
//      >= the target WPM, default 25), the next letter unlocks.
//   4. Each round, a prompt is generated using only the unlocked letters,
//      with extra weight given to the newest-unlocked letter (so it gets
//      practice). Real English words from a small built-in dictionary are
//      used when possible, with a random-letter fallback for tiny letter
//      sets.
//
// This is the pure engine — no DOM, no globals. Tested in test/keybr.test.ts.

import { WORD_LIST } from './keybr_words';

/** English-frequency ordered unlock sequence — this is the order in which
 *  the user gains access to letters. Roughly matches keybr.com's default. */
export const KEYBR_LETTER_ORDER: readonly string[] = [
  'e', 't', 'a', 'o', 'i', 'n', 's', 'r', 'h', 'l',
  'd', 'c', 'u', 'm', 'f', 'p', 'g', 'w', 'y', 'b',
  'v', 'k', 'x', 'j', 'q', 'z',
];

/** Minimum number of letters the user starts with on first play. */
export const KEYBR_STARTING_LETTERS = 3;

/** Default target WPM-per-letter required to unlock the next letter. */
export const KEYBR_DEFAULT_TARGET = 25;

/** Minimum hits per letter before its WPM is trustworthy enough to "master". */
const MIN_HITS_FOR_MASTERY = 10;

/** Rolling window of recent timings kept per letter. Older samples are
 *  dropped so the rolling speed reflects recent improvement, not life-time
 *  averages dragged down by early practice. */
const TIMING_WINDOW = 30;

export interface LetterStat {
  letter: string;
  hits: number;
  misses: number;
  /** ms between previous keystroke and the keystroke for THIS letter.
   *  Capped to the most recent TIMING_WINDOW samples. */
  recentTimes: number[];
}

export type LetterStatus = 'locked' | 'learning' | 'mastered';

export interface KeybrState {
  /** How many letters from KEYBR_LETTER_ORDER are currently unlocked. */
  unlockedCount: number;
  /** Per-letter performance, keyed by lowercase letter. */
  stats: Record<string, LetterStat>;
  /** Target WPM per-letter required for mastery (and to unlock the next letter). */
  targetWpm: number;
  /** How many rounds the user has typed in adaptive mode (lifetime). */
  totalRounds: number;
}

export function initialKeybrState(target = KEYBR_DEFAULT_TARGET): KeybrState {
  return {
    unlockedCount: KEYBR_STARTING_LETTERS,
    stats: {},
    targetWpm: target,
    totalRounds: 0,
  };
}

export function unlockedLetters(state: KeybrState): string[] {
  return KEYBR_LETTER_ORDER.slice(0, state.unlockedCount);
}

export function newestLetter(state: KeybrState): string | null {
  if (state.unlockedCount === 0) return null;
  return KEYBR_LETTER_ORDER[state.unlockedCount - 1];
}

/** Letter-level speed in WPM based on the rolling timing window. */
export function letterWpm(stat: LetterStat | undefined): number {
  if (!stat || stat.recentTimes.length === 0) return 0;
  // Filter out outliers > 2s (probably the user paused / context-switched)
  const samples = stat.recentTimes.filter(t => t > 0 && t < 2000);
  if (samples.length === 0) return 0;
  const avgMs = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (avgMs === 0) return 0;
  // chars per minute → words per minute (5 chars per word)
  const cpm = 60000 / avgMs;
  return Math.round(cpm / 5);
}

export function letterAccuracy(stat: LetterStat | undefined): number {
  if (!stat) return 100;
  const total = stat.hits + stat.misses;
  if (total === 0) return 100;
  return Math.round((stat.hits / total) * 100);
}

export function letterStatusOf(letter: string, state: KeybrState): LetterStatus {
  const idx = KEYBR_LETTER_ORDER.indexOf(letter);
  if (idx === -1 || idx >= state.unlockedCount) return 'locked';
  const stat = state.stats[letter];
  if (!stat || stat.hits < MIN_HITS_FOR_MASTERY) return 'learning';
  const wpm = letterWpm(stat);
  // Mastery also requires reasonable accuracy — a fast but inaccurate letter
  // shouldn't pass.
  const acc = letterAccuracy(stat);
  return (wpm >= state.targetWpm && acc >= 90) ? 'mastered' : 'learning';
}

/** Returns true if all currently-unlocked letters are mastered AND there are
 *  still letters left in the unlock sequence. The caller is expected to bump
 *  state.unlockedCount and reset/celebrate. */
export function shouldUnlockNext(state: KeybrState): boolean {
  if (state.unlockedCount >= KEYBR_LETTER_ORDER.length) return false;
  const unlocked = unlockedLetters(state);
  if (unlocked.length === 0) return false;
  return unlocked.every(l => letterStatusOf(l, state) === 'mastered');
}

/** Append a new timing sample to a letter's rolling window.
 *  Pass NaN for msSincePrev when this is the first keystroke of a round
 *  (no prior keystroke to compute a delta from) — we'll still update the
 *  hits/misses counters but won't pollute the timing window. */
export function recordKeystroke(
  state: KeybrState,
  letter: string,
  correct: boolean,
  msSincePrev: number,
): KeybrState {
  const existing = state.stats[letter] || { letter, hits: 0, misses: 0, recentTimes: [] };
  const skipTiming = !correct || !Number.isFinite(msSincePrev) || msSincePrev <= 0;
  const updated: LetterStat = {
    letter,
    hits: existing.hits + (correct ? 1 : 0),
    misses: existing.misses + (correct ? 0 : 1),
    recentTimes: skipTiming
      ? existing.recentTimes
      : [...existing.recentTimes, msSincePrev].slice(-TIMING_WINDOW),
  };
  return { ...state, stats: { ...state.stats, [letter]: updated } };
}

// ─── Round generation ─────────────────────────────────────────

interface GenOptions {
  /** Approximate number of words per round. Default 12. */
  words?: number;
  /** Force a seeded RNG for tests. */
  rng?: () => number;
}

/** Generate a typing round using only the currently-unlocked letters.
 *  Mixes real short English words (when the unlocked set can spell them)
 *  with pseudo-words made of unlocked letters. Weighted toward including
 *  the newest-unlocked letter so it gets the most practice. */
export function generateRound(state: KeybrState, opts: GenOptions = {}): string {
  const unlocked = new Set(unlockedLetters(state));
  const wantWords = opts.words ?? 12;
  const rng = opts.rng ?? Math.random;
  if (unlocked.size === 0) return '';

  const newest = newestLetter(state);

  // Find dictionary words that are spellable with the unlocked letters.
  const dict = WORD_LIST.filter(w => {
    for (const c of w) if (!unlocked.has(c)) return false;
    return true;
  });
  const dictWithNewest = newest ? dict.filter(w => w.includes(newest)) : dict;

  const out: string[] = [];
  for (let i = 0; i < wantWords; i++) {
    // ~60% of words preferentially include the newest letter (when possible)
    const wantNewest = rng() < 0.6 && dictWithNewest.length > 0;
    const pool = wantNewest ? dictWithNewest : dict;
    if (pool.length > 0) {
      out.push(pool[Math.floor(rng() * pool.length)]);
    } else {
      // Fallback: synthesize a 2-5 letter word from unlocked letters,
      // forcing the newest letter to appear if applicable.
      out.push(synthWord(unlocked, newest, rng));
    }
  }
  return out.join(' ');
}

function synthWord(unlocked: Set<string>, newest: string | null, rng: () => number): string {
  const letters = [...unlocked];
  const len = 2 + Math.floor(rng() * 4); // 2..5
  let word = '';
  for (let i = 0; i < len; i++) word += letters[Math.floor(rng() * letters.length)];
  // Ensure the newest letter shows up at least once.
  if (newest && !word.includes(newest)) {
    const pos = Math.floor(rng() * word.length);
    word = word.slice(0, pos) + newest + word.slice(pos + 1);
  }
  return word;
}
