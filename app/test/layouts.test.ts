import { describe, it, expect } from 'vitest';
import { KB_LAYOUTS, KB_LAYOUT_LIST, type KbLayoutId } from '../src/lib/layouts';

const LAYOUT_IDS: KbLayoutId[] = ['qwerty', 'azerty', 'qwertz', 'dvorak', 'colemak'];

describe('Keyboard layouts', () => {
  it('exposes all 5 layouts', () => {
    expect(KB_LAYOUT_LIST.map(l => l.id).sort()).toEqual([...LAYOUT_IDS].sort());
  });

  it('each layout has 5 rows + a name + a description', () => {
    for (const id of LAYOUT_IDS) {
      const l = KB_LAYOUTS[id];
      expect(l.name).toBeTruthy();
      expect(l.description).toBeTruthy();
      expect(l.rows.length).toBe(5);
    }
  });

  it('Dvorak layout has the canonical home row "aoeu dhtns"', () => {
    const homeRow = KB_LAYOUTS.dvorak.rows[2];
    const letters = homeRow
      .filter(k => Array.isArray(k))
      .map(k => (k as [string, string])[0])
      .join('');
    expect(letters).toBe('aoeuidhtns-');
  });

  it('Colemak layout keeps QWERTY ZXCV', () => {
    const bottomRow = KB_LAYOUTS.colemak.rows[3];
    const first4Letters = bottomRow
      .filter(k => Array.isArray(k))
      .slice(0, 4)
      .map(k => (k as [string, string])[0])
      .join('');
    expect(first4Letters).toBe('zxcv');
  });

  it('AZERTY top row starts with "azertyuiop"', () => {
    const topRow = KB_LAYOUTS.azerty.rows[1];
    const letters = topRow
      .filter(k => Array.isArray(k))
      .map(k => (k as [string, string])[0])
      .join('');
    expect(letters.slice(0, 10)).toBe('azertyuiop');
  });

  it('QWERTZ has Z and Y swapped relative to QWERTY', () => {
    const qwertzTop = KB_LAYOUTS.qwertz.rows[1]
      .filter(k => Array.isArray(k))
      .map(k => (k as [string, string])[0])
      .join('');
    // Position where QWERTY has 'y', QWERTZ has 'z'
    expect(qwertzTop[5]).toBe('z');
    // Position where QWERTY has 'z' (bottom-left letter), QWERTZ has 'y'.
    // The QWERTZ bottom row has an extra `<>` key inserted between Shift and
    // the first letter, so we grab the first alphabetic letter, not [0].
    const qwertzBottomLetters = KB_LAYOUTS.qwertz.rows[3]
      .filter(k => Array.isArray(k))
      .map(k => (k as [string, string])[0])
      .filter(c => /^[a-z]$/.test(c))
      .join('');
    expect(qwertzBottomLetters[0]).toBe('y');
  });
});
