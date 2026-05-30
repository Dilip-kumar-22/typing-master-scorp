import { useEffect, useRef } from 'preact/hooks';
import { Icon, ICON_PATHS } from '../lib/icons';
import {
  result, mode, restart, goHome,
  startRefresherDrill, shareResult,
} from '../lib/store';
import { showToast } from '../hooks/useToast';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { announce } from '../hooks/useA11yAnnouncer';

function fireConfetti() {
  const cvs = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  if (!cvs) return;
  const canvas: HTMLCanvasElement = cvs;
  canvas.classList.remove('hidden');
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  const colors = ['#8b5cf6', '#22d3ee', '#ec4899', '#a3e635', '#f59e0b', '#22c55e'];
  const W = window.innerWidth, H = window.innerHeight;
  const parts: {
    x: number; y: number; vx: number; vy: number; g: number; r: number;
    c: string; a: number; va: number; life: number;
  }[] = [];
  for (let i = 0; i < 180; i++) {
    parts.push({
      x: W / 2 + (Math.random() - 0.5) * 120,
      y: H / 2 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -14 - 4,
      g: 0.35 + Math.random() * 0.15,
      r: 4 + Math.random() * 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      a: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }
  function step() {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g;
      p.a += p.va; p.life -= 0.005;
      if (p.life > 0 && p.y < H + 40) alive = true;
      if (p.life <= 0) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(step);
    else canvas.classList.add('hidden');
  }
  requestAnimationFrame(step);
}

function animateWpm(targetVal: number, el: HTMLElement) {
  const t0 = performance.now();
  const dur = 1100;
  function tick(t: number) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = String(Math.round(targetVal * e));
    if (k < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateDonut(pct: number, arc: SVGCircleElement, label: HTMLElement) {
  const r = 84, c = 2 * Math.PI * r;
  const t0 = performance.now();
  const dur = 900;
  function tick(t: number) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    const animPct = pct * e;
    arc.setAttribute('stroke-dasharray', ((animPct / 100) * c).toFixed(1) + ' ' + c.toFixed(1));
    label.textContent = Math.round(animPct) + '%';
    if (k < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function ResultsOverlay() {
  const r = result.value;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(cardRef, r != null);

  useEffect(() => {
    if (!r) return;
    // Screen-reader announcement of the headline result.
    announce(
      r.isBest
        ? `New personal best: ${r.wpm} words per minute, ${r.acc} percent accuracy.`
        : `Session complete: ${r.wpm} words per minute, ${r.acc} percent accuracy.`
    );
    if (r.acc > 95) fireConfetti();
    const wpmEl = rootRef.current?.querySelector('#result-wpm') as HTMLElement | null;
    if (wpmEl) animateWpm(r.wpm, wpmEl);
    const arc = rootRef.current?.querySelector('#donut-arc') as SVGCircleElement | null;
    const lbl = rootRef.current?.querySelector('#donut-pct') as HTMLElement | null;
    if (arc && lbl) animateDonut(r.acc, arc, lbl);
  }, [r]);

  if (!r) return null;

  const delta = r.prevWpm != null ? r.wpm - r.prevWpm : null;
  const close = () => { result.value = null; };

  return (
    <div
      class="results-overlay"
      ref={rootRef}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
    >
      <div class="results-card" ref={cardRef} onClick={(e: Event) => e.stopPropagation()}>
        <div class="results-head">
          <h2 id="results-title">{r.isBest ? '🏆 New Personal Best!' : 'Session Complete'}</h2>
          <button class="close" onClick={close} aria-label="Close results">
            <Icon paths={ICON_PATHS.close} />
          </button>
        </div>
        <div class="results-body">
          <div class="results-hero">
            <div class="big-wpm" id="result-wpm">0</div>
            <div class="lbl">words per minute</div>
            {delta != null && (
              <div style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: delta >= 0 ? '#4ade80' : '#fb7185',
                padding: '4px 10px',
                borderRadius: 999,
                background: delta >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)',
                border: `1px solid ${delta >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
              }}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} vs last session
              </div>
            )}
            <div class="results-grid">
              <div class="mini"><div class="l">Raw WPM</div><div class="v">{r.raw}</div></div>
              <div class="mini"><div class="l">Time</div><div class="v">{r.time}<span style="font-size:12px;color:var(--text-3)"> s</span></div></div>
              <div class="mini"><div class="l">Correct</div><div class="v" style="color:#4ade80">{r.correct}</div></div>
              <div class="mini"><div class="l">Errors</div><div class="v" style="color:#fb7185">{r.errors}</div></div>
            </div>
          </div>
          <div>
            <div class="donut-wrap" style="position:relative">
              <svg width="200" height="200" style="transform:rotate(-90deg)">
                <defs>
                  <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#8b5cf6" />
                    <stop offset="50%" stop-color="#22d3ee" />
                    <stop offset="100%" stop-color="#ec4899" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="14" />
                <circle id="donut-arc" cx="100" cy="100" r="84" fill="none"
                  stroke="url(#donutGrad)" stroke-width="14" stroke-linecap="round"
                  stroke-dasharray="0 528"
                  style="filter:drop-shadow(0 0 8px rgba(139,92,246,0.5))" />
              </svg>
              <div style="position:absolute;display:grid;place-items:center;inset:0">
                <div style="text-align:center">
                  <div id="donut-pct" style="font-family:var(--font-mono);font-size:42px;font-weight:700;line-height:1;background:linear-gradient(180deg,#fff,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent">0%</div>
                  <div style="font-size:11px;color:var(--text-3);letter-spacing:0.18em;text-transform:uppercase;margin-top:6px">Accuracy</div>
                </div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-3);letter-spacing:0.18em;text-transform:uppercase;font-weight:600;margin:6px 0">
              Keys you struggled with
            </div>
            <div class="struggle-list">
              {r.struggle.length === 0
                ? <div style="color:var(--text-3);font-size:13px;padding:12px 0">No struggle keys — clean touch run.</div>
                : r.struggle.slice(0, 4).map(s => (
                    <div class="struggle-row">
                      <div class="k">{s.k === ' ' ? '␣' : s.k.toUpperCase()}</div>
                      <div class="bar"><span style={{ width: Math.min(100, s.n * 18) + '%' }} /></div>
                      <div class="n">{s.n} miss{s.n > 1 ? 'es' : ''}</div>
                    </div>
                  ))}
            </div>
            {r.refresherTriggered && (
              <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.3);text-align:left">
                <h4 style="margin:0;color:#fb7185;font-size:14px">⚠️ Adaptive Training Recommended</h4>
                <p style="margin:6px 0 10px;font-size:12px;color:var(--text-2);line-height:1.55">
                  Accuracy was below 85%. Before unlocking the next chapter, we recommend a quick Adaptive Refresher Drill targeting your missed keys.
                </p>
                <button class="btn primary" style="background:#fb7185;box-shadow:none;font-size:11px;padding:6px 12px"
                  onClick={() => { result.value = null; startRefresherDrill(); }}>
                  Start Refresher Drill
                </button>
              </div>
            )}
            {!r.refresherTriggered && r.lockedNext && (
              <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);text-align:left">
                <h4 style="margin:0;color:#4ade80;font-size:14px">🏆 Next Chapter Unlocked!</h4>
                <p style="margin:4px 0 0;font-size:12px;color:var(--text-2)">
                  Congratulations! You successfully unlocked the next training coordinate chapter.
                </p>
              </div>
            )}
          </div>
        </div>
        <div class="results-actions">
          <button class="btn ghost" onClick={() => shareResult(showToast)}>
            <Icon paths={ICON_PATHS.share} size={14} /> Share result
          </button>
          <button class="btn" onClick={() => { result.value = null; goHome(); }}>New mode</button>
          <button class="btn primary" onClick={() => { result.value = null; restart(); }}>Try again</button>
        </div>
      </div>
    </div>
  );
}
