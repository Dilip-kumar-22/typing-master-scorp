// Achievements + streak engine — PURE functions, no DOM/globals, fully tested.
//
// Turns the persisted data (session history, per-key stats, completed lessons,
// and the set of practice days) into: a current/longest daily streak and a list
// of unlockable badges with progress. The AchievementsPanel is a view over
// what `computeAchievements` returns.

import type { Session, KeyStats } from './types';

export interface Streak {
  current: number;   // consecutive days up to today (or yesterday) with practice
  longest: number;   // best run ever
  daysTotal: number; // distinct days practiced
}

export interface Badge {
  id: string;
  icon: string;
  title: string;      // i18n KEY (resolved in the component)
  desc: string;       // i18n KEY
  unlocked: boolean;
  progress: number;   // 0..1 toward unlocking (1 = done)
  progressLabel: string; // e.g. "3 / 7"
}

export interface AchievementsInput {
  history: Session[];
  keyStats: KeyStats;
  completedLessons: string[];
  practiceDays: string[]; // YYYY-MM-DD
  totalChapters: number;
  today: string;          // YYYY-MM-DD (injected so this stays pure/testable)
}

/** Convert a YYYY-MM-DD string to a day-number (days since epoch), UTC-safe. */
function dayNum(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Compute current + longest streak from a set of practiced days. */
export function computeStreak(practiceDays: string[], today: string): Streak {
  const days = [...new Set(practiceDays)].map(dayNum).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0, daysTotal: 0 };

  // longest run of consecutive days
  let longest = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak: count back from today (or yesterday, so a not-yet-practiced
  // today doesn't break an active streak).
  const todayN = dayNum(today);
  const set = new Set(days);
  let cursor = set.has(todayN) ? todayN : (set.has(todayN - 1) ? todayN - 1 : null);
  let current = 0;
  while (cursor != null && set.has(cursor)) { current++; cursor--; }

  return { current, longest, daysTotal: days.length };
}

interface BadgeDef {
  id: string;
  icon: string;
  value: (i: AchievementsInput, s: Streak) => number; // current progress value
  target: number;
}

// Each badge: an icon, the metric that drives it, and the target to unlock.
// title/desc are i18n keys `ach_<id>_t` / `ach_<id>_d`.
const BADGES: BadgeDef[] = [
  { id: 'first_steps', icon: '👣', target: 1,   value: (i) => i.history.length },
  { id: 'wpm_40',      icon: '⚡', target: 40,  value: (i) => bestWpm(i.history) },
  { id: 'wpm_60',      icon: '🚀', target: 60,  value: (i) => bestWpm(i.history) },
  { id: 'wpm_80',      icon: '🏎️', target: 80,  value: (i) => bestWpm(i.history) },
  { id: 'flawless',    icon: '💎', target: 1,   value: (i) => i.history.some(h => h.acc === 100) ? 1 : 0 },
  { id: 'streak_3',    icon: '🔥', target: 3,   value: (_i, s) => s.longest },
  { id: 'streak_7',    icon: '📅', target: 7,   value: (_i, s) => s.longest },
  { id: 'streak_30',   icon: '🏆', target: 30,  value: (_i, s) => s.longest },
  { id: 'graduate',    icon: '🎓', target: 0,   value: (i) => i.completedLessons.length }, // target set at runtime
  { id: 'marathon',    icon: '⌨️', target: 10000, value: (i) => totalKeys(i.keyStats) },
];

function bestWpm(h: Session[]): number { return h.length ? Math.max(...h.map(s => s.wpm)) : 0; }
function totalKeys(k: KeyStats): number { return Object.values(k).reduce((s, v) => s + v.presses, 0); }

export function computeAchievements(input: AchievementsInput): { streak: Streak; badges: Badge[] } {
  const streak = computeStreak(input.practiceDays, input.today);
  const badges: Badge[] = BADGES.map(def => {
    const target = def.id === 'graduate' ? input.totalChapters : def.target;
    const value = Math.min(def.value(input, streak), target);
    const unlocked = value >= target;
    return {
      id: def.id,
      icon: def.icon,
      title: `ach_${def.id}_t`,
      desc: `ach_${def.id}_d`,
      unlocked,
      progress: target === 0 ? 0 : Math.min(1, value / target),
      progressLabel: `${value} / ${target}`,
    };
  });
  // unlocked first, then by how close to unlocking.
  badges.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress - a.progress);
  return { streak, badges };
}
