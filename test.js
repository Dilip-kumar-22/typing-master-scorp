/* test.js — Unit tests for Typing Master math and prompt builders.
 *
 * Run with:  node test.js
 *
 * No test framework dependency — uses node's built-in assert.
 * jsdom is only used to give app.js a DOM to attach to; the assertions
 * are against pure functions exposed on window.
 */

const fs   = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

// ─── BOOT THE APP IN A FAKE DOM ────────────────────────
const html    = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dataJs  = fs.readFileSync(path.join(__dirname, 'data.js'),    'utf8');
const audioJs = fs.readFileSync(path.join(__dirname, 'audio.js'),   'utf8');
const appJs   = fs.readFileSync(path.join(__dirname, 'app.js'),     'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const win = dom.window;

// Stub the things app.js touches that jsdom doesn't ship.
win.matchMedia = win.matchMedia || (() => ({
  matches: false, addEventListener() {}, removeEventListener() {},
}));
win.AudioContext = function () {
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator() { return { connect: () => ({ connect() {} }), start() {}, stop() {}, frequency: { setValueAtTime() {} }, type: '' }; },
    createGain()       { return { connect: () => ({ connect() {} }), gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; },
    resume() {},
  };
};
win.requestAnimationFrame = (cb) => setTimeout(cb, 0);

win.eval(dataJs);
win.eval(audioJs);
win.eval(appJs);

// ─── TINY TEST RUNNER ─────────────────────────────────
let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \x1b[32m✓\x1b[0m ' + name);
  } catch (e) {
    failed++;
    failures.push({ name, err: e });
    console.log('  \x1b[31m✗\x1b[0m ' + name);
    console.log('    \x1b[31m' + (e.message || e) + '\x1b[0m');
  }
}
function group(label, fn) {
  console.log('\n\x1b[36m' + label + '\x1b[0m');
  fn();
}

// ─── METRICS ──────────────────────────────────────────
group('computeMetrics — accuracy, WPM, raw WPM', () => {
  const cm = win.computeMetrics;

  test('empty typing: 100% accuracy, 0 WPM', () => {
    const m = cm({ pos: 0, errorIdxSize: 0, errorCount: 0, elapsedSec: 0, promptLength: 10 });
    assert.strictEqual(m.acc, 100);
    assert.strictEqual(m.wpm, 0);
    assert.strictEqual(m.rawWpm, 0);
    assert.strictEqual(m.progress, 0);
  });

  test('perfect typing: 100% accuracy', () => {
    const m = cm({ pos: 10, errorIdxSize: 0, errorCount: 0, elapsedSec: 6, promptLength: 10 });
    assert.strictEqual(m.acc, 100);
    assert.strictEqual(m.progress, 1);
  });

  test('typed 10 chars in 6s → 20 WPM (10/5 chars-per-word ÷ 0.1 min)', () => {
    const m = cm({ pos: 10, errorIdxSize: 0, errorCount: 0, elapsedSec: 6, promptLength: 20 });
    assert.strictEqual(m.wpm, 20);
  });

  test('B-1: backspace-corrected error recovers accuracy', () => {
    // User typed 10 chars, made 1 error then corrected it → errorIdxSize back to 0,
    // but errorCount stays 1 (lifetime). Accuracy should be 100%, not 91%.
    const m = cm({ pos: 10, errorIdxSize: 0, errorCount: 1, elapsedSec: 6, promptLength: 10 });
    assert.strictEqual(m.acc, 100, 'expected accuracy to recover after correction');
  });

  test('uncorrected error reduces accuracy', () => {
    const m = cm({ pos: 10, errorIdxSize: 2, errorCount: 2, elapsedSec: 6, promptLength: 10 });
    assert.strictEqual(m.acc, 80);
  });

  test('rawWPM counts every keypress including errors', () => {
    const m = cm({ pos: 10, errorIdxSize: 5, errorCount: 5, elapsedSec: 6, promptLength: 20 });
    // raw = (pos + errorCount) / 5 / minutes = (10+5)/5 / 0.1 = 30
    assert.strictEqual(m.rawWpm, 30);
  });

  test('accuracy never goes negative or above 100', () => {
    const m1 = cm({ pos: 5, errorIdxSize: 99, errorCount: 99, elapsedSec: 6, promptLength: 5 });
    assert.ok(m1.acc >= 0 && m1.acc <= 100);
    const m2 = cm({ pos: 1, errorIdxSize: 0, errorCount: 0, elapsedSec: 0.01, promptLength: 1 });
    assert.ok(m2.acc >= 0 && m2.acc <= 100);
  });

  test('progress is 0..1', () => {
    const m = cm({ pos: 25, errorIdxSize: 0, errorCount: 0, elapsedSec: 10, promptLength: 100 });
    assert.strictEqual(m.progress, 0.25);
  });
});

// ─── ESCAPE HTML ──────────────────────────────────────
group('escapeHTML — XSS guard', () => {
  const e = win.escapeHTML;
  test('escapes < > & " \' chars', () => {
    assert.strictEqual(e('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.strictEqual(e('a & b'), 'a &amp; b');
    assert.strictEqual(e('"hi"'), '&quot;hi&quot;');
    assert.strictEqual(e("it's"), 'it&#39;s');
  });
  test('null and undefined become empty string', () => {
    assert.strictEqual(e(null), '');
    assert.strictEqual(e(undefined), '');
  });
});

// ─── PROMPT BUILDERS ──────────────────────────────────
group('buildPrompt — word generation per mode', () => {
  test('beginner pool produces requested word count', () => {
    const p = win.buildPrompt({ src: 'beginner' }, 14);
    assert.strictEqual(p.split(' ').length, 14);
  });

  test('sentence challenge returns one sentence verbatim', () => {
    const p = win.buildPrompt({ sentences: true, src: 'expert' }, 1);
    assert.ok(win.SENTENCES.expert.includes(p));
  });

  test('unknown src falls back to beginner pool', () => {
    const p = win.buildPrompt({ src: 'totally-fake' }, 5);
    assert.strictEqual(p.split(' ').length, 5);
  });

  test('no mode returns a non-empty default', () => {
    const p = win.buildPrompt(null, 14);
    assert.ok(p.length > 0);
  });
});

group('Daily challenge — B-8 regression', () => {
  test('paragraph pool has more than 3 entries (post-fix)', () => {
    assert.ok(
      win.SENTENCES.paragraph.length >= 12,
      'expected ≥12 paragraphs so seeded-by-day rotation does not repeat every 3 days'
    );
  });

  test('daily seed is deterministic for the same date', () => {
    // Two calls in the same day → same output.
    const a = win.buildPrompt({ src: 'daily' }, 1);
    const b = win.buildPrompt({ src: 'daily' }, 1);
    assert.strictEqual(a, b);
  });
});

group('generateFromCustomKeys — custom-key prompt builder', () => {
  test('only emits chars from the active key set', () => {
    const keys = new Set(['a', 's', 'd', 'f']);
    const out = win.generateFromCustomKeys(keys, 8);
    const stripped = out.replace(/ /g, '');
    for (const c of stripped) {
      assert.ok(keys.has(c), `unexpected char "${c}" in output: ${out}`);
    }
  });

  test('special-only key set falls back to home-row safety pool', () => {
    const keys = new Set([' ', '\t', '\n']); // no letters
    const out = win.generateFromCustomKeys(keys, 4);
    assert.ok(out.length > 0);
  });

  test('produces requested word count', () => {
    const out = win.generateFromCustomKeys(new Set(['a', 's']), 10);
    assert.strictEqual(out.split(' ').length, 10);
  });
});

// ─── LESSON DATA SANITY ───────────────────────────────
group('LESSONS — curriculum data integrity', () => {
  test('every lesson has a stable id, title, subtitle, instructions, keys, pool', () => {
    for (const l of win.LESSONS) {
      assert.ok(l.id && typeof l.id === 'string', 'missing id');
      assert.ok(l.title, 'missing title in ' + l.id);
      assert.ok(l.subtitle, 'missing subtitle in ' + l.id);
      assert.ok(l.instructions, 'missing instructions in ' + l.id);
      assert.ok(l.keys, 'missing keys in ' + l.id);
      assert.ok(Array.isArray(l.pool) && l.pool.length > 0, 'empty pool in ' + l.id);
    }
  });

  test('lesson-7 pool uses keys declared in lesson-7.keys (B-9 regression)', () => {
    const l7 = win.LESSONS.find(l => l.id === 'lesson-7');
    const allowed = new Set(l7.keys.split(''));
    for (const word of l7.pool) {
      for (const c of word) {
        assert.ok(
          allowed.has(c),
          `lesson-7 pool entry "${word}" contains "${c}" not in declared keys "${l7.keys}"`
        );
      }
    }
  });

  test('lesson ids are unique', () => {
    const ids = win.LESSONS.map(l => l.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  test('curriculum has at least 32 chapters (Phase 4 expansion)', () => {
    assert.ok(win.LESSONS.length >= 32, `expected ≥32 lessons, got ${win.LESSONS.length}`);
  });

  test('every lesson carries a multi-paragraph guide', () => {
    for (const l of win.LESSONS) {
      assert.ok(Array.isArray(l.guide), 'missing guide in ' + l.id);
      assert.ok(l.guide.length >= 2, 'thin guide (< 2 paragraphs) in ' + l.id);
    }
  });

  test('titles follow "Chapter N:" sequence', () => {
    win.LESSONS.forEach((l, idx) => {
      assert.ok(l.title.startsWith(`Chapter ${idx + 1}:`),
        `lesson #${idx + 1} title is "${l.title}"`);
    });
  });
});

// ─── SUMMARY ──────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (failed === 0) {
  console.log(`\x1b[32m✓ ${passed} tests passed\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${failed} failed\x1b[0m, \x1b[32m${passed} passed\x1b[0m`);
  process.exit(1);
}
