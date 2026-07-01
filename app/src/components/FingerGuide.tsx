import { useState, useEffect } from 'preact/hooks';
import { KB_ROWS, FINGER_MAP } from '../lib/data';
import type { KeyDef } from '../lib/types';
import { primerOpen, pickAndStart } from '../lib/store';
import { LESSONS } from '../lib/data';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useRef } from 'preact/hooks';

// ─── Finger → colour system ───────────────────────────────
// Eight fingers, eight colours. The thumbs share one. These are the ONLY
// colours on the primer keyboard, so a learner can glance at any key and know
// instantly "that one's mine — left ring finger". Chosen for hue separation
// AND for readable contrast against dark keycaps.
type Finger =
  | 'Left Pinky' | 'Left Ring' | 'Left Middle' | 'Left Index'
  | 'Right Index' | 'Right Middle' | 'Right Ring' | 'Right Pinky'
  | 'Thumb';

const FINGER_COLOR: Record<Finger, string> = {
  'Left Pinky':   '#f472b6', // pink
  'Left Ring':    '#c084fc', // violet
  'Left Middle':  '#60a5fa', // blue
  'Left Index':   '#34d399', // green
  'Right Index':  '#fbbf24', // amber
  'Right Middle': '#fb923c', // orange
  'Right Ring':   '#f87171', // red
  'Right Pinky':  '#22d3ee', // cyan
  'Thumb':        '#94a3b8', // slate
};

// The order fingers rest on the home row, left pinky → right pinky, for the
// legend and the little "hands" illustration.
const LEFT_FINGERS: Finger[]  = ['Left Pinky', 'Left Ring', 'Left Middle', 'Left Index'];
const RIGHT_FINGERS: Finger[] = ['Right Index', 'Right Middle', 'Right Ring', 'Right Pinky'];

// Which key each finger "lives on" — its home-row anchor. Used by the animated
// demo and the hand illustration.
const HOME_KEY: Record<Finger, string> = {
  'Left Pinky': 'a', 'Left Ring': 's', 'Left Middle': 'd', 'Left Index': 'f',
  'Right Index': 'j', 'Right Middle': 'k', 'Right Ring': 'l', 'Right Pinky': ';',
  'Thumb': ' ',
};

function fingerOf(key: string): Finger {
  const raw = FINGER_MAP[key] || FINGER_MAP[key.toLowerCase()] || '';
  if (raw.includes('Thumb')) return 'Thumb';
  // FINGER_MAP has values like "Left Pinky (Tab)" — strip the parenthetical.
  const base = raw.replace(/\s*\(.*\)$/, '') as Finger;
  return (FINGER_COLOR[base] ? base : 'Thumb');
}

// Short, friendly finger name for the cue line ("your left index").
function humanFinger(f: Finger): string {
  if (f === 'Thumb') return 'either thumb';
  return 'your ' + f.toLowerCase();
}

// ─── One colour-coded key ─────────────────────────────────
function GuideKey({ def, litKey }: { def: KeyDef; litKey: string }) {
  let label = '', char = '', w = '';
  if (Array.isArray(def)) { [char] = def; label = char; }
  else { label = def.label; char = def.code; w = def.w || ''; }

  const lower = (Array.isArray(def) ? def[0] : '').toLowerCase();
  const isSpace = !Array.isArray(def) && def.code === 'Space';
  const finger = isSpace ? 'Thumb' : (lower ? fingerOf(lower) : 'Thumb');
  const color = FINGER_COLOR[finger];
  const isLit = lower === litKey || (isSpace && litKey === ' ');
  // Only colour real character keys + space; modifiers stay neutral grey.
  const colourable = !!lower || isSpace;

  const style = colourable
    ? `--fg:${color};background:linear-gradient(180deg, ${color}38, ${color}18);border-color:${color}66;color:#fff`
    : 'opacity:0.4';

  return (
    <div
      class={'fgk ' + w + (isLit ? ' lit' : '') + (colourable ? '' : ' muted')}
      style={style}
      data-finger={finger}
    >
      <span>{label}</span>
    </div>
  );
}

// ─── The animated hint: cycles home-row keys and names the finger ─────────
const DEMO_KEYS = ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', ' '];

export function FingerGuide() {
  const [litIdx, setLitIdx] = useState(0);
  const litKey = DEMO_KEYS[litIdx];
  const litFinger = litKey === ' ' ? 'Thumb' : fingerOf(litKey);

  useEffect(() => {
    const id = setInterval(() => setLitIdx(i => (i + 1) % DEMO_KEYS.length), 1400);
    return () => clearInterval(id);
  }, []);

  const cueLabel = litKey === ' ' ? 'Space' : litKey.toUpperCase();

  return (
    <div class="finger-guide">
      {/* Live cue */}
      <div class="fg-cue" aria-live="polite">
        <span class="fg-cue-key" style={`--fg:${FINGER_COLOR[litFinger]}`}>{cueLabel}</span>
        <span class="fg-cue-arrow">is pressed by</span>
        <span class="fg-cue-finger" style={`color:${FINGER_COLOR[litFinger]}`}>
          {humanFinger(litFinger)}
        </span>
      </div>

      {/* Colour-coded keyboard */}
      <div class="fg-kb" role="img" aria-label="Keyboard with each key coloured by the finger that presses it">
        {KB_ROWS.map((row, ri) => (
          <div class="fg-row" key={ri}>
            {row.map((def, ki) => <GuideKey key={ki} def={def} litKey={litKey} />)}
          </div>
        ))}
      </div>

      {/* Two hands, home-row anchored, colour-matched to the keys */}
      <div class="fg-hands" aria-hidden="true">
        <Hand side="left" fingers={LEFT_FINGERS} litFinger={litFinger} />
        <div class="fg-thumbs">
          <div class="fg-thumb" style={`--fg:${FINGER_COLOR.Thumb}`}
               data-on={litFinger === 'Thumb'}>space</div>
        </div>
        <Hand side="right" fingers={RIGHT_FINGERS} litFinger={litFinger} />
      </div>

      {/* Legend */}
      <div class="fg-legend">
        {[...LEFT_FINGERS, ...RIGHT_FINGERS].map(f => (
          <div class="fg-leg" key={f}>
            <span class="fg-dot" style={`background:${FINGER_COLOR[f]}`} />
            <span class="fg-leg-name">{f}</span>
            <span class="fg-leg-key">{HOME_KEY[f] === ' ' ? '␣' : HOME_KEY[f].toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// A simple hand: four dots (fingers) that light up when their finger is active.
function Hand({ side, fingers, litFinger }: { side: 'left' | 'right'; fingers: Finger[]; litFinger: Finger }) {
  return (
    <div class={'fg-hand fg-hand-' + side}>
      {fingers.map(f => (
        <span
          class="fg-finger"
          key={f}
          data-on={f === litFinger}
          style={`--fg:${FINGER_COLOR[f]}`}
          title={f}
        />
      ))}
    </div>
  );
}

// ─── The full Chapter-0 overlay ───────────────────────────
export function Primer() {
  if (!primerOpen.value) return null;
  const close = () => { primerOpen.value = false; };
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(cardRef, primerOpen.value);

  function beginFirstLesson() {
    const first = LESSONS[0];
    close();
    if (first) pickAndStart(first);
  }

  return (
    <div class="primer-overlay" role="dialog" aria-modal="true" aria-labelledby="primer-title" onClick={close}>
      <div class="primer-card" ref={cardRef} onClick={(e: Event) => e.stopPropagation()}>
        <div class="primer-head">
          <div>
            <div class="primer-eyebrow">Chapter 0 · Start here</div>
            <h2 id="primer-title">First, let your hands learn the map</h2>
          </div>
          <button class="close" onClick={close} aria-label="Close the intro">✕</button>
        </div>

        <div class="primer-body">
          <p>
            Here's the whole secret of touch typing, and it's smaller than people
            make it sound: <strong>every key has one finger whose job it is.</strong>
            Not "a hand" — one specific finger. Once your fingers know their own
            keys, you stop hunting and pecking, and you stop looking down.
          </p>

          <p>
            Rest your eight fingers lightly on the middle row —
            <span class="k">A</span><span class="k">S</span><span class="k">D</span><span class="k">F</span>
            for the left hand,
            <span class="k">J</span><span class="k">K</span><span class="k">L</span><span class="k">;</span>
            for the right. Feel the little bumps on <span class="k">F</span> and
            <span class="k">J</span>? Those are for your two index fingers — they let
            your hands find home in the dark. Thumbs hover over the space bar.
          </p>

          <p>
            Below, every key is painted with the colour of the finger that owns it.
            Watch the keys light up, one at a time, and notice which finger is
            being called. You don't have to memorise this — you'll <em>feel</em> it
            after a chapter or two. This is just so your eyes and your hands are
            introduced before they start working together.
          </p>

          <FingerGuide />

          <div class="primer-tips">
            <div class="primer-tip">
              <span class="pt-emoji" aria-hidden="true">👀</span>
              <div><strong>Eyes on the screen.</strong> Peeking at your hands feels
              faster today and keeps you slow forever. Trust the bumps on F and J.</div>
            </div>
            <div class="primer-tip">
              <span class="pt-emoji" aria-hidden="true">🐢</span>
              <div><strong>Slow is smooth, smooth is fast.</strong> Accuracy first.
              Speed is what accuracy turns into once it stops thinking.</div>
            </div>
            <div class="primer-tip">
              <span class="pt-emoji" aria-hidden="true">🎯</span>
              <div><strong>Same finger, same key, every time.</strong> That
              repetition is the entire game. Ten minutes a day beats an hour once a week.</div>
            </div>
          </div>

          <p class="primer-outro">
            That's it. That's the theory. Everything from here is just practice
            with a friendly guide. Ready when you are.
          </p>
        </div>

        <div class="primer-actions">
          <button class="btn ghost" onClick={close}>I'll explore first</button>
          <button class="btn primary lg" onClick={beginFirstLesson}>
            Start Chapter 1 →
          </button>
        </div>
      </div>
    </div>
  );
}
