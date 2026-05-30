import { useRef, useEffect, useMemo } from 'preact/hooks';
import {
  prompt, pos, errorIdx, mode, refresherActive,
  settings, zen, startTs,
} from '../lib/store';
import { FINGER_MAP } from '../lib/data';
import { isLesson, isChallenge } from '../lib/types';

function buildWords() {
  const chars = prompt.value.split('');
  const cur = pos.value;
  // Find which "word index" the cursor sits in.
  let curWordIdx = -1;
  let ci = 0;
  for (let i = 0; i < chars.length; i++) {
    if (i === cur) { curWordIdx = ci; break; }
    if (chars[i] === ' ' || chars[i] === '\n') ci++;
  }
  if (curWordIdx === -1) curWordIdx = ci;

  ci = 0;
  let curWord: number[] = [];
  const words: { indices: number[]; idx: number }[] = [];
  for (let i = 0; i < chars.length; i++) {
    curWord.push(i);
    if (chars[i] === ' ' || chars[i] === '\n' || i === chars.length - 1) {
      words.push({ indices: curWord, idx: ci });
      curWord = [];
      ci++;
    }
  }
  return { chars, words, curWordIdx };
}

function fingerInstruction(): string {
  if (pos.value >= prompt.value.length) return 'Session finished!';
  const expected = prompt.value[pos.value];
  const finger = FINGER_MAP[expected] || 'Index Finger';
  return `👉 Stroke with your ${finger}`;
}

export function TypingCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Mouse-parallax tilt (cleared on mouseleave).
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      const r = el!.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 6;
      const ry = (x - 0.5) * 8;
      el!.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
      el!.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el!.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    }
    function onLeave() { el!.style.transform = 'rotateX(0) rotateY(0)'; }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Auto-scroll: keep current char in view.
  useEffect(() => {
    const root = cardRef.current?.querySelector('.typing-text') as HTMLElement | null;
    if (!root) return;
    const curEl = root.querySelector('.ch.cur') as HTMLElement | null;
    if (!curEl) return;
    const tr = root.getBoundingClientRect();
    const cr = curEl.getBoundingClientRect();
    if (cr.top > tr.top + tr.height * 0.6) {
      root.scrollTop += cr.top - tr.top - tr.height * 0.3;
    }
  });

  const m = mode.value;
  const tagLabel = refresherActive.value
    ? 'Adaptive Misses Refresher'
    : (isLesson(m) ? m.title : isChallenge(m) ? m.label : m.label);

  const curRaw = prompt.value[pos.value] || '';
  const curDisplay = curRaw === ' ' ? '␣' : curRaw === '\n' ? '⏎' : curRaw === '\t' ? '⇥' : curRaw;

  // Build word/char DOM only when prompt or pos changes — but Preact will
  // rebuild on any read of pos/prompt/errorIdx, which is what we want here.
  const { chars, words, curWordIdx } = useMemo(
    () => buildWords(),
    [prompt.value, pos.value]
  );

  return (
    <div class="typing-stage">
      <div class="typing-card" ref={cardRef} style={{
        fontFamily: `${settings.value.font}, "JetBrains Mono", monospace`,
        fontSize: settings.value.fontSize + 'px',
      }}>
        <div class="tilt-glare" />
        <div class="typing-mode-tag">
          <span class="pulse" />{' '}{tagLabel}
        </div>

        <div class="active-char-display">
          <span class="pop">{curDisplay}</span>
        </div>

        {zen.value && startTs.value ? (
          <div class="typing-text" style={{
            fontFamily: `${settings.value.font}, "JetBrains Mono", monospace`,
            fontSize: settings.value.fontSize + 'px',
            textAlign: 'center', padding: '40px 0', color: 'var(--text-2)',
          }}>
            <div style="font-size:18px;opacity:0.7">zen mode · stats hidden</div>
            <div style="margin-top:16px;font-size:48px;font-family:var(--font-mono)">◐ ◑ ◒ ◓</div>
          </div>
        ) : (
          <div class="typing-text" style={{
            fontFamily: `${settings.value.font}, "JetBrains Mono", monospace`,
            fontSize: settings.value.fontSize + 'px',
          }}>
            {words.map(word => {
              if (!settings.value.nextPreview && word.idx > curWordIdx + 1) return null;
              const isNextWord = word.idx > curWordIdx + 2;
              return (
                <span class={'word' + (isNextWord ? ' next' : '')} key={word.idx}>
                  {word.indices.map(i => {
                    let cls = '';
                    if (i < pos.value) cls = errorIdx.value.has(i) ? 'wrong' : 'done';
                    else if (i === pos.value) cls = 'cur';
                    const raw = chars[i];
                    const out = raw === '\n' ? '⏎\n'
                              : raw === '\t' ? '⇥\t'
                              : raw === '\b' ? '⌫'
                              : raw;
                    return <span class={'ch ' + cls} data-idx={i} key={i}>{out}</span>;
                  })}
                </span>
              );
            })}
          </div>
        )}

        <div class="finger-cue">
          <span>{fingerInstruction()}</span>
        </div>

        <div class="typing-foot">
          <div style="display:flex;align-items:center;gap:14px">
            <span>Press any key to begin</span>
            <span style="color:var(--text-3)">·</span>
            <span><kbd>Tab</kbd> to restart</span>
            <span style="color:var(--text-3)">·</span>
            <span><kbd>Esc</kbd> to reset</span>
          </div>
          <div style="color:var(--text-3)">{pos.value}/{prompt.value.length} chars</div>
        </div>
      </div>
    </div>
  );
}
