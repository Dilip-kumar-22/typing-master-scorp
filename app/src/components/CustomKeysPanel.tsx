import { customKeys, restart } from '../lib/store';
import { toggleInSet } from '../lib/utils';

const ROWS: { keys: string[]; pad: number }[] = [
  { keys: '1234567890'.split(''),   pad: 0 },
  { keys: 'qwertyuiop'.split(''),   pad: 0 },
  { keys: 'asdfghjkl'.split(''),    pad: 10 },
  { keys: 'zxcvbnm'.split(''),      pad: 24 },
  { keys: "-=[]\\;',./`".split(''), pad: 0 },
];
const SPECIALS = [
  { label: 'Tab',     k: '\t', flex: 1.2 },
  { label: 'Space',   k: ' ',  flex: 2.8 },
  { label: 'Enter',   k: '\n', flex: 1.4 },
  { label: '⌫ Bksp',  k: '\b', flex: 1.4 },
];

export function CustomKeysPanel() {
  const ks = customKeys.value;
  function toggle(k: string) { customKeys.value = toggleInSet(ks, k); }

  function preset(p: string) {
    let next = new Set(ks);
    if (p === 'letters') 'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => next.add(c));
    else if (p === 'numbers') '1234567890'.split('').forEach(c => next.add(c));
    else if (p === 'symbols') "-=[]\\;',./`".split('').forEach(c => next.add(c));
    else if (p === 'home') { next = new Set(); 'asdfghjkl'.split('').forEach(c => next.add(c)); }
    else if (p === 'space') next.add(' ');
    else if (p === 'clear') next = new Set();
    customKeys.value = next;
  }

  const preview = [...ks].slice(0, 10)
    .map(c => c === ' ' ? '␣' : c === '\t' ? '⇥' : c === '\n' ? '⏎' : c === '\b' ? '⌫' : c)
    .join(' ').toUpperCase();

  return (
    <div class="custom-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:12px;color:var(--text-2);letter-spacing:0.16em;text-transform:uppercase;font-weight:600">
          Coordinate set · {ks.size} keys
        </div>
        <button class="btn ghost" style="font-size:11px;padding:6px 12px"
          onClick={() => { if (ks.size >= 2) restart(); }}>
          Regenerate
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        {ROWS.map(row => (
          <div style={`display:flex;gap:4px;padding-left:${row.pad}px`}>
            {row.keys.map(k => (
              <div
                class={'ck-mini-key' + (ks.has(k) ? ' on' : '')}
                onClick={() => toggle(k)}
              >{k.toUpperCase()}</div>
            ))}
          </div>
        ))}
        <div style="display:flex;gap:4px;margin-top:2px">
          {SPECIALS.map(s => (
            <div
              class={'ck-special' + (ks.has(s.k) ? ' on' : '')}
              style={`flex:${s.flex}`}
              onClick={() => toggle(s.k)}
            >{s.label}</div>
          ))}
        </div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--hairline);display:flex;flex-wrap:wrap;gap:4px">
        {[
          ['letters', 'All letters'],
          ['numbers', 'All numbers'],
          ['symbols', 'All symbols'],
          ['home', 'Home row'],
          ['space', '+ Space'],
          ['clear', 'Clear'],
        ].map(([id, label]) => (
          <button class="preset-chip" onClick={() => preset(id)}>{label}</button>
        ))}
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-3);font-family:var(--font-mono)">
        <span>{ks.size} keys active</span>
        <span style="color:var(--accent)">{preview}{ks.size > 10 ? '…' : ''}</span>
      </div>
    </div>
  );
}
