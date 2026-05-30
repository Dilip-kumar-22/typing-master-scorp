import { describe, it, expect } from 'vitest';
import {
  buildPrompt, generateFromCustomKeys,
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

  it('curriculum is at least 32 chapters', () => {
    // Phase-4 follow-up expanded the curriculum from 10 → 32 lessons.
    expect(LESSONS.length).toBeGreaterThanOrEqual(32);
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
