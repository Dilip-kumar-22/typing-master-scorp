import { describe, it, expect } from 'vitest';
import {
  buildPrompt, generateFromCustomKeys, buildLiteralPrompt,
  LESSONS, CHALLENGES, SENTENCES,
} from '../src/lib/data';

describe('buildPrompt', () => {
  it('beginner pool produces requested word count', () => {
    const p = buildPrompt({ id: 'x', label: 'x', src: 'beginner', desc: '' } as any, 14);
    expect(p.split(' ').length).toBe(14);
  });

  it('sentence challenge returns one entry verbatim', () => {
    const p = buildPrompt({ id: 'expert-sentences', label: 'x', src: 'expert', desc: '', sentences: true }, 1);
    expect(SENTENCES.expert).toContain(p);
  });

  it('unknown src falls back to beginner', () => {
    const p = buildPrompt({ id: 'x', label: 'x', src: 'totally-fake', desc: '' } as any, 5);
    expect(p.split(' ').length).toBe(5);
  });

  it('null mode returns non-empty default', () => {
    expect(buildPrompt(null as any, 14).length).toBeGreaterThan(0);
  });
});

describe('Daily challenge — B-8 regression', () => {
  it('paragraph pool has ≥12 entries', () => {
    expect(SENTENCES.paragraph.length).toBeGreaterThanOrEqual(12);
  });

  it('daily seed deterministic within a calendar day', () => {
    const a = buildPrompt({ id: 'daily', label: 'd', src: 'daily', desc: '' }, 1);
    const b = buildPrompt({ id: 'daily', label: 'd', src: 'daily', desc: '' }, 1);
    expect(a).toBe(b);
  });
});

describe('generateFromCustomKeys', () => {
  it('only emits chars from the active key set', () => {
    const keys = new Set(['a', 's', 'd', 'f']);
    const out = generateFromCustomKeys(keys, 8);
    for (const c of out.replace(/ /g, '')) {
      expect(keys.has(c)).toBe(true);
    }
  });

  it('special-only set falls back to home row', () => {
    const out = generateFromCustomKeys(new Set([' ', '\t', '\n']), 4);
    expect(out.length).toBeGreaterThan(0);
  });

  it('produces requested word count', () => {
    expect(generateFromCustomKeys(new Set(['a', 's']), 10).split(' ').length).toBe(10);
  });
});

describe('buildLiteralPrompt — fluency/sentence lessons use real text', () => {
  it('returns a sentence entry verbatim when the pool has sentences', () => {
    const pool = ['The sun rose over the hills.', 'We can finish this today.'];
    const out = buildLiteralPrompt(pool, 20);
    expect(pool).toContain(out);
  });

  it('concatenates short word entries up to the target word count', () => {
    const out = buildLiteralPrompt(['fall', 'pass', 'tree'], 10);
    const words = out.split(' ').filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(10);
    for (const w of words) expect(['fall', 'pass', 'tree']).toContain(w);
  });

  it('never produces random-letter soup (output chars come from the pool)', () => {
    const pool = ['coffee', 'butter', 'green'];
    const out = buildLiteralPrompt(pool, 8);
    // every non-space run must be one of the real words
    for (const w of out.split(' ').filter(Boolean)) expect(pool).toContain(w);
  });

  it('empty pool returns empty string (no crash)', () => {
    expect(buildLiteralPrompt([], 10)).toBe('');
  });

  it('literal lessons render real words, not scrambled characters', () => {
    // Regression: lessons with real-word pools must be flagged literal so the
    // store renders them verbatim instead of flattening to a char set.
    const ch40 = LESSONS.find(l => l.id === 'lesson-40')!;
    expect(ch40.literal).toBe(true);
    const out = buildLiteralPrompt(ch40.pool, 20);
    expect(ch40.pool).toContain(out); // a whole sentence, verbatim
  });
});

describe('LESSONS — curriculum data integrity', () => {
  it('every lesson has id/title/subtitle/instructions/keys/pool', () => {
    for (const l of LESSONS) {
      expect(l.id).toBeTruthy();
      expect(l.title).toBeTruthy();
      expect(l.subtitle).toBeTruthy();
      expect(l.instructions).toBeTruthy();
      expect(l.keys).toBeTruthy();
      expect(Array.isArray(l.pool) && l.pool.length > 0).toBe(true);
    }
  });

  it('lesson-7 pool uses only chars declared in lesson-7.keys (B-9)', () => {
    const l7 = LESSONS.find(l => l.id === 'lesson-7')!;
    const allowed = new Set(l7.keys.split(''));
    for (const word of l7.pool) {
      for (const c of word) {
        expect(allowed.has(c)).toBe(true);
      }
    }
  });

  it('lesson ids are unique', () => {
    const ids = LESSONS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('curriculum is at least 40 chapters', () => {
    // Phase-4 expanded 10 → 32; a later session added Track 7 (33–40).
    expect(LESSONS.length).toBeGreaterThanOrEqual(40);
  });

  it('new Track-7 lessons (33–40) have well-formed prompt pools', () => {
    // Track 7 lessons use `keys` as a focus set (like lessons 9+), so pools are
    // NOT key-bounded. We just assert each new pool entry is a non-empty string
    // and the pools are reasonably sized — guards against an empty/blank prompt
    // slipping into the freshly-added chapters.
    const track7 = LESSONS.filter(l => {
      const n = parseInt(l.id.replace('lesson-', ''), 10);
      return n >= 33 && n <= 40;
    });
    expect(track7.length).toBe(8);
    for (const l of track7) {
      expect(l.pool.length).toBeGreaterThanOrEqual(6);
      for (const p of l.pool) {
        expect(typeof p === 'string' && p.trim().length > 0).toBe(true);
      }
    }
  });

  it('every lesson has a multi-paragraph guide', () => {
    for (const l of LESSONS) {
      expect(Array.isArray(l.guide), 'missing guide in ' + l.id).toBe(true);
      expect((l.guide || []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('lesson titles start with "Chapter N:" in sequence', () => {
    LESSONS.forEach((l, idx) => {
      expect(l.title.startsWith(`Chapter ${idx + 1}:`)).toBe(true);
    });
  });

  it('CHALLENGES present', () => {
    expect(CHALLENGES.length).toBeGreaterThan(0);
  });
});
