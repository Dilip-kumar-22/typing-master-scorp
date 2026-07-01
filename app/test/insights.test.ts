import { describe, it, expect } from 'vitest';
import { computeInsights, weakestKeys, fingerAccuracy } from '../src/lib/insights';
import type { Session, KeyStats } from '../src/lib/types';

const sess = (wpm: number, acc: number): Session => ({
  date: 1, modeId: 'lesson-1', modeLabel: 'x', wpm, acc, time: 30,
});

describe('weakestKeys', () => {
  it('ranks by accuracy ascending and filters low-sample keys', () => {
    const stats: KeyStats = {
      a: { presses: 100, errors: 40 }, // 60%
      s: { presses: 100, errors: 5 },  // 95%
      z: { presses: 3, errors: 3 },    // 0% but too few presses → filtered
    };
    const w = weakestKeys(stats, 8);
    expect(w.map(k => k.raw)).toEqual(['a', 's']); // z filtered out
    expect(w[0].accuracy).toBe(60);
  });

  it('computes accuracy correctly and formats special keys', () => {
    const w = weakestKeys({ ' ': { presses: 50, errors: 10 } }, 8);
    expect(w[0].key).toBe('␣');
    expect(w[0].accuracy).toBe(80);
  });
});

describe('fingerAccuracy', () => {
  it('aggregates keys up to their finger', () => {
    // a + s are both left-hand fingers; f is left index
    const stats: KeyStats = {
      f: { presses: 100, errors: 2 },
      a: { presses: 50, errors: 25 },
    };
    const fa = fingerAccuracy(stats);
    const byName = Object.fromEntries(fa.map(f => [f.finger, f.accuracy]));
    expect(byName['Left Index']).toBe(98);
    expect(byName['Left Pinky']).toBe(50);
    // worst finger sorted first
    expect(fa[0].finger).toBe('Left Pinky');
  });
});

describe('computeInsights', () => {
  it('returns an empty-but-safe bundle with no data', () => {
    const i = computeInsights([], {});
    expect(i.totalSessions).toBe(0);
    expect(i.bestWpm).toBe(0);
    expect(i.weakestKeys).toEqual([]);
    expect(i.recommendation).toContain('appear here');
  });

  it('computes best/avg WPM, accuracy, and improvement delta', () => {
    const hist = [sess(40, 96), sess(50, 97), sess(60, 98)];
    const i = computeInsights(hist, {});
    expect(i.bestWpm).toBe(60);
    expect(i.avgWpm).toBe(50);
    expect(i.avgAccuracy).toBe(97);
    // last (60) vs prior avg (45) = +15
    expect(i.wpmDelta).toBe(15);
  });

  it('recommends slowing down when accuracy is low', () => {
    const i = computeInsights([sess(70, 80)], {});
    expect(i.recommendation.toLowerCase()).toContain('accuracy');
  });

  it('recommends drilling weak keys when a key is bad but accuracy ok', () => {
    const hist = [sess(50, 95), sess(52, 96)];
    const stats: KeyStats = { q: { presses: 40, errors: 20 } }; // 50%
    const i = computeInsights(hist, stats);
    expect(i.recommendation.toLowerCase()).toContain('weakest keys');
  });

  it('consistency is null with <2 sessions, a number otherwise', () => {
    expect(computeInsights([sess(50, 95)], {}).consistency).toBeNull();
    expect(computeInsights([sess(50, 95), sess(70, 95)], {}).consistency).not.toBeNull();
  });
});
