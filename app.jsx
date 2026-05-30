/* Main app — wires modes, typing, stats, keyboard, results, settings. */

const STORAGE_KEY = 'typing_master_v1';

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'violet',
  font: 'JetBrains Mono',
  fontSize: 30,
  cursor: 'line',
  sound: true,
  volume: 0.4,
  soundPack: 'mechanical',
  promptLength: 40,
  timer: 'count-up',
  hlKeys: true,
  nextPreview: true,
  autoAdvance: false,
};

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}
function saveStore(patch) {
  const s = loadStore();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, ...patch }));
}

function App() {
  // ---- View routing ----
  const [view, setView] = useState('home'); // 'home' | 'practice'
  const [modePopoverOpen, setModePopoverOpen] = useState(false);

  // ---- Settings ----
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(loadStore().settings || {}) }));
  useEffect(() => { saveStore({ settings }); }, [settings]);
  useEffect(() => { Audio.setVolume(settings.volume); Audio.setEnabled(settings.sound); Audio.setPack(settings.soundPack); }, [settings.volume, settings.sound, settings.soundPack]);

  // ---- Mode ----
  const initialMode = MODE_GROUPS[6].items[1]; // intermediate default
  const [mode, setMode] = useState(initialMode);
  const [openGroups, setOpenGroups] = useState(() => new Set(['level','home']));

  // ---- Custom keys ----
  const [customKeys, setCustomKeys] = useState(new Set(['a','s','d','f','j','k','l']));
  const toggleCustom = (k) => {
    const n = new Set(customKeys);
    if (n.has(k)) n.delete(k); else n.add(k);
    setCustomKeys(n);
  };

  // ---- Prompt & typing state ----
  const [prompt, setPrompt] = useState(() => buildPrompt(initialMode, DEFAULT_SETTINGS.promptLength));
  const [position, setPosition] = useState(0);
  const [errorIdx, setErrorIdx] = useState(() => new Set());
  const [startTs, setStartTs] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [keyFreq, setKeyFreq] = useState({}); // chars → count
  const [keyErrs, setKeyErrs] = useState({}); // chars → count
  const [kbView, setKbView] = useState('frequency'); // 'frequency' | 'errors'
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => loadStore().history || []);

  // ---- Derived: target keys (highlighted on KB) ----
  const targetKeys = useMemo(() => {
    if (mode && mode.id === 'custom-set') return customKeys;
    if (!settings.hlKeys || !mode) return new Set();
    const k = (mode.keys || '').toLowerCase().split('');
    return new Set(k);
  }, [mode, customKeys, settings.hlKeys]);

  // ---- Heat map ----
  const heat = useMemo(() => {
    const src = kbView === 'errors' ? keyErrs : keyFreq;
    const vals = Object.values(src);
    if (!vals.length) return {};
    const max = Math.max(...vals);
    const out = {};
    for (const [k, v] of Object.entries(src)) {
      const lvl = Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
      out[k] = lvl;
    }
    return out;
  }, [kbView, keyFreq, keyErrs]);

  // ---- Timer ----
  useEffect(() => {
    if (!startTs) return;
    const id = setInterval(() => {
      setElapsed(((Date.now() - startTs) / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [startTs]);

  // ---- Stats ----
  const correctCount = position - errorIdx.size;
  const accuracy = position === 0 ? 100 : Math.max(0, Math.round(((position - errorCount) / Math.max(1, position + errorCount - position)) * 100));
  // Simpler accuracy: correct keystrokes / total keystrokes ever attempted
  const totalAttempts = position + errorCount;
  const accDisplay = totalAttempts === 0 ? 100 : Math.max(0, Math.min(100, Math.round((position - errorIdx.size) / Math.max(1, totalAttempts) * 100)));

  const minutes = Math.max(elapsed / 60, 0.01);
  const wordsTyped = correctCount / 5;
  const wpm = Math.max(0, Math.round(wordsTyped / minutes));
  const rawWords = position / 5;
  const rawWpm = Math.max(0, Math.round(rawWords / minutes));
  const progress = prompt.length === 0 ? 0 : position / prompt.length;

  // ---- Key handler ----
  useEffect(() => {
    const onDown = (e) => {
      // Only capture keystrokes while in practice view
      if (view !== 'practice') return;

      // Allow typing into modal inputs unaffected if drawer is open and target is input
      if (drawerOpen && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      // Update activeKeys for keyboard depress visual
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.code;
      setActiveKeys(prev => { const n = new Set(prev); n.add(k); return n; });

      if (e.key === 'Tab') { e.preventDefault(); restart(); return; }
      if (e.key === 'Escape') { reset(); return; }

      // Single-char input only
      if (e.key.length !== 1) return;
      if (result) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      e.preventDefault();
      if (!startTs) setStartTs(Date.now());

      const expected = prompt[position];
      const got = e.key;

      // Update freq
      setKeyFreq(prev => ({ ...prev, [got.toLowerCase()]: (prev[got.toLowerCase()] || 0) + 1 }));

      if (got === expected) {
        Audio.correct();
        setPosition(p => p + 1);
        setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n; });
      } else {
        Audio.wrong();
        setErrorCount(c => c + 1);
        setErrorIdx(prev => { const n = new Set(prev); n.add(position); return n; });
        setKeyErrs(prev => ({ ...prev, [expected.toLowerCase()]: (prev[expected.toLowerCase()] || 0) + 1 }));
        setStreak(0);
        // still advance so user keeps moving (typical practice apps do both; here we advance)
        setPosition(p => p + 1);
      }

      // word-complete chime
      if (expected === ' ') Audio.word();
    };
    const onUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.code;
      setActiveKeys(prev => { const n = new Set(prev); n.delete(k); return n; });
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [prompt, position, startTs, result, drawerOpen, view]);

  // ---- Completion ----
  useEffect(() => {
    if (position > 0 && position >= prompt.length && !result) {
      const time = Math.max(0.1, (Date.now() - startTs) / 1000);
      const finalWpm = Math.round(((position - errorIdx.size) / 5) / (time / 60));
      const finalRaw = Math.round((position / 5) / (time / 60));
      const finalAcc = Math.max(0, Math.min(100, Math.round((position - errorIdx.size) / Math.max(1, position + errorCount - position) * 100)));
      // safer:
      const acc2 = Math.max(0, Math.min(100, Math.round((position - errorIdx.size) / Math.max(1, position + errorCount) * 100)));

      // Struggle keys
      const struggle = Object.entries(keyErrs)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => ({ k, n }));

      // Personal best?
      const sameMode = history.filter(h => h.modeId === mode.id);
      const prevBest = sameMode.length ? Math.max(...sameMode.map(h => h.wpm)) : 0;
      const isBest = finalWpm > prevBest && history.length > 0;
      const prevWpm = sameMode.length ? sameMode[sameMode.length - 1].wpm : null;

      const session = {
        date: Date.now(), modeId: mode.id, modeLabel: mode.label,
        wpm: finalWpm, acc: acc2, time: Math.round(time),
      };
      const newHistory = [...history, session].slice(-20);
      setHistory(newHistory);
      saveStore({ history: newHistory });

      if (isBest) Audio.best(); else Audio.complete();

      setResult({
        wpm: finalWpm, raw: finalRaw, acc: acc2,
        errors: errorCount, correct: position - errorIdx.size,
        time: Math.round(time), struggle, isBest, prevWpm,
      });
    }
  }, [position, prompt, startTs]);

  // ---- Actions ----
  function reset() {
    setPosition(0); setErrorIdx(new Set()); setErrorCount(0);
    setStreak(0); setStartTs(null); setElapsed(0); setResult(null);
  }
  function restart() {
    reset();
    setPrompt(buildPrompt(mode, settings.promptLength));
  }
  function newText() {
    reset();
    setPrompt(buildPrompt(mode, settings.promptLength));
  }
  function pickMode(item) {
    reset();
    setMode(item);
    if (item.id === 'custom-set') {
      const text = generateFromCustomKeys(customKeys, settings.promptLength);
      setPrompt(text);
    } else {
      setPrompt(buildPrompt(item, settings.promptLength));
    }
  }
  function pickAndStart(item) {
    pickMode(item);
    setView('practice');
    setModePopoverOpen(false);
  }
  function startCurrent() {
    setView('practice');
  }
  function goHome() {
    setView('home');
    setModePopoverOpen(false);
  }
  function generateFromCustom() {
    if (customKeys.size < 2) return;
    reset();
    const item = MODE_GROUPS.find(g => g.id === 'custom').items[0];
    setMode(item);
    setPrompt(generateFromCustomKeys(customKeys, settings.promptLength));
  }
  function generateFromCustomKeys(keys, length) {
    const all = [...keys];
    const SPECIALS = new Set([' ', '\t', '\n', '\b']);
    const letters = all.filter(c => !SPECIALS.has(c));
    const hasSpace = keys.has(' ');
    const hasTab   = keys.has('\t');
    const hasEnter = keys.has('\n');
    // If user picked ONLY specials (edge case), fall back to home row
    const pool = letters.length ? letters : 'asdfghjkl'.split('');
    const out = [];
    for (let w = 0; w < length; w++) {
      const wl = 2 + Math.floor(Math.random() * 5);
      let word = '';
      for (let i = 0; i < wl; i++) word += pool[Math.floor(Math.random() * pool.length)];
      out.push(word);
    }
    // Join with separator: space by default, tab/newline if selected & no space
    let sep = ' ';
    if (!hasSpace && hasTab) sep = '\t';
    else if (!hasSpace && hasEnter) sep = '\n';
    let text = out.join(sep);
    // Sprinkle in tabs/newlines occasionally if BOTH space + special selected
    if (hasSpace && (hasTab || hasEnter)) {
      text = text.split(' ').map((w, i) => {
        if (i === 0) return w;
        if (hasEnter && Math.random() < 0.12) return '\n' + w;
        if (hasTab   && Math.random() < 0.10) return '\t' + w;
        return ' ' + w;
      }).join('');
    }
    return text;
  }
  function shareResult() {
    if (!result) return;
    const text = `I scored ${result.wpm} WPM at ${result.acc}% accuracy on ${mode.label} — Typing Master by S-Corp`;
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    alert('Copied to clipboard:\n\n' + text);
  }
  function resetProgress() {
    setHistory([]);
    saveStore({ history: [] });
  }

  // Re-build prompt when promptLength changes
  useEffect(() => {
    if (position === 0) {
      if (mode.id === 'custom-set') setPrompt(generateFromCustomKeys(customKeys, settings.promptLength));
      else setPrompt(buildPrompt(mode, settings.promptLength));
    }
  }, [settings.promptLength]);

  // ---- Topbar (shared) ----
  const TopBar = (
    <div className="topbar">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={goHome}>
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="3"/>
            <line x1="6" y1="10" x2="6" y2="10"/>
            <line x1="10" y1="10" x2="10" y2="10"/>
            <line x1="14" y1="10" x2="14" y2="10"/>
            <line x1="18" y1="10" x2="18" y2="10"/>
            <line x1="7" y1="15" x2="17" y2="15"/>
          </svg>
        </div>
        <div className="brand-title">
          <div className="t1">Typing Master</div>
          <div className="t2">by S-Corp · v1.0</div>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="theme-toggle">
          <button className={settings.theme==='light'?'on':''} onClick={()=>setSettings({...settings, theme:'light'})} title="Light">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>
          </button>
          <button className={settings.theme==='dark'?'on':''} onClick={()=>setSettings({...settings, theme:'dark'})} title="Dark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
        {view === 'practice' && (
          <button className={`icon-btn ${kbView==='errors'?'is-active':''}`} onClick={() => setKbView(v => v === 'errors' ? 'frequency' : 'errors')} title="Heatmap view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
        )}
        <button className={`icon-btn ${drawerOpen?'is-active':''}`} onClick={() => setDrawerOpen(true)} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </div>
  );

  // Group label for current mode
  const currentGroup = MODE_GROUPS.find(g => g.items.some(i => i.id === mode.id));

  // ---- Render ----
  return (
    <>
      <div className="bg-layer"></div>
      <div className="bg-grid"></div>
      <div className="bg-grain"></div>
      <div className="bg-orb a"></div>
      <div className="bg-orb b"></div>
      <div className="bg-orb c"></div>

      {view === 'home' ? (
        <div className="home">
          {TopBar}
          <Home
            history={history}
            currentMode={mode}
            onStart={startCurrent}
            onPickAndStart={pickAndStart}
            onOpenSettings={() => setDrawerOpen(true)}
          />
        </div>
      ) : (
        <div className="practice">
          {TopBar}
          {/* Practice header: back + mode picker */}
          <div className="practice-head">
            <button className="back-btn" onClick={goHome}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Home
            </button>
            <div className="practice-mode-pick" style={{ position: 'relative' }}>
              <span className="group">{currentGroup ? currentGroup.label : 'Practice'}</span>
              <span className="sep">·</span>
              <button className="picker" onClick={() => setModePopoverOpen(o => !o)}>
                {mode.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: modePopoverOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {modePopoverOpen && (
                <div className="mode-popover" onClick={e => e.stopPropagation()}>
                  {MODE_GROUPS.map(g => (
                    <div key={g.id} className="grp">
                      <div className="grp-lbl">{g.label}</div>
                      {g.items.map(it => (
                        <button key={it.id}
                          className={`pop-item ${mode.id === it.id ? 'on' : ''}`}
                          onClick={() => { pickMode(it); setModePopoverOpen(false); }}
                        >
                          {it.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" onClick={restart}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Restart
              </button>
            </div>
          </div>

          <StatsBar
            wpm={zen ? 0 : wpm}
            raw={zen ? 0 : rawWpm}
            acc={zen ? 100 : accDisplay}
            errors={zen ? 0 : errorCount}
            streak={zen ? 0 : streak}
            time={Math.round(elapsed)}
            progress={progress}
            prevWpm={(history.filter(h => h.modeId === mode.id).slice(-2)[0] || {}).wpm}
            onRestart={restart}
            onNewMode={newText}
            onZen={() => setZen(z => !z)}
            zen={zen}
          />

          <TypingArea
            prompt={prompt}
            position={position}
            errors={errorIdx}
            modeLabel={mode.label}
            fontFamily={settings.font}
            fontSize={settings.fontSize}
            zen={zen}
          />

          {mode.id === 'custom-set' && (
            <div style={{
              padding: '14px 18px',
              background: 'var(--panel)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-lg)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Custom key set · {customKeys.size} keys
                </div>
                <button className="btn ghost" onClick={generateFromCustom} style={{ fontSize: 11, padding: '6px 12px' }}>
                  Regenerate text
                </button>
              </div>
              <CustomKeysPanel
                selected={customKeys}
                onToggle={toggleCustom}
                onGenerate={generateFromCustom}
              />
            </div>
          )}

          <div className="kb-card">
            <div className="kb-head">
              <h4>
                {kbView === 'errors' ? 'Error heatmap' : 'Frequency heatmap'} ·
                <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                  {targetKeys.size > 0 ? `${targetKeys.size} target keys glowing` : 'live keystroke view'}
                </span>
              </h4>
              <div className="kb-toggle">
                <button className={kbView==='frequency'?'on':''} onClick={() => setKbView('frequency')}>Frequency</button>
                <button className={kbView==='errors'?'on':''} onClick={() => setKbView('errors')}>Errors</button>
              </div>
            </div>
            <Keyboard
              activeKeys={activeKeys}
              targetKeys={targetKeys}
              heat={heat}
              selected={new Set()}
              view={kbView}
            />
            <div className="kb-legend">
              <span>Heat scale:</span>
              <div className="scale"><div className="s" style={{background:'rgba(255,255,255,0.04)'}}></div><span>none</span></div>
              <div className="scale"><div className="s" style={{background:'hsl(50 90% 62%)'}}></div><span>low</span></div>
              <div className="scale"><div className="s" style={{background:'hsl(32 95% 58%)'}}></div><span>med</span></div>
              <div className="scale"><div className="s" style={{background:'hsl(12 92% 54%)'}}></div><span>high</span></div>
              <div className="scale"><div className="s" style={{background:'hsl(320 92% 56%)'}}></div><span>peak</span></div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
                Best streak: <strong style={{ color: 'var(--lime)', fontFamily: 'var(--font-mono)' }}>{bestStreak}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <ResultsOverlay
        result={result}
        onClose={() => setResult(null)}
        onRetry={() => { setResult(null); restart(); }}
        onNewMode={() => { setResult(null); newText(); }}
        onShare={shareResult}
      />

      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        setSettings={setSettings}
        history={history}
        onResetProgress={resetProgress}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
