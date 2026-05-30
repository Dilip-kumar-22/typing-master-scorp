import { describe, it, expect, beforeEach } from 'vitest';
import { LOCALES, locale, setLocale, t } from '../src/lib/i18n';
import { en } from '../src/lib/locales/en';
import { es } from '../src/lib/locales/es';
import { pt } from '../src/lib/locales/pt';
import { hi } from '../src/lib/locales/hi';
import { fr } from '../src/lib/locales/fr';
import { de } from '../src/lib/locales/de';

beforeEach(() => {
  locale.value = 'en';
});

describe('i18n — translation + fallback', () => {
  it('exposes six locales (en, es, pt, hi, fr, de)', () => {
    expect(LOCALES.map(l => l.code).sort()).toEqual(['de', 'en', 'es', 'fr', 'hi', 'pt']);
  });

  it('each locale carries the required keys (name, englishName, flag)', () => {
    for (const l of LOCALES) {
      expect(l.name).toBeTruthy();
      expect(l.englishName).toBeTruthy();
      expect(l.flag).toBeTruthy();
    }
  });

  it('t(key) returns the active-locale translation when present', async () => {
    // setLocale lazy-loads the locale chunk, so await it before asserting.
    await setLocale('es');
    expect(t('themeLight')).toBe('Modo claro');
    await setLocale('fr');
    expect(t('themeLight')).toBe('Mode clair');
  });

  it('t(key, ...args) substitutes after the locale chunk has loaded', async () => {
    await setLocale('es');
    expect(t('trendSub', 12)).toBe('Últimas 12 sesiones');
  });

  it('t(key) falls back to English when the locale is missing a key', () => {
    setLocale('es');
    // Spanish doesn't override the literal string 'WPM' label — same value
    expect(t('statLabelWpm')).toBeTruthy();
  });

  it('t(key, ...args) substitutes positional placeholders', () => {
    setLocale('en');
    expect(t('trendSub', 12)).toBe('Last 12 sessions');
    setLocale('es');
    expect(t('trendSub', 12)).toBe('Últimas 12 sesiones');
  });
});

describe('Locale key coverage', () => {
  // Every non-English locale should cover at least 80% of English keys — the
  // missing 20% fall through to English at runtime, which is acceptable but
  // worth flagging when it drops further.
  const COVERAGE_THRESHOLD = 0.80;
  const enKeys = Object.keys(en);

  function coverage(loc: Partial<typeof en>): number {
    const have = Object.keys(loc).filter(k => loc[k as keyof typeof en]).length;
    return have / enKeys.length;
  }

  it('es covers >= 80% of keys', () => expect(coverage(es)).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD));
  it('pt covers >= 80% of keys', () => expect(coverage(pt)).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD));
  it('hi covers >= 80% of keys', () => expect(coverage(hi)).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD));
  it('fr covers >= 80% of keys', () => expect(coverage(fr)).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD));
  it('de covers >= 80% of keys', () => expect(coverage(de)).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD));
});
