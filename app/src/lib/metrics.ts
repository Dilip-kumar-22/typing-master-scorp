// Single source of truth for the typing metrics.
// Pure function — fully unit-testable, no DOM/globals.

import type { Metrics, MetricsInput } from './types';

export function computeMetrics({
  pos,
  errorIdxSize,
  errorCount,
  elapsedSec,
  promptLength,
}: MetricsInput): Metrics {
  const currentlyCorrect = Math.max(0, pos - errorIdxSize);

  // Accuracy = of what is now on screen, how much is correct.
  // Backspace-corrected mistakes recover the displayed accuracy because
  // errorIdxSize shrinks when the user fixes them.
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
