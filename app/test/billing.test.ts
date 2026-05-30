import { describe, it, expect } from 'vitest';
import { tierIncludes } from '../src/lib/billing';

describe('tierIncludes — Pro/Team gating helper', () => {
  it('Free user does NOT include Pro', () => {
    expect(tierIncludes('free', 'pro')).toBe(false);
    expect(tierIncludes('free', 'team')).toBe(false);
  });

  it('Free user includes Free', () => {
    expect(tierIncludes('free', 'free')).toBe(true);
  });

  it('Pro user includes Free and Pro but not Team', () => {
    expect(tierIncludes('pro', 'free')).toBe(true);
    expect(tierIncludes('pro', 'pro')).toBe(true);
    expect(tierIncludes('pro', 'team')).toBe(false);
  });

  it('Team user includes everything', () => {
    expect(tierIncludes('team', 'free')).toBe(true);
    expect(tierIncludes('team', 'pro')).toBe(true);
    expect(tierIncludes('team', 'team')).toBe(true);
  });
});
