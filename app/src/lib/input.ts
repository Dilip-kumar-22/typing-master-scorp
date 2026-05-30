// Shared input-processing core.
//
// Both the desktop keydown listener and the mobile soft-keyboard listener
// boil their event down to a LogicalInput, then call processInput(). This
// is the only place that knows how to advance pos, score correctness, log
// keyfreq/keyerrs, fire audio, and complete the session.

import {
  prompt, pos, errorIdx, errorCount, streak, bestStreak,
  startTimer, completeSession, restart, resetTyping,
  keyFreq, keyErrs, result, drawerOpen, tutorialActive, startTs,
  mode, keybrState, setKeybrState,
} from './store';
import { SynthAudio } from './audio';
import { recordKeystroke } from './keybr';
import { hapticError } from './native';

// Timestamp of the most recent meaningful keystroke. Used by adaptive mode
// to compute per-letter speed.
let lastKeyTs: number | null = null;

export type LogicalInput =
  | { kind: 'char'; char: string }       // single-character key (letter, digit, symbol, space, ⏎ via Enter)
  | { kind: 'backspace' }
  | { kind: 'tab' }                       // bare Tab — restart
  | { kind: 'escape' };                   // Esc — full reset

/** True if the input was meaningful (i.e. we acted on it). Useful for the
 *  caller to know whether to preventDefault. */
export function processInput(inp: LogicalInput): boolean {
  // Gating — same as the legacy keydown handler.
  if (drawerOpen.value) return false;
  if (result.value) return false;
  if (tutorialActive.value) return false;

  if (inp.kind === 'escape') {
    resetTyping();
    keyFreq.value = {};
    keyErrs.value = {};
    lastKeyTs = null;
    return true;
  }

  if (inp.kind === 'tab') {
    restart();
    lastKeyTs = null;
    return true;
  }

  if (inp.kind === 'backspace') {
    const expected = prompt.value[pos.value];
    if (expected === '\b') {
      // Backspace itself was the target character — count as correct.
      SynthAudio.correct();
      keyFreq.value = { ...keyFreq.value, '\b': (keyFreq.value['\b'] || 0) + 1 };
      pos.value = pos.value + 1;
      streak.value = streak.value + 1;
      bestStreak.value = Math.max(bestStreak.value, streak.value);
    } else if (pos.value > 0) {
      const newPos = pos.value - 1;
      const next = new Set(errorIdx.value);
      next.delete(newPos);
      errorIdx.value = next;
      pos.value = newPos;
      if (streak.value > 0) streak.value = streak.value - 1;
    }
    return true;
  }

  // 'char' — newline / tab / printable
  const expected = prompt.value[pos.value];
  if (expected == null) return false;
  const got = inp.char;
  const isCorrect = (got === expected);

  // First keystroke kicks off the timer.
  startTimer();

  const logKey = got === '\n' ? '\n' : got === '\t' ? '\t' : got.toLowerCase();
  keyFreq.value = { ...keyFreq.value, [logKey]: (keyFreq.value[logKey] || 0) + 1 };

  // Adaptive-mode bookkeeping: record per-letter timing.
  // Only count letters (a-z), and only when there's a previous timestamp to
  // diff against (so the very first keystroke of a round doesn't pollute
  // stats with a wildly stale interval).
  const now = Date.now();
  if (mode.value.id === 'adaptive') {
    const targetLower = expected === '\n' ? '\n' : expected === '\t' ? '\t' : expected.toLowerCase();
    const isLetter = /^[a-z]$/.test(targetLower);
    if (isLetter && lastKeyTs != null) {
      const ms = now - lastKeyTs;
      setKeybrState(recordKeystroke(keybrState.value, targetLower, isCorrect, ms));
    } else if (isLetter && lastKeyTs == null) {
      // First keystroke of the round: still record correctness, just skip
      // the timing sample (no prior timestamp to subtract from).
      setKeybrState(recordKeystroke(keybrState.value, targetLower, isCorrect, NaN));
    }
  }
  lastKeyTs = now;

  if (isCorrect) {
    SynthAudio.correct();
    pos.value = pos.value + 1;
    streak.value = streak.value + 1;
    bestStreak.value = Math.max(bestStreak.value, streak.value);
  } else {
    SynthAudio.wrong();
    // Tactile feedback on native (no-op on web).
    void hapticError();
    errorCount.value = errorCount.value + 1;
    const ne = new Set(errorIdx.value);
    ne.add(pos.value);
    errorIdx.value = ne;
    const errKey = expected === '\n' ? '\n' : expected === '\t' ? '\t' : expected.toLowerCase();
    keyErrs.value = { ...keyErrs.value, [errKey]: (keyErrs.value[errKey] || 0) + 1 };
    streak.value = 0;
    pos.value = pos.value + 1;
  }
  if (expected === ' ') SynthAudio.word();

  if (pos.value >= prompt.value.length) completeSession();
  return true;
}

/** Helper for callers that want to know whether typing has begun (e.g. to
 *  treat `?` as a help-shortcut only before the user has started). */
export function hasStartedTyping(): boolean {
  return startTs.value != null;
}
