import { describe, it, expect } from 'vitest';
import {
  canManage, roleOutranks, seatsAvailable, canAddMembers,
  genInviteCode, normalizeInviteCode, isValidInviteCodeShape,
  buildRoster, type OrgRole, type RosterSessionRow,
} from '../src/lib/teams';

function seedRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe('teams — role gating', () => {
  it('canManage: owner + teacher yes, student + null no', () => {
    expect(canManage('owner')).toBe(true);
    expect(canManage('teacher')).toBe(true);
    expect(canManage('student')).toBe(false);
    expect(canManage(null)).toBe(false);
    expect(canManage(undefined)).toBe(false);
  });

  it('roleOutranks: strict higher-rank-only', () => {
    expect(roleOutranks('owner', 'teacher')).toBe(true);
    expect(roleOutranks('owner', 'student')).toBe(true);
    expect(roleOutranks('teacher', 'student')).toBe(true);
    expect(roleOutranks('teacher', 'owner')).toBe(false);
    expect(roleOutranks('student', 'student')).toBe(false);
    expect(roleOutranks('teacher', 'teacher')).toBe(false);
  });
});

describe('teams — seat math', () => {
  it('seatsAvailable never goes negative', () => {
    expect(seatsAvailable(10, 3)).toBe(7);
    expect(seatsAvailable(10, 10)).toBe(0);
    expect(seatsAvailable(10, 15)).toBe(0);
  });
  it('canAddMembers respects remaining seats', () => {
    expect(canAddMembers(10, 9, 1)).toBe(true);
    expect(canAddMembers(10, 10, 1)).toBe(false);
    expect(canAddMembers(10, 5, 5)).toBe(true);
    expect(canAddMembers(10, 5, 6)).toBe(false);
  });
});

describe('teams — invite codes', () => {
  it('genInviteCode produces AAA-AAA shape with unambiguous alphabet', () => {
    const code = genInviteCode(seedRng(1));
    expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    // no ambiguous chars
    expect(code).not.toMatch(/[01OIL]/);
  });

  it('genInviteCode is deterministic under a seeded RNG', () => {
    expect(genInviteCode(seedRng(42))).toBe(genInviteCode(seedRng(42)));
  });

  it('normalizeInviteCode uppercases, strips junk, re-inserts the dash', () => {
    expect(normalizeInviteCode('abc-def')).toBe('ABC-DEF');
    expect(normalizeInviteCode('abc def')).toBe('ABC-DEF');
    expect(normalizeInviteCode('a b c d e f')).toBe('ABC-DEF');
    expect(normalizeInviteCode('ABCDEF')).toBe('ABC-DEF');
  });

  it('isValidInviteCodeShape accepts good, rejects bad', () => {
    expect(isValidInviteCodeShape('ABC-DEF')).toBe(true);
    expect(isValidInviteCodeShape('abcdef')).toBe(true);   // normalized first
    expect(isValidInviteCodeShape('ABC-DE')).toBe(false);  // too short
    expect(isValidInviteCodeShape('ABCD-EFG')).toBe(false); // too long
  });

  it('a generated code round-trips through normalize unchanged', () => {
    const code = genInviteCode(seedRng(7));
    expect(normalizeInviteCode(code)).toBe(code);
    expect(isValidInviteCodeShape(code)).toBe(true);
  });
});

describe('teams — buildRoster aggregation', () => {
  const members: { user_id: string; role: OrgRole }[] = [
    { user_id: 'u-teacher', role: 'teacher' },
    { user_id: 'u-alice',   role: 'student' },
    { user_id: 'u-bob',     role: 'student' },
    { user_id: 'u-quiet',   role: 'student' },
  ];
  const names = new Map([
    ['u-teacher', 'Ms. Frizzle'],
    ['u-alice', 'Alice'],
    ['u-bob', 'Bob'],
    ['u-quiet', 'Quiet Kid'],
  ]);
  const sessions: RosterSessionRow[] = [
    { user_id: 'u-alice', wpm: 60, acc: 98, created_at: '2026-05-20T10:00:00Z' },
    { user_id: 'u-alice', wpm: 72, acc: 96, created_at: '2026-05-27T10:00:00Z' },
    { user_id: 'u-bob',   wpm: 45, acc: 90, created_at: '2026-05-25T10:00:00Z' },
    { user_id: 'u-teacher', wpm: 110, acc: 99, created_at: '2026-05-28T10:00:00Z' },
    // u-quiet has no sessions
  ];

  it('teachers/owners sort first, then by best WPM desc', () => {
    const r = buildRoster(members, names, sessions);
    expect(r[0].user_id).toBe('u-teacher'); // teacher first regardless of WPM
    // remaining are students by best WPM desc: alice(72) > bob(45) > quiet(0)
    expect(r.slice(1).map(x => x.user_id)).toEqual(['u-alice', 'u-bob', 'u-quiet']);
  });

  it('computes best WPM, avg accuracy, session count, last-active', () => {
    const r = buildRoster(members, names, sessions);
    const alice = r.find(x => x.user_id === 'u-alice')!;
    expect(alice.best_wpm).toBe(72);
    expect(alice.avg_acc).toBe(97);           // round((98+96)/2)
    expect(alice.sessions).toBe(2);
    expect(alice.last_active).toBe(Date.parse('2026-05-27T10:00:00Z'));
  });

  it('a member with no sessions shows zeros + null last-active', () => {
    const r = buildRoster(members, names, sessions);
    const quiet = r.find(x => x.user_id === 'u-quiet')!;
    expect(quiet.best_wpm).toBe(0);
    expect(quiet.avg_acc).toBe(0);
    expect(quiet.sessions).toBe(0);
    expect(quiet.last_active).toBeNull();
  });

  it('falls back to "Member" when a display name is missing', () => {
    const r = buildRoster([{ user_id: 'u-x', role: 'student' }], new Map(), []);
    expect(r[0].display_name).toBe('Member');
  });
});
