import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, applyBackup } from '../src/lib/backup';

describe('backup export/import', () => {
  it('builds a backup from stored values, parsing JSON where possible', () => {
    const store: Record<string, string> = {
      typing_master_v2: JSON.stringify({ history: [{ wpm: 50 }] }),
      typing_master_locale: 'fr',
    };
    const b = buildBackup(k => store[k] ?? null, '2026-07-01T00:00:00Z');
    expect(b.magic).toBe('typing-master-backup');
    expect(b.data.typing_master_v2).toEqual({ history: [{ wpm: 50 }] });
    expect(b.data.typing_master_locale).toBe('fr');
    expect(b.exportedAt).toBe('2026-07-01T00:00:00Z');
  });

  it('round-trips: build → stringify → parse → apply restores the same data', () => {
    const store: Record<string, string> = {
      typing_master_v2: JSON.stringify({ history: [{ wpm: 42 }], practiceDays: ['2026-07-01'] }),
    };
    const json = JSON.stringify(buildBackup(k => store[k] ?? null, 'now'));
    const parsed = parseBackup(json);
    const out: Record<string, string> = {};
    const n = applyBackup(parsed, (k, v) => { out[k] = v; });
    expect(n).toBe(1);
    expect(JSON.parse(out.typing_master_v2).history[0].wpm).toBe(42);
  });

  it('rejects a non-backup file', () => {
    expect(() => parseBackup('{"hello":"world"}')).toThrow(/not a Typing Master backup/);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('not json {')).toThrow(/not valid JSON/);
  });

  it('ignores unknown keys in the data payload', () => {
    const evil = JSON.stringify({
      magic: 'typing-master-backup', version: 1, data: { typing_master_v2: {}, hacker_key: 'x' },
    });
    const parsed = parseBackup(evil);
    expect('hacker_key' in parsed.data).toBe(false);
    expect('typing_master_v2' in parsed.data).toBe(true);
  });
});
