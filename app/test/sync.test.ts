import { describe, it, expect } from 'vitest';
import { mergeSessions, unionStrings, toSession } from '../src/lib/sync';
import type { Session } from '../src/lib/types';

function s(date: number, modeId: string, wpm: number): Session {
  return { date, modeId, modeLabel: modeId, wpm, acc: 90, time: 30 };
}

describe('mergeSessions', () => {
  it('merges, de-dupes, and keeps newest 20 in chronological order', () => {
    const local = [s(100, 'a', 40), s(200, 'a', 42), s(300, 'b', 55)];
    const remote = [s(150, 'a', 41), s(200, 'a', 42), s(400, 'b', 60)];
    const merged = mergeSessions(local, remote);
    expect(merged.map(x => x.date)).toEqual([100, 150, 200, 300, 400]);
  });

  it('does NOT lose unique local-only sessions on sync', () => {
    const local = [s(100, 'a', 40)];
    const remote = [s(200, 'b', 55)];
    const merged = mergeSessions(local, remote);
    expect(merged).toHaveLength(2);
  });

  it('caps at 20 entries', () => {
    const many: Session[] = [];
    for (let i = 0; i < 50; i++) many.push(s(i * 1000, 'a', i));
    expect(mergeSessions(many, []).length).toBe(20);
  });

  it('returns oldest-first within the 20-cap window', () => {
    const many: Session[] = [];
    for (let i = 0; i < 50; i++) many.push(s(i * 1000, 'a', i));
    const merged = mergeSessions(many, []);
    expect(merged[0].date).toBeLessThan(merged[merged.length - 1].date);
  });

  it('handles empty inputs', () => {
    expect(mergeSessions([], [])).toEqual([]);
    const only = [s(1, 'a', 10)];
    expect(mergeSessions(only, [])).toEqual(only);
    expect(mergeSessions([], only)).toEqual(only);
  });
});

describe('unionStrings — monotonic-union for unlocked/completed lessons', () => {
  it('never shrinks the local set', () => {
    expect(unionStrings(['a', 'b', 'c'], null)).toEqual(['a', 'b', 'c']);
    expect(unionStrings(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  it('adds remote-only entries', () => {
    const out = unionStrings(['lesson-1'], ['lesson-1', 'lesson-2']);
    expect(out.sort()).toEqual(['lesson-1', 'lesson-2']);
  });

  it('preserves identity on duplicates', () => {
    const out = unionStrings(['x', 'y'], ['x', 'y']);
    expect(out.sort()).toEqual(['x', 'y']);
  });
});

describe('toSession — DB row to in-app Session', () => {
  it('maps fields and parses the ISO date', () => {
    const row = {
      mode_id: 'lesson-1',
      mode_label: 'Chapter 1',
      wpm: 55,
      acc: 96,
      time_sec: 42,
      created_at: '2026-05-27T12:00:00.000Z',
    };
    const out = toSession(row);
    expect(out).toMatchObject({
      modeId: 'lesson-1',
      modeLabel: 'Chapter 1',
      wpm: 55,
      acc: 96,
      time: 42,
    });
    expect(out.date).toBe(Date.parse('2026-05-27T12:00:00.000Z'));
  });
});
