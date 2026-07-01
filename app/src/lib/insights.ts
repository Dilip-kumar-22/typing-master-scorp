// Typing-analysis engine — PURE functions, no DOM/globals, fully unit-tested.
//
// Turns the raw persisted data (session history + lifetime per-key stats) into
// human-useful insights: all-time weakest keys, per-finger accuracy, WPM &
// accuracy trends, consistency, personal best, and a plain-English "what to
// work on next" recommendation. The InsightsPanel component is just a view
// over what these functions return.

import type { Session, KeyStats } from './types';
import { FINGER_MAP } from './data';

export interface KeyAccuracy {
  key: string;        // display form ('a', ';', '␣', '⏎')
  raw: string;        // the raw key as stored
  presses: number;
  errors: number;
  accuracy: number;   // 0–100
}

export interface FingerAccuracy {
  finger: string;     // e.g. 'Left Index'
  presses: number;
  errors: number;
  accuracy: number;   // 0–100
}

export interface Insights {
  totalSessions: number;
  totalKeystrokes: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  /** WPM change: last session vs the average of the prior ones. Positive = improving. */
  wpmDelta: number | null;
  /** Std-dev of recent WPM — lower is steadier. null if <2 sessions. */
  consistency: number | null;
  /** Keys ranked worst-accuracy first (min presses filtered out as noise). */
  weakestKeys: KeyAccuracy[];
  /** Per-finger accuracy, worst first. */
  fingers: FingerAccuracy[];
  /** One-line, plain-English recommendation. */
  recommendation: string;
}

const DISPLAY: Record<string, string> = { ' ': '␣', '\n': '⏎', '\t': '⇥', '\b': '⌫' };
function display(k: string): string { return DISPLAY[k] ?? k.toUpperCase(); }

function fingerOf(key: string): string {
  const raw = FINGER_MAP[key] || FINGER_MAP[key.toLowerCase()] || 'Unknown';
  return raw.replace(/\s*\(.*\)$/, ''); // strip "(Tab)" etc.
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}

/** Rank keys by accuracy (worst first). `minPresses` filters out keys with too
 *  little data to be meaningful. */
export function weakestKeys(stats: KeyStats, minPresses = 8, limit = 8): KeyAccuracy[] {
  const rows: KeyAccuracy[] = Object.entries(stats)
    .filter(([, s]) => s.presses >= minPresses)
    .map(([raw, s]) => ({
      key: display(raw),
      raw,
      presses: s.presses,
      errors: s.errors,
      accuracy: s.presses ? Math.round(((s.presses - s.errors) / s.presses) * 100) : 100,
    }))
    // worst accuracy first; break ties by who has more raw errors
    .sort((a, b) => a.accuracy - b.accuracy || b.errors - a.errors);
  return rows.slice(0, limit);
}

/** Aggregate per-key stats up to per-finger accuracy. */
export function fingerAccuracy(stats: KeyStats): FingerAccuracy[] {
  const byFinger = new Map<string, { presses: number; errors: number }>();
  for (const [raw, s] of Object.entries(stats)) {
    const f = fingerOf(raw);
    if (f === 'Unknown') continue;
    const cur = byFinger.get(f) || { presses: 0, errors: 0 };
    cur.presses += s.presses;
    cur.errors += s.errors;
    byFinger.set(f, cur);
  }
  return [...byFinger.entries()]
    .map(([finger, s]) => ({
      finger,
      presses: s.presses,
      errors: s.errors,
      accuracy: s.presses ? Math.round(((s.presses - s.errors) / s.presses) * 100) : 100,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Build the full insights bundle from history + lifetime key stats. */
export function computeInsights(history: Session[], keyStats: KeyStats): Insights {
  const wpms = history.map(h => h.wpm);
  const accs = history.map(h => h.acc);
  const bestWpm = wpms.length ? Math.max(...wpms) : 0;
  const avgWpm = Math.round(mean(wpms));
  const avgAccuracy = Math.round(mean(accs));

  // Improvement: last session vs the mean of the previous ones.
  let wpmDelta: number | null = null;
  if (wpms.length >= 2) {
    const last = wpms[wpms.length - 1];
    const priorAvg = mean(wpms.slice(0, -1));
    wpmDelta = Math.round(last - priorAvg);
  }

  const recent = wpms.slice(-10);
  const consistency = recent.length >= 2 ? Math.round(stdev(recent) * 10) / 10 : null;

  const weak = weakestKeys(keyStats);
  const fingers = fingerAccuracy(keyStats);
  const totalKeystrokes = Object.values(keyStats).reduce((s, k) => s + k.presses, 0);

  return {
    totalSessions: history.length,
    totalKeystrokes,
    bestWpm,
    avgWpm,
    avgAccuracy,
    wpmDelta,
    consistency,
    weakestKeys: weak,
    fingers,
    recommendation: recommend({ history, weak, fingers, avgAccuracy, wpmDelta }),
  };
}

/** Plain-English "what to work on next". Ordered by what most helps a learner. */
function recommend({
  history, weak, fingers, avgAccuracy, wpmDelta,
}: {
  history: Session[];
  weak: KeyAccuracy[];
  fingers: FingerAccuracy[];
  avgAccuracy: number;
  wpmDelta: number | null;
}): string {
  if (history.length === 0) {
    return 'Finish a few lessons and your personalised analysis will appear here.';
  }
  // Accuracy is the foundation — flag it first if it's low.
  if (avgAccuracy < 90) {
    return `Your accuracy is ${avgAccuracy}%. Slow down and aim for 95%+ — speed follows accuracy, not the other way around.`;
  }
  // A genuinely weak key is the most actionable thing to drill.
  if (weak.length && weak[0].accuracy < 90) {
    const keys = weak.slice(0, 3).map(w => w.key).join(', ');
    return `Your weakest keys are ${keys}. Try a Custom drill with just those until they stop slowing you down.`;
  }
  // A weak finger (often a pinky) is the next lever.
  if (fingers.length && fingers[0].accuracy < 93 && fingers[0].presses >= 30) {
    return `Your ${fingers[0].finger.toLowerCase()} is your least accurate finger (${fingers[0].accuracy}%). Give it deliberate, slow reps.`;
  }
  if (wpmDelta != null && wpmDelta < 0) {
    return 'Your last run dipped below your average — that\'s normal. Warm up on the home row before your next sprint.';
  }
  if (avgAccuracy >= 97) {
    return 'Accuracy is excellent. You\'ve earned the right to push speed — try a timed challenge.';
  }
  return 'Solid and steady. Keep a daily rhythm and your speed will keep climbing on its own.';
}
