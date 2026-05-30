import { describe, it, expect } from 'vitest';
import { computeMetrics } from '../src/lib/metrics';

describe('computeMetrics — accuracy, WPM, raw WPM', () => {
  it('empty typing: 100% accuracy, 0 WPM', () => {
    const m = computeMetrics({ pos: 0, errorIdxSize: 0, errorCount: 0, elapsedSec: 0, promptLength: 10 });
    expect(m.acc).toBe(100);
    expect(m.wpm).toBe(0);
    expect(m.rawWpm).toBe(0);
    expect(m.progress).toBe(0);
  });

  it('perfect typing: 100% accuracy', () => {
    const m = computeMetrics({ pos: 10, errorIdxSize: 0, errorCount: 0, elapsedSec: 6, promptLength: 10 });
    expect(m.acc).toBe(100);
    expect(m.progress).toBe(1);
  });

  it('10 chars in 6s → 20 WPM (10/5 ÷ 0.1 min)', () => {
    const m = computeMetrics({ pos: 10, errorIdxSize: 0, errorCount: 0, elapsedSec: 6, promptLength: 20 });
    expect(m.wpm).toBe(20);
  });

  it('B-1: backspace-corrected error recovers accuracy', () => {
    const m = computeMetrics({ pos: 10, errorIdxSize: 0, errorCount: 1, elapsedSec: 6, promptLength: 10 });
    expect(m.acc).toBe(100);
  });

  it('uncorrected error reduces accuracy', () => {
    const m = computeMetrics({ pos: 10, errorIdxSize: 2, errorCount: 2, elapsedSec: 6, promptLength: 10 });
    expect(m.acc).toBe(80);
  });

  it('rawWPM counts every keypress including errors', () => {
    const m = computeMetrics({ pos: 10, errorIdxSize: 5, errorCount: 5, elapsedSec: 6, promptLength: 20 });
    expect(m.rawWpm).toBe(30);
  });

  it('accuracy stays inside [0, 100]', () => {
    const m1 = computeMetrics({ pos: 5, errorIdxSize: 99, errorCount: 99, elapsedSec: 6, promptLength: 5 });
    expect(m1.acc).toBeGreaterThanOrEqual(0);
    expect(m1.acc).toBeLessThanOrEqual(100);
  });

  it('progress is 0..1', () => {
    const m = computeMetrics({ pos: 25, errorIdxSize: 0, errorCount: 0, elapsedSec: 10, promptLength: 100 });
    expect(m.progress).toBe(0.25);
  });
});
