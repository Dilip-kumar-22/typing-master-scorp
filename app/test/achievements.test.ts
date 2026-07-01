import { describe, it, expect } from 'vitest';
import { computeStreak, computeAchievements } from '../src/lib/achievements';
import type { Session, KeyStats } from '../src/lib/types';

const sess = (wpm: number, acc = 95): Session => ({ date: 1, modeId: 'l', modeLabel: 'x', wpm, acc, time: 30 });

describe('computeStreak', () => {
  it('is zero with no days', () => {
    expect(computeStreak([], '2026-07-01')).toEqual({ current: 0, longest: 0, daysTotal: 0 });
  });

  it('counts a consecutive current streak ending today', () => {
    const s = computeStreak(['2026-06-29', '2026-06-30', '2026-07-01'], '2026-07-01');
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.daysTotal).toBe(3);
  });

  it('keeps the streak alive if today not yet practised but yesterday was', () => {
    const s = computeStreak(['2026-06-30', '2026-07-01'], '2026-07-02');
    expect(s.current).toBe(2); // counts back from yesterday
  });

  it('breaks the current streak on a gap but records the longest run', () => {
    const s = computeStreak(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-20'], '2026-06-20');
    expect(s.longest).toBe(3);
    expect(s.current).toBe(1); // only the 20th connects to today
  });

  it('dedupes duplicate day entries', () => {
    const s = computeStreak(['2026-07-01', '2026-07-01'], '2026-07-01');
    expect(s.daysTotal).toBe(1);
    expect(s.current).toBe(1);
  });
});

describe('computeAchievements', () => {
  const base = {
    keyStats: {} as KeyStats, completedLessons: [] as string[],
    practiceDays: [] as string[], totalChapters: 41, today: '2026-07-01',
  };

  it('unlocks First Steps after one session, locks the rest', () => {
    const { badges } = computeAchievements({ ...base, history: [sess(20)] });
    const first = badges.find(b => b.id === 'first_steps')!;
    expect(first.unlocked).toBe(true);
    expect(badges.find(b => b.id === 'wpm_60')!.unlocked).toBe(false);
  });

  it('unlocks WPM badges by best WPM', () => {
    const { badges } = computeAchievements({ ...base, history: [sess(65)] });
    expect(badges.find(b => b.id === 'wpm_40')!.unlocked).toBe(true);
    expect(badges.find(b => b.id === 'wpm_60')!.unlocked).toBe(true);
    expect(badges.find(b => b.id === 'wpm_80')!.unlocked).toBe(false);
  });

  it('flawless needs a 100% run', () => {
    expect(computeAchievements({ ...base, history: [sess(50, 99)] }).badges.find(b => b.id === 'flawless')!.unlocked).toBe(false);
    expect(computeAchievements({ ...base, history: [sess(50, 100)] }).badges.find(b => b.id === 'flawless')!.unlocked).toBe(true);
  });

  it('graduate target follows totalChapters and shows progress', () => {
    const { badges } = computeAchievements({
      ...base, history: [sess(30)], completedLessons: Array(20).fill('x'), totalChapters: 41,
    });
    const grad = badges.find(b => b.id === 'graduate')!;
    expect(grad.unlocked).toBe(false);
    expect(grad.progressLabel).toBe('20 / 41');
  });

  it('sorts unlocked badges first', () => {
    const { badges } = computeAchievements({ ...base, history: [sess(45)] });
    // at least one unlocked; the first should be unlocked
    expect(badges[0].unlocked).toBe(true);
  });
});
