// Adaptive (keybr-style) home-screen panel: letter grid + target setting +
// "Start adaptive practice" CTA. The actual typing happens on the practice
// screen with mode = ADAPTIVE_MODE.

import { useEffect } from 'preact/hooks';
import {
  KEYBR_LETTER_ORDER,
  letterWpm,
  letterAccuracy,
  letterStatusOf,
} from '../lib/keybr';
import {
  keybrState,
  setKeybrState,
  ADAPTIVE_MODE,
  pickAndStart,
  adaptiveJustUnlocked,
} from '../lib/store';
import { showToast } from '../hooks/useToast';
import { announce } from '../hooks/useA11yAnnouncer';

export function AdaptivePanel() {
  const s = keybrState.value;
  const total = KEYBR_LETTER_ORDER.length;
  const mastered = KEYBR_LETTER_ORDER.slice(0, s.unlockedCount)
    .filter(l => letterStatusOf(l, s) === 'mastered').length;

  // Toast + clear the "just unlocked" marker after showing it.
  useEffect(() => {
    const newLetter = adaptiveJustUnlocked.value;
    if (newLetter) {
      showToast(`🎯 Unlocked: ${newLetter.toUpperCase()}`);
      announce(`New letter unlocked: ${newLetter}`);
      adaptiveJustUnlocked.value = null;
    }
  });

  function start() {
    pickAndStart(ADAPTIVE_MODE);
  }

  function resetProgress() {
    if (!confirm('Reset adaptive progress? You will start over with the first 3 letters.')) return;
    setKeybrState({
      unlockedCount: 3,
      stats: {},
      targetWpm: s.targetWpm,
      totalRounds: 0,
    });
    showToast('Adaptive progress reset');
  }

  return (
    <div class="tab-content">
      <div class="section-head">
        <h2>🎯 Adaptive Learning</h2>
        <p>
          Letters unlock as you hit your target speed on the ones you already have.
          Inspired by keybr.com — the algorithm picks what you need to practice next.
        </p>
      </div>

      <div class="adaptive-card">
        {/* Top stats row */}
        <div class="adaptive-stats">
          <div class="adaptive-stat">
            <div class="lbl">Unlocked</div>
            <div class="val">{s.unlockedCount}<span class="u">/ {total}</span></div>
          </div>
          <div class="adaptive-stat">
            <div class="lbl">Mastered</div>
            <div class="val">{mastered}<span class="u">/ {s.unlockedCount}</span></div>
          </div>
          <div class="adaptive-stat">
            <div class="lbl">Rounds typed</div>
            <div class="val">{s.totalRounds}</div>
          </div>
          <div class="adaptive-stat">
            <div class="lbl">Target speed</div>
            <div class="val">{s.targetWpm}<span class="u">WPM</span></div>
          </div>
        </div>

        {/* Target slider */}
        <div class="adaptive-target">
          <label class="adaptive-target-lbl">
            Target speed to unlock the next letter: <strong>{s.targetWpm} WPM</strong>
          </label>
          <input
            class="range"
            type="range" min="15" max="60" step="1"
            value={s.targetWpm}
            onInput={(e: Event) => {
              const v = +(e.target as HTMLInputElement).value;
              setKeybrState({ ...s, targetWpm: v });
            }}
          />
          <div class="adaptive-target-scale">
            <span>15 (easy)</span><span>30 (avg)</span><span>45 (fast)</span><span>60 (pro)</span>
          </div>
        </div>

        {/* Letter grid */}
        <div class="adaptive-grid-head">
          <h3>Your letters</h3>
          <p>
            <span class="lg-dot mastered" /> mastered
            <span class="lg-dot learning" /> learning
            <span class="lg-dot locked" /> locked
          </p>
        </div>
        <div class="adaptive-grid">
          {KEYBR_LETTER_ORDER.map((l, idx) => {
            const status = letterStatusOf(l, s);
            const stat = s.stats[l];
            const wpm = letterWpm(stat);
            const acc = letterAccuracy(stat);
            const pct = Math.min(100, (wpm / s.targetWpm) * 100);
            return (
              <div class={'adaptive-cell ' + status} key={l}>
                <div class="adaptive-cell-head">
                  <span class="adaptive-letter">{l.toUpperCase()}</span>
                  <span class="adaptive-order">#{idx + 1}</span>
                </div>
                <div class="adaptive-cell-bar">
                  <div class="adaptive-cell-fill" style={{ width: pct + '%' }} />
                </div>
                <div class="adaptive-cell-stats">
                  <span>{wpm} <em>wpm</em></span>
                  <span>{acc}% <em>acc</em></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div class="adaptive-actions">
          <button class="btn ghost" onClick={resetProgress}>Reset progress</button>
          <button class="btn primary lg" onClick={start}>Start adaptive practice →</button>
        </div>
      </div>
    </div>
  );
}
