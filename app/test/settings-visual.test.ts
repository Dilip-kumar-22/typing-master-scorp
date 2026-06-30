import { describe, it, expect, beforeEach } from 'vitest';
import {
  settings, updateSetting, applyVisualSettings, DEFAULT_SETTINGS,
} from '../src/lib/store';

// Regression test for the "theme toggle / settings tab does nothing" bug.
//
// Root cause (fixed): updateSetting() persisted the change and re-applied AUDIO
// but never re-applied the VISUAL settings, and applyVisualSettings() only ran
// once on mount. So changing theme/accent/font/cursor was saved but not painted
// until a reload. The reactive effect() in store.ts now repaints on every
// settings change; these tests lock that behavior in.

beforeEach(() => {
  // Reset to a known baseline before each assertion.
  settings.value = { ...DEFAULT_SETTINGS };
  applyVisualSettings();
});

describe('visual settings apply LIVE (no reload needed)', () => {
  it('changing theme updates body class immediately', () => {
    updateSetting('theme', 'light');
    expect(document.body.className).toContain('theme-light');

    updateSetting('theme', 'dark');
    expect(document.body.className).toContain('theme-dark');
    expect(document.body.className).not.toContain('theme-light');
  });

  it('changing accent updates body class immediately', () => {
    updateSetting('accent', 'cyan');
    expect(document.body.className).toContain('accent-cyan');

    updateSetting('accent', 'amber');
    expect(document.body.className).toContain('accent-amber');
    expect(document.body.className).not.toContain('accent-cyan');
  });

  it('changing cursor updates body class immediately', () => {
    updateSetting('cursor', 'block');
    expect(document.body.className).toContain('cursor-block');
  });

  it('changing accent updates the --accent CSS variable immediately', () => {
    updateSetting('accent', 'lime');
    const v = document.documentElement.style.getPropertyValue('--accent').trim();
    expect(v.toLowerCase()).toBe('#a3e635');
  });

  it('changing font size updates the --font-size-typing CSS variable immediately', () => {
    updateSetting('fontSize', 36);
    expect(document.documentElement.style.getPropertyValue('--font-size-typing').trim())
      .toBe('36px');
  });

  it('changing font updates the --font-mono CSS variable immediately', () => {
    updateSetting('font', 'Courier');
    expect(document.documentElement.style.getPropertyValue('--font-mono'))
      .toContain('Courier');
  });
});
