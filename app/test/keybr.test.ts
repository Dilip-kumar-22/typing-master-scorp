import { describe, it, expect } from 'vitest';
import {
  KEYBR_LETTER_ORDER, KEYBR_STARTING_LETTERS, KEYBR_DEFAULT_TARGET,
  initialKeybrState, unlockedLetters, newestLetter,
  letterWpm, letterAccuracy, letterStatusOf,
  shouldUnlockNext, recordKeystroke, generateRound,
} from '../src/lib/keybr';

function seedRng(seed: number) {
  // Mulberry32 — deterministic RNG for reproducible tests
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe('KEYBR_LETTER_ORDER — unlock sequence', () => {
  it('contains exactly 26 lowercase letters with no duplicates', () => {
    expect(KEYBR_LETTER_ORDER.length).toBe(26);
    const set = new Set(KEYBR_LETTER_ORDER);
    expect(set.size).toBe(26);
    for (const l of KEYBR_LETTER_ORDER) expect(l).toMatch(/^[a-z]$/);
  });

  it('starts with the most common English letters (E and T)', () => {
    expect(KEYBR_LETTER_ORDER[0]).toBe('e');
    expect(KEYBR_LETTER_ORDER[1]).toBe('t');
  });
});

describe('initialKeybrState', () => {
  it('starts with 3 unlocked letters and default target', () => {
    const s = initialKeybrState();
    expect(s.unlockedCount).toBe(KEYBR_STARTING_LETTERS);
    expect(s.targetWpm).toBe(KEYBR_DEFAULT_TARGET);
    expect(s.totalRounds).toBe(0);
    expect(Object.keys(s.stats)).toEqual([]);
  });

  it('honors a custom target WPM', () => {
    expect(initialKeybrState(35).targetWpm).toBe(35);
  });
});

describe('unlockedLetters + newestLetter', () => {
  it('returns the first N letters in order', () => {
    const s = { ...initialKeybrState(), unlockedCount: 5 };
    expect(unlockedLetters(s)).toEqual(['e', 't', 'a', 'o', 'i']);
    expect(newestLetter(s)).toBe('i');
  });
});

describe('letterWpm / letterAccuracy', () => {
  it('100% accuracy + 0 hits → 100', () => {
    expect(letterAccuracy(undefined)).toBe(100);
  });

  it('mixed accuracy', () => {
    const stat = { letter: 'e', hits: 9, misses: 1, recentTimes: [] };
    expect(letterAccuracy(stat)).toBe(90);
  });

  it('letterWpm with no samples → 0', () => {
    expect(letterWpm(undefined)).toBe(0);
    expect(letterWpm({ letter: 'e', hits: 0, misses: 0, recentTimes: [] })).toBe(0);
  });

  it('letterWpm: 200ms/keystroke = 60 WPM (300 cpm / 5)', () => {
    const stat = { letter: 'e', hits: 10, misses: 0, recentTimes: [200, 200, 200, 200, 200] };
    expect(letterWpm(stat)).toBe(60);
  });

  it('letterWpm filters timing outliers (> 2s probably means the user paused)', () => {
    const stat = { letter: 'e', hits: 5, misses: 0, recentTimes: [200, 200, 200, 200, 60000] };
    // Without filtering the 60s outlier dominates. With filtering, avg is 200ms → 60 WPM.
    expect(letterWpm(stat)).toBe(60);
  });
});

describe('letterStatusOf', () => {
  it('locked when not unlocked yet', () => {
    const s = initialKeybrState();
    expect(letterStatusOf('z', s)).toBe('locked');
  });

  it('learning when unlocked but too few hits', () => {
    const s = { ...initialKeybrState(), stats: { e: { letter: 'e', hits: 3, misses: 0, recentTimes: [200] } } };
    expect(letterStatusOf('e', s)).toBe('learning');
  });

  it('mastered when WPM >= target AND accuracy >= 90', () => {
    const s = {
      ...initialKeybrState(),
      targetWpm: 25,
      stats: {
        e: { letter: 'e', hits: 20, misses: 1, recentTimes: Array(15).fill(300) /* 40 WPM */ },
      },
    };
    expect(letterStatusOf('e', s)).toBe('mastered');
  });

  it('NOT mastered when fast but inaccurate', () => {
    const s = {
      ...initialKeybrState(),
      stats: {
        e: { letter: 'e', hits: 20, misses: 15, recentTimes: Array(15).fill(200) /* 60 WPM */ },
      },
    };
    expect(letterStatusOf('e', s)).toBe('learning');
  });
});

describe('shouldUnlockNext', () => {
  it('false when there\'s still a learning letter', () => {
    const s = initialKeybrState(); // 3 unlocked, no stats → all "learning"
    expect(shouldUnlockNext(s)).toBe(false);
  });

  it('true when all currently-unlocked letters are mastered', () => {
    const fast = { hits: 20, misses: 0, recentTimes: Array(15).fill(200) };
    const s = {
      ...initialKeybrState(),
      unlockedCount: 2,
      stats: {
        e: { letter: 'e', ...fast },
        t: { letter: 't', ...fast },
      },
    };
    expect(shouldUnlockNext(s)).toBe(true);
  });

  it('false when the alphabet is fully unlocked', () => {
    const fast = { hits: 20, misses: 0, recentTimes: Array(15).fill(200) };
    const stats: Record<string, ReturnType<typeof Object>> = {};
    for (const l of KEYBR_LETTER_ORDER) stats[l] = { letter: l, ...fast };
    const s = {
      ...initialKeybrState(),
      unlockedCount: KEYBR_LETTER_ORDER.length,
      stats: stats as never,
    };
    expect(shouldUnlockNext(s)).toBe(false);
  });
});

describe('recordKeystroke', () => {
  it('increments hits on correct keystroke', () => {
    const s = initialKeybrState();
    const next = recordKeystroke(s, 'e', true, 250);
    expect(next.stats.e.hits).toBe(1);
    expect(next.stats.e.misses).toBe(0);
    expect(next.stats.e.recentTimes).toEqual([250]);
  });

  it('increments misses on incorrect keystroke and does NOT record timing', () => {
    const s = initialKeybrState();
    const next = recordKeystroke(s, 'e', false, 250);
    expect(next.stats.e.hits).toBe(0);
    expect(next.stats.e.misses).toBe(1);
    expect(next.stats.e.recentTimes).toEqual([]);
  });

  it('skips timing when msSincePrev is NaN (first keystroke of a round)', () => {
    const s = initialKeybrState();
    const next = recordKeystroke(s, 'e', true, NaN);
    expect(next.stats.e.hits).toBe(1);
    expect(next.stats.e.recentTimes).toEqual([]);
  });

  it('returns a NEW state object (immutability)', () => {
    const s = initialKeybrState();
    const next = recordKeystroke(s, 'e', true, 200);
    expect(next).not.toBe(s);
    expect(next.stats).not.toBe(s.stats);
  });

  it('caps the timing window at 30 samples', () => {
    let s = initialKeybrState();
    for (let i = 0; i < 50; i++) s = recordKeystroke(s, 'e', true, 200);
    expect(s.stats.e.recentTimes.length).toBe(30);
  });
});

describe('generateRound', () => {
  it('returns non-empty output for the default (3-letter) starting state', () => {
    const out = generateRound(initialKeybrState(), { words: 8, rng: seedRng(1) });
    expect(out.length).toBeGreaterThan(0);
    expect(out.split(' ').length).toBe(8);
  });

  it('only uses unlocked letters', () => {
    const s = { ...initialKeybrState(), unlockedCount: 5 }; // e t a o i
    const unlocked = new Set(unlockedLetters(s));
    const out = generateRound(s, { words: 20, rng: seedRng(7) });
    const stripped = out.replace(/ /g, '');
    for (const c of stripped) {
      expect(unlocked.has(c), `unexpected char "${c}" in output: ${out}`).toBe(true);
    }
  });

  it('produces the requested word count', () => {
    const out = generateRound(initialKeybrState(), { words: 15, rng: seedRng(42) });
    expect(out.split(' ').length).toBe(15);
  });

  it('handles a tiny unlocked set without crashing', () => {
    const s = { ...initialKeybrState(), unlockedCount: 1 };
    const out = generateRound(s, { words: 5, rng: seedRng(3) });
    expect(out.length).toBeGreaterThan(0);
    // Every char must be the one unlocked letter ('e')
    for (const c of out.replace(/ /g, '')) expect(c).toBe('e');
  });

  it('is deterministic when given the same RNG seed', () => {
    const a = generateRound(initialKeybrState(), { words: 10, rng: seedRng(99) });
    const b = generateRound(initialKeybrState(), { words: 10, rng: seedRng(99) });
    expect(a).toBe(b);
  });
});
