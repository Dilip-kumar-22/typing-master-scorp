/* Results overlay with donut, struggle list, confetti. */

function Donut({ pct, size = 200 }) {
  const r = (size / 2) - 16;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    let id;
    const t0 = performance.now();
    const dur = 900;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setAnimPct(pct * e);
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const animDash = (animPct / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6"/>
            <stop offset="50%" stopColor="#22d3ee"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          <filter id="donutGlow">
            <feGaussianBlur stdDeviation="3"/>
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#donutGrad)" strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${animDash} ${c}`}
          style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.5))' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        flexDirection: 'column',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 700, lineHeight: 1,
            background: 'linear-gradient(180deg, #fff, #c4b5fd)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>{Math.round(animPct)}<span style={{fontSize:22}}>%</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>Accuracy</div>
        </div>
      </div>
    </div>
  );
}

function Confetti({ on }) {
  const canvasRef = React.useRef(null);
  useEffect(() => {
    if (!on || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cvs.width = window.innerWidth * dpr;
    cvs.height = window.innerHeight * dpr;
    cvs.style.width = window.innerWidth + 'px';
    cvs.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    const colors = ['#8b5cf6','#22d3ee','#ec4899','#a3e635','#f59e0b','#22c55e'];
    const W = window.innerWidth, H = window.innerHeight;
    const N = 180;
    const parts = [];
    for (let i = 0; i < N; i++) {
      parts.push({
        x: W/2 + (Math.random()-0.5) * 120,
        y: H/2 + (Math.random()-0.5) * 60,
        vx: (Math.random()-0.5) * 12,
        vy: (Math.random() * -14) - 4,
        g: 0.35 + Math.random() * 0.15,
        r: 4 + Math.random() * 4,
        c: colors[Math.floor(Math.random() * colors.length)],
        a: Math.random() * Math.PI * 2,
        va: (Math.random()-0.5) * 0.3,
        life: 1,
      });
    }
    let raf;
    const step = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.a += p.va;
        p.life -= 0.005;
        if (p.life > 0 && p.y < H + 40) alive = true;
        if (p.life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r * 1.6);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  if (!on) return null;
  return <canvas ref={canvasRef} className="confetti" />;
}

function ResultsOverlay({ result, onClose, onRetry, onNewMode, onShare }) {
  if (!result) return null;
  const { wpm, raw, acc, errors, correct, time, struggle, isBest, prevWpm } = result;
  const delta = prevWpm != null ? wpm - prevWpm : null;
  const big = useAnimNumber(wpm);

  return (
    <>
      <Confetti on={acc > 95} />
      <div className="results-overlay" onClick={onClose}>
        <div className="results-card" onClick={e => e.stopPropagation()}>
          <div className="results-head">
            <h2>{isBest ? '🏆 New personal best' : 'Session complete'}</h2>
            <button className="close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
            </button>
          </div>

          <div className="results-body">
            <div className="results-hero">
              <div className="big-wpm">{big}</div>
              <div className="lbl">words per minute</div>
              {delta != null && (
                <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 13,
                  color: delta >= 0 ? '#4ade80' : '#fb7185',
                  padding: '4px 10px', borderRadius: 999,
                  background: delta >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)',
                  border: '1px solid ' + (delta >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'),
                }}>
                  {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} vs last session
                </div>
              )}
              <div className="results-grid">
                <div className="mini"><div className="l">Raw WPM</div><div className="v">{raw}</div></div>
                <div className="mini"><div className="l">Time</div><div className="v">{time}<span style={{fontSize:12,color:'var(--text-3)'}}> s</span></div></div>
                <div className="mini"><div className="l">Correct</div><div className="v" style={{color:'#4ade80'}}>{correct}</div></div>
                <div className="mini"><div className="l">Errors</div><div className="v" style={{color:'#fb7185'}}>{errors}</div></div>
              </div>
            </div>

            <div>
              <div className="donut-wrap"><Donut pct={acc} /></div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, margin: '6px 0' }}>
                Keys you struggled with
              </div>
              <div className="struggle-list">
                {struggle.length === 0 && (
                  <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '12px 0' }}>
                    No struggle keys — clean run.
                  </div>
                )}
                {struggle.slice(0, 4).map(s => (
                  <div key={s.k} className="struggle-row">
                    <div className="k">{s.k === ' ' ? '␣' : s.k.toUpperCase()}</div>
                    <div className="bar"><span style={{ width: `${Math.min(100, s.n * 18)}%` }}></span></div>
                    <div className="n">{s.n} miss{s.n>1?'es':''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="results-actions">
            <button className="btn ghost" onClick={onShare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share result
            </button>
            <button className="btn" onClick={onNewMode}>New mode</button>
            <button className="btn primary" onClick={onRetry}>Try again</button>
          </div>
        </div>
      </div>
    </>
  );
}

function useAnimNumber(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let id;
    const t0 = performance.now();
    const start = 0;
    const dur = 1100;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      setV(Math.round(start + (target - start) * e));
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target]);
  return v;
}

window.ResultsOverlay = ResultsOverlay;
