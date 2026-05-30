/* Sidebar mode selector with expandable groups + custom-keys subpanel. */

function ModeSidebar({ activeModeId, onPick, openGroups, setOpenGroups, customKeys, onCustomToggle, onGenerateCustom }) {
  const toggle = (id) => {
    const s = new Set(openGroups);
    if (s.has(id)) s.delete(id); else s.add(id);
    setOpenGroups(s);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Practice Modes</h3>
        <span className="count-chip">{MODE_GROUPS.length}</span>
      </div>

      {MODE_GROUPS.map(g => {
        const open = openGroups.has(g.id);
        return (
          <div key={g.id} className={`mode-group ${open ? 'open' : ''}`}>
            <div className="mode-group-head" onClick={() => toggle(g.id)}>
              <div className="icon">{g.icon}</div>
              <div className="label">{g.label}</div>
              <div className="chev">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
            {open && (
              <div className="mode-group-body">
                {g.items.map(item => (
                  <div
                    key={item.id}
                    className={`mode-item ${activeModeId === item.id ? 'is-active' : ''}`}
                    onClick={() => onPick(item)}
                  >
                    <span className="dot"></span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.keys && <span className="badge">{item.keys.length}</span>}
                  </div>
                ))}
                {g.custom && (
                  <CustomKeysPanel
                    selected={customKeys}
                    onToggle={onCustomToggle}
                    onGenerate={onGenerateCustom}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

function CustomKeysPanel({ selected, onToggle, onGenerate }) {
  // Full keyboard rows: numbers, top, home, bottom + a "common symbols" row
  const rows = [
    { keys: '1234567890'.split(''),  pad: 0 },
    { keys: 'qwertyuiop'.split(''),  pad: 0 },
    { keys: 'asdfghjkl'.split(''),   pad: 10 },
    { keys: 'zxcvbnm'.split(''),     pad: 24 },
    { keys: '-=[]\\;\',./`'.split(''), pad: 0, sym: true },
  ];

  // Special keys with their internal representation
  const specials = [
    { label: 'Tab',   k: '\t', flex: 1.2 },
    { label: 'Space', k: ' ',  flex: 2.8 },
    { label: 'Enter', k: '\n', flex: 1.4 },
    { label: '⌫ Bksp',  k: '\b', flex: 1.4 },
  ];

  const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const ALL_NUMBERS = '1234567890'.split('');
  const ALL_SYMBOLS = '-=[]\\;\',./`'.split('');

  const addAll = (chars) => chars.forEach(c => { if (!selected.has(c)) onToggle(c); });
  const replaceWith = (chars) => {
    [...selected].forEach(c => onToggle(c));
    setTimeout(() => chars.forEach(c => onToggle(c)), 0);
  };
  const clearAll = () => { [...selected].forEach(c => onToggle(c)); };

  const chip = (label, action, active = false) => (
    <button
      key={label}
      onClick={action}
      style={{
        flex: '1 1 auto',
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer',
        border: '1px solid ' + (active ? 'rgba(167,139,250,0.5)' : 'var(--hairline)'),
        background: active
          ? 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(236,72,153,0.30))'
          : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : 'var(--text-2)',
        transition: 'all 0.16s ease',
      }}
    >{label}</button>
  );

  const keyCell = (k) => (
    <div
      key={k}
      onClick={() => onToggle(k)}
      style={{
        flex: 1,
        minWidth: 0,
        height: 26,
        borderRadius: 6,
        display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
        cursor: 'pointer',
        background: selected.has(k) ? 'linear-gradient(135deg, #22d3ee, #2dd4bf)' : 'rgba(255,255,255,0.04)',
        color: selected.has(k) ? '#04111a' : 'var(--text-2)',
        border: '1px solid ' + (selected.has(k) ? 'rgba(34,211,238,0.55)' : 'var(--hairline)'),
        boxShadow: selected.has(k) ? '0 2px 8px rgba(34,211,238,0.45)' : 'none',
        transition: 'all 0.14s ease',
      }}
    >{k.toUpperCase()}</div>
  );

  const specialCell = (s) => (
    <div
      key={s.label}
      onClick={() => onToggle(s.k)}
      style={{
        flex: s.flex,
        minWidth: 0,
        height: 26,
        borderRadius: 6,
        display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.06em',
        cursor: 'pointer',
        background: selected.has(s.k) ? 'linear-gradient(135deg, #a78bfa, #ec4899)' : 'rgba(255,255,255,0.04)',
        color: selected.has(s.k) ? '#fff' : 'var(--text-2)',
        border: '1px solid ' + (selected.has(s.k) ? 'rgba(167,139,250,0.55)' : 'var(--hairline)'),
        boxShadow: selected.has(s.k) ? '0 2px 8px rgba(139,92,246,0.45)' : 'none',
        transition: 'all 0.14s ease',
        textTransform: 'uppercase',
      }}
    >{s.label}</div>
  );

  return (
    <div style={{
      marginTop: 8, padding: 12,
      borderRadius: 12,
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid var(--hairline)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
        Tap keys to include
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, justifyContent: 'flex-start', paddingLeft: row.pad }}>
            {row.keys.map(keyCell)}
          </div>
        ))}
        {/* Specials row */}
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          {specials.map(specialCell)}
        </div>
      </div>

      {/* Preset chips */}
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: '1px dashed var(--hairline)',
        display: 'flex', flexWrap: 'wrap', gap: 4,
      }}>
        {chip('All letters', () => addAll(ALL_LETTERS))}
        {chip('All numbers', () => addAll(ALL_NUMBERS))}
        {chip('All symbols', () => addAll(ALL_SYMBOLS))}
        {chip('Home row',   () => replaceWith('asdfghjkl'.split('')))}
        {chip('+ Space',    () => { if (!selected.has(' ')) onToggle(' '); })}
        {chip('Clear', clearAll)}
      </div>

      <div style={{
        marginTop: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 10, color: 'var(--text-3)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
      }}>
        <span>{selected.size} key{selected.size === 1 ? '' : 's'} selected</span>
        {selected.size > 0 && (
          <span style={{ color: 'var(--violet-2)' }}>
            {[...selected].slice(0, 10).map(c => c === ' ' ? '␣' : c === '\t' ? '⇥' : c === '\n' ? '⏎' : c === '\b' ? '⌫' : c).join(' ').toUpperCase()}
            {selected.size > 10 ? '…' : ''}
          </span>
        )}
      </div>

      <button
        className="btn primary"
        style={{ width: '100%', marginTop: 10, justifyContent: 'center', fontSize: 12 }}
        onClick={onGenerate}
        disabled={selected.size < 2}
      >
        Generate from {selected.size} keys
      </button>
    </div>
  );
}

window.ModeSidebar = ModeSidebar;
