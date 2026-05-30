/* HOME — dashboard view shown before entering Practice. */

function Home({ history, mode, onStart, onPickAndStart, onOpenSettings, currentMode }) {
  // Derived stats
  const bestWpm = history.length ? Math.max(...history.map(h => h.wpm)) : 0;
  const avgWpm  = history.length ? Math.round(history.reduce((s, h) => s + h.wpm, 0) / history.length) : 0;
  const totalTime = history.reduce((s, h) => s + (h.time || 0), 0);
  const minutes = Math.floor(totalTime / 60);
  const totalSessions = history.length;
  const lastSession = history[history.length - 1];

  // Find lastMode
  const lastModeItem = useMemo(() => {
    if (!lastSession) return null;
    for (const g of MODE_GROUPS) {
      const it = g.items.find(i => i.id === lastSession.modeId);
      if (it) return it;
    }
    return null;
  }, [lastSession]);

  // Daily challenge: seeded by date
  const dailyMode = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    let seed = 0; for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const candidates = ['intermediate','advanced','expert','code','paragraph','upper-only','lower-only','home-only'];
    const id = candidates[seed % candidates.length];
    for (const g of MODE_GROUPS) {
      const it = g.items.find(i => i.id === id);
      if (it) return it;
    }
    return MODE_GROUPS[6].items[1];
  }, []);

  const randomMode = () => {
    const all = MODE_GROUPS.flatMap(g => g.items).filter(i => i.id !== 'custom-set');
    return all[Math.floor(Math.random() * all.length)];
  };

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-tag">
              <span className="pulse"></span>
              Welcome back, typist
            </div>
            <h1 className="hero-title">
              Train your fingers.<br/>
              <span className="grad">Sharpen your mind.</span>
            </h1>
            <p className="hero-sub">
              Drill home row, upper row, numbers, symbols, code snippets, and full paragraphs.
              Live heatmaps. Personal bests. Pure focus.
            </p>
            <div className="hero-cta">
              <button className="btn primary lg" onClick={() => onStart(currentMode)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                Start typing
              </button>
              <div className="hero-mode-chip">
                <span className="lbl">Current mode</span>
                <span className="val">{currentMode.label}</span>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <HeroOrb wpm={bestWpm || 0} />
          </div>
        </div>
      </section>

      {/* QUICK ROW */}
      <section className="quick-row">
        <QuickCard
          tone="violet"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
          eyebrow="Pick up where you left off"
          title={lastModeItem ? lastModeItem.label : 'No sessions yet'}
          meta={lastSession ? `${lastSession.wpm} WPM · ${lastSession.acc}% acc` : 'Start your first session'}
          cta={lastModeItem ? 'Continue' : 'Start beginner'}
          onClick={() => onPickAndStart(lastModeItem || MODE_GROUPS[6].items[0])}
        />
        <QuickCard
          tone="cyan"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
          eyebrow="Daily Challenge"
          title={dailyMode.label}
          meta={"Today's seeded run · resets at midnight"}
          cta="Take challenge"
          onClick={() => onPickAndStart(dailyMode)}
          badge="NEW"
        />
        <QuickCard
          tone="magenta"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          eyebrow="Surprise me"
          title="Random mode"
          meta="Roll the dice on any of the 25+ modes"
          cta="Spin"
          onClick={() => onPickAndStart(randomMode())}
        />
      </section>

      {/* STATS STRIP */}
      <section className="stats-strip">
        <MiniStat lbl="Best WPM"    val={bestWpm}        unit="" tone="violet" />
        <MiniStat lbl="Avg WPM"     val={avgWpm}         unit="" tone="cyan" />
        <MiniStat lbl="Total time"  val={minutes}        unit="min" tone="magenta" />
        <MiniStat lbl="Sessions"    val={totalSessions}  unit={`/ 20`} tone="lime" />
      </section>

      {/* TREND */}
      {history.length > 0 && (
        <section className="trend-card">
          <div className="trend-head">
            <div>
              <h3>WPM trend</h3>
              <p>Last {Math.min(20, history.length)} sessions</p>
            </div>
            <div className="trend-pill">
              {history.length >= 2 && (history[history.length-1].wpm >= history[history.length-2].wpm
                ? <span className="up">↑ improving</span>
                : <span className="down">↓ slow run</span>)}
            </div>
          </div>
          <SessionsTrend history={history} />
        </section>
      )}

      {/* MODES GRID */}
      <section className="modes-section">
        <div className="section-head">
          <h2>Practice modes</h2>
          <p>Pick a category to start a session. Each card includes multiple variations.</p>
        </div>
        <div className="modes-grid">
          {MODE_GROUPS.map(g => (
            <ModeCard
              key={g.id}
              group={g}
              activeId={currentMode.id}
              onPick={onPickAndStart}
              onOpenSettings={onOpenSettings}
            />
          ))}
        </div>
      </section>

      {/* RECENT SESSIONS */}
      {history.length > 0 && (
        <section className="recent">
          <div className="section-head">
            <h2>Recent sessions</h2>
            <p>Your last {Math.min(8, history.length)} runs</p>
          </div>
          <div className="recent-table">
            <div className="recent-head">
              <div>Mode</div>
              <div>WPM</div>
              <div>Accuracy</div>
              <div>Time</div>
              <div>When</div>
            </div>
            {[...history].reverse().slice(0, 8).map((h, i) => (
              <div key={i} className="recent-row">
                <div className="m">{h.modeLabel || h.modeId}</div>
                <div className="w" style={{ color: 'var(--violet-2)' }}>{h.wpm}</div>
                <div className="a" style={{ color: h.acc >= 95 ? '#4ade80' : (h.acc >= 85 ? '#facc15' : '#fb7185') }}>{h.acc}%</div>
                <div className="t">{h.time}s</div>
                <div className="d">{timeAgo(h.date)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="home-foot">
        <span>Typing Master · S-Corp · v1.0</span>
        <span>Press <kbd>?</kbd> for keyboard shortcuts</span>
      </footer>
    </>
  );
}

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function HeroOrb({ wpm }) {
  // 3D animated orb showing best WPM
  return (
    <div className="hero-orb">
      <div className="orb-ring r1"></div>
      <div className="orb-ring r2"></div>
      <div className="orb-ring r3"></div>
      <div className="orb-core">
        <div className="orb-num">{wpm || '—'}</div>
        <div className="orb-lbl">Best WPM</div>
      </div>
    </div>
  );
}

function QuickCard({ tone, icon, eyebrow, title, meta, cta, onClick, badge }) {
  return (
    <button className={`quickcard tone-${tone}`} onClick={onClick}>
      <div className="qc-icon">{icon}</div>
      {badge && <div className="qc-badge">{badge}</div>}
      <div className="qc-eyebrow">{eyebrow}</div>
      <div className="qc-title">{title}</div>
      <div className="qc-meta">{meta}</div>
      <div className="qc-cta">
        <span>{cta}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </button>
  );
}

function MiniStat({ lbl, val, unit, tone }) {
  return (
    <div className={`mini-stat tone-${tone}`}>
      <div className="ms-lbl">{lbl}</div>
      <div className="ms-val">
        <span>{val}</span>
        {unit && <span className="u">{unit}</span>}
      </div>
    </div>
  );
}

function ModeCard({ group, activeId, onPick, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`modecard tone-${group.id}`}>
      <div className="mc-head">
        <div className="mc-icon">{group.icon}</div>
        <div>
          <div className="mc-title">{group.label}</div>
          <div className="mc-meta">{group.items.length} variation{group.items.length > 1 ? 's' : ''}</div>
        </div>
        <button className="mc-expand" onClick={() => setOpen(o => !o)} aria-label="More">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      {/* Default variations list (collapsed → primary 2; expanded → all) */}
      <div className="mc-items">
        {(open ? group.items : group.items.slice(0, 2)).map(it => (
          <button key={it.id}
            className={`mc-item ${activeId === it.id ? 'is-active' : ''}`}
            onClick={() => onPick(it)}
          >
            <span className="dot"></span>
            <span className="lbl">{it.label}</span>
            {it.keys && <span className="bdg">{it.keys.length}</span>}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="arrow"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
        {!open && group.items.length > 2 && (
          <button className="mc-more" onClick={() => setOpen(true)}>
            + {group.items.length - 2} more
          </button>
        )}
      </div>
    </div>
  );
}

window.Home = Home;
