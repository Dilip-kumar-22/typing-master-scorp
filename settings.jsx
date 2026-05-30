/* Settings drawer + sessions history. */

function SettingsDrawer({ open, onClose, settings, setSettings, history, onResetProgress }) {
  if (!open) return null;
  const s = settings;
  const set = (k, v) => setSettings({ ...s, [k]: v });

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
        <div className="drawer-body">

          <div className="setting-row">
            <div className="lbl"><span className="name">Theme</span><span className="v">{s.theme}</span></div>
            <div className="seg">
              {['light','dark','auto'].map(v => (
                <button key={v} className={s.theme===v?'on':''} onClick={() => set('theme', v)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Accent color</span></div>
            <div className="swatch-row">
              {ACCENTS.map(a => (
                <div key={a.id}
                  className={`swatch ${s.accent===a.id?'on':''}`}
                  onClick={() => set('accent', a.id)}
                  style={{ background: a.c }}
                ></div>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Font</span><span className="v">{s.font}</span></div>
            <div className="seg">
              {['JetBrains Mono','Fira Code','Courier'].map(v => (
                <button key={v} className={s.font===v?'on':''} onClick={() => set('font', v)} style={{fontSize:11}}>{v.split(' ')[0]}</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Font size</span><span className="v">{s.fontSize}px</span></div>
            <input className="range" type="range" min="20" max="40" step="1" value={s.fontSize} onChange={e => set('fontSize', +e.target.value)}/>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Cursor style</span><span className="v">{s.cursor}</span></div>
            <div className="seg">
              {['line','block','underline'].map(v => (
                <button key={v} className={s.cursor===v?'on':''} onClick={() => set('cursor', v)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Sound</span></div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div className={`switch ${s.sound?'on':''}`} onClick={() => set('sound', !s.sound)}></div>
              <input className="range" type="range" min="0" max="100" step="1" value={s.volume*100} onChange={e => set('volume', +e.target.value/100)} style={{flex:1, marginLeft:12, opacity: s.sound ? 1 : 0.4 }}/>
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Sound pack</span><span className="v">{s.soundPack}</span></div>
            <div className="seg">
              {['mechanical','soft','typewriter'].map(v => (
                <button key={v} className={s.soundPack===v?'on':''} onClick={() => set('soundPack', v)} style={{fontSize:11}}>{v}</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Prompt length</span><span className="v">{s.promptLength} words</span></div>
            <div className="seg">
              {[20,40,60,80,100].map(v => (
                <button key={v} className={s.promptLength===v?'on':''} onClick={() => set('promptLength', v)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Timer mode</span><span className="v">{s.timer}</span></div>
            <div className="seg">
              {['off','count-up','30s','60s','120s'].map(v => (
                <button key={v} className={s.timer===v?'on':''} onClick={() => set('timer', v)} style={{fontSize:11}}>{v}</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Highlight mode keys on keyboard</span></div>
            <div className={`switch ${s.hlKeys?'on':''}`} onClick={() => set('hlKeys', !s.hlKeys)}></div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Show next words preview</span></div>
            <div className={`switch ${s.nextPreview?'on':''}`} onClick={() => set('nextPreview', !s.nextPreview)}></div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Auto-advance to next prompt</span></div>
            <div className={`switch ${s.autoAdvance?'on':''}`} onClick={() => set('autoAdvance', !s.autoAdvance)}></div>
          </div>

          <div className="setting-row">
            <div className="lbl"><span className="name">Session history</span><span className="v">{history.length} of 20</span></div>
            <SessionsTrend history={history} />
          </div>

          <div className="setting-row">
            <button className="btn" style={{ background: 'rgba(244,63,94,0.12)', borderColor:'rgba(244,63,94,0.35)', color:'#fb7185', width: '100%', justifyContent: 'center' }} onClick={() => {
              if (confirm('Reset all progress? This cannot be undone.')) onResetProgress();
            }}>Reset progress</button>
          </div>

        </div>
      </div>
    </>
  );
}

function SessionsTrend({ history }) {
  if (!history.length) {
    return <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '8px 0' }}>No sessions yet. Finish a run to build a trend.</div>;
  }
  const data = history.slice(-20).map(h => h.wpm);
  const max = Math.max(...data, 60);
  const min = Math.min(...data, 0);
  const w = 360, h = 90, pad = 10;
  const stepX = (w - pad*2) / Math.max(1, data.length - 1);
  const yOf = v => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad*2);
  const pts = data.map((v, i) => [pad + i * stepX, yOf(v)]);
  const path = pts.map((p, i) => (i===0?'M':'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pad + (data.length-1) * stepX} ${h-pad} L ${pad} ${h-pad} Z`;

  return (
    <div style={{ marginTop: 8 }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139,92,246,0.35)"/>
            <stop offset="100%" stopColor="rgba(139,92,246,0)"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)"/>
        <path d={path} fill="none" stroke="url(#trendStroke)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.4}
            fill={i === pts.length - 1 ? '#fff' : '#a78bfa'}
            stroke={i === pts.length - 1 ? '#8b5cf6' : 'none'}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
        <span>min {min}</span>
        <span>last {data[data.length-1]} wpm</span>
        <span>best {max}</span>
      </div>
    </div>
  );
}

window.SettingsDrawer = SettingsDrawer;
