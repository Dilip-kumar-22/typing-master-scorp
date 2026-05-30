/* Live stats bar + sparkline. */

function Stat({ kind, label, value, unit, delta, percent }) {
  return (
    <div className={`stat ${kind}`}>
      <div className="lbl">{label}</div>
      <div className="val">
        <span>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta != null && (
        <div className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}
        </div>
      )}
      {percent != null && (
        <div className="bar"><span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}></span></div>
      )}
    </div>
  );
}

function StatsBar({ wpm, raw, acc, errors, streak, time, progress, prevWpm, onRestart, onNewMode, onZen, zen }) {
  // Smoothly animated WPM count-up
  const [displayWpm, setDisplayWpm] = useState(0);
  useEffect(() => {
    let id;
    const start = displayWpm;
    const target = wpm;
    const t0 = performance.now();
    const dur = 360;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setDisplayWpm(Math.round(start + (target - start) * e));
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [wpm]);

  const wpmDelta = prevWpm != null ? wpm - prevWpm : null;

  return (
    <div className="stats-bar">
      <Stat kind="wpm"    label="WPM"       value={displayWpm} unit={`raw ${raw}`} delta={wpmDelta} percent={Math.min(100, wpm)} />
      <Stat kind="acc"    label="Accuracy"  value={acc}      unit="%" />
      <Stat kind="err"    label="Errors"    value={errors} />
      <Stat kind="streak" label="Streak"    value={streak}   unit="keys" />
      <Stat kind="time"   label="Time"      value={time}     unit="s"   percent={progress * 100} />
      <div className="controls">
        <button className={`btn ${zen ? 'primary' : 'ghost'}`} onClick={onZen} title="Zen mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
          Zen
        </button>
        <button className="btn" onClick={onNewMode}>New text</button>
        <button className="btn primary" onClick={onRestart}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Restart
        </button>
      </div>
    </div>
  );
}

window.StatsBar = StatsBar;
