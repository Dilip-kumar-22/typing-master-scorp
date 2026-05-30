/* Typing area: char-by-char rendering with states + cursor + foot row. */

function TypingArea({ prompt, position, errors, modeLabel, fontFamily, fontSize, zen }) {
  const cardRef = React.useRef(null);
  // 3D mouse-parallax tilt
  const onMouseMove = (e) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;   // 0..1
    const y = (e.clientY - r.top)  / r.height;  // 0..1
    const rx = (0.5 - y) * 6;   // ±3deg
    const ry = (x - 0.5) * 8;   // ±4deg
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  };
  const onLeave = () => {
    const el = cardRef.current; if (!el) return;
    el.style.transform = 'rotateX(0) rotateY(0)';
  };

  // Build per-char render with classes
  const chars = useMemo(() => {
    return prompt.split('').map((ch, i) => {
      let cls = '';
      if (i < position) cls = errors.has(i) ? 'wrong' : 'done';
      else if (i === position) cls = 'cur';
      return { ch, cls, i };
    });
  }, [prompt, position, errors]);

  // Group by word for opacity hinting on upcoming words
  const wordChunks = useMemo(() => {
    const out = [];
    let cur = [];
    let wordCount = 0;
    let curWordIdx = 0;
    let inWord = true;
    for (const c of chars) {
      cur.push(c);
      if (c.ch === ' ' || c.ch === '\n') {
        out.push({ chars: cur, idx: wordCount });
        if (cur.some(cc => cc.cls === 'cur' || (cc.cls === '' ? false : true))) {
          // not used; just count
        }
        cur = [];
        wordCount++;
      }
    }
    if (cur.length) out.push({ chars: cur, idx: wordCount });
    // determine current word index
    let posIdx = 0;
    for (let i = 0; i < out.length; i++) {
      if (out[i].chars.some(cc => cc.i === position)) { curWordIdx = i; break; }
    }
    return { words: out, curWordIdx };
  }, [chars, position]);

  return (
    <div className="typing-stage">
    <div className="typing-card" ref={cardRef} onMouseMove={onMouseMove} onMouseLeave={onLeave}>
      <div className="tilt-glare"></div>
      <div className="typing-mode-tag">
        <span className="pulse"></span>
        {modeLabel}
      </div>
      <div
        className="typing-text"
        style={{ fontFamily: `${fontFamily}, ${'JetBrains Mono'}, monospace`, fontSize }}
      >
        {zen ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-2)' }}>
            <div style={{ fontSize: 18, opacity: 0.7 }}>zen mode · stats hidden</div>
            <div style={{ marginTop: 16, fontSize: 48, fontFamily: 'var(--font-mono)' }}>
              ◐ ◑ ◒ ◓
            </div>
          </div>
        ) : (
          wordChunks.words.map((w, wi) => (
            <span key={wi} className={`word ${wi > wordChunks.curWordIdx + 2 ? 'next' : ''}`}>
              {w.chars.map(c => (
                <span key={c.i} className={`ch ${c.cls}`}>{c.ch === '\n' ? '\u23CE\n' : c.ch}</span>
              ))}
            </span>
          ))
        )}
      </div>
      <div className="typing-foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>Press any key to begin</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span><kbd>Tab</kbd> to restart</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span><kbd>Esc</kbd> to reset</span>
        </div>
        <div style={{ color: 'var(--text-3)' }}>
          {position}/{prompt.length} chars
        </div>
      </div>
    </div>
    </div>
  );
}

window.TypingArea = TypingArea;
