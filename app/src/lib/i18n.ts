// Lightweight i18n.
//
// Phase 10: only English is bundled in the critical path. The other 5
// locales are dynamically imported when the user picks them, then cached
// in memory so subsequent t() calls don't re-fetch.
//
// Usage:
//   const text = t('heroTitleLine1');
//   const sub  = t('trendSub', '20');          // positional {0}, {1}, ...

import { signal, effect } from '@preact/signals';
import { en, type StringKeys, type Translations } from './locales/en';

export type LocaleCode = 'en' | 'es' | 'pt' | 'hi' | 'fr' | 'de';

export interface LocaleMeta {
  code: LocaleCode;
  name: string;
  englishName: string;
  flag: string;
  rtl?: boolean;
}

export const LOCALES: LocaleMeta[] = [
  { code: 'en', name: 'English',    englishName: 'English',    flag: '🇬🇧' },
  { code: 'es', name: 'Español',    englishName: 'Spanish',    flag: '🇪🇸' },
  { code: 'pt', name: 'Português',  englishName: 'Portuguese', flag: '🇵🇹' },
  { code: 'hi', name: 'हिन्दी',     englishName: 'Hindi',      flag: '🇮🇳' },
  { code: 'fr', name: 'Français',   englishName: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',    englishName: 'German',     flag: '🇩🇪' },
];

// Cache of locales we've fetched. English is always present.
const TABLES: Record<string, Partial<Translations>> = { en };

// In-flight requests so the same locale is only fetched once.
const inflight: Partial<Record<LocaleCode, Promise<void>>> = {};

function loadLocale(code: LocaleCode): Promise<void> {
  if (TABLES[code]) return Promise.resolve();
  if (inflight[code]) return inflight[code]!;
  const fetcher: Promise<void> =
    code === 'es' ? import('./locales/es').then(m => { TABLES.es = m.es; }) :
    code === 'pt' ? import('./locales/pt').then(m => { TABLES.pt = m.pt; }) :
    code === 'hi' ? import('./locales/hi').then(m => { TABLES.hi = m.hi; }) :
    code === 'fr' ? import('./locales/fr').then(m => { TABLES.fr = m.fr; }) :
    code === 'de' ? import('./locales/de').then(m => { TABLES.de = m.de; }) :
    Promise.resolve();
  inflight[code] = fetcher;
  return fetcher;
}

const STORAGE_KEY = 'typing_master_locale';

function detectInitialLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (saved && LOCALES.some(l => l.code === saved)) return saved;
  } catch { /* ignore */ }
  const prefix = (navigator.language || 'en').slice(0, 2).toLowerCase() as LocaleCode;
  return LOCALES.some(l => l.code === prefix) ? prefix : 'en';
}

export const locale = signal<LocaleCode>(detectInitialLocale());

/** Translate. Falls back through active locale → English → key. */
export function t(key: StringKeys, ...args: (string | number)[]): string {
  const active = TABLES[locale.value] || {};
  let raw = active[key] ?? en[key] ?? String(key);
  for (let i = 0; i < args.length; i++) {
    raw = raw.replace(new RegExp(`\\{${i}\\}`, 'g'), String(args[i]));
  }
  return raw;
}

export function setLocale(code: LocaleCode): Promise<void> {
  if (!LOCALES.some(l => l.code === code)) return Promise.resolve();
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  // If the table is already cached (or it's English), flip synchronously so
  // the very next t() call reflects the new locale — no flash, and unit tests
  // that don't await still observe the change.
  if (code === 'en' || TABLES[code]) {
    locale.value = code;
    return Promise.resolve();
  }
  // Otherwise load the chunk, then flip. Returned promise lets callers/tests
  // await the locale actually being ready; production callers fire-and-forget
  // (t() falls back to English for the sub-100ms load window).
  return loadLocale(code).then(() => {
    locale.value = code;
  });
}

// Eagerly load whatever was persisted on previous visit, so first paint in
// e.g. Spanish doesn't show English flicker for a frame.
{
  const initial = detectInitialLocale();
  if (initial !== 'en') void loadLocale(initial).then(() => { locale.value = initial; });
}

// Sync <html lang> + dir whenever the locale changes.
if (typeof document !== 'undefined') {
  effect(() => {
    document.documentElement.lang = locale.value;
    const meta = LOCALES.find(l => l.code === locale.value);
    document.documentElement.dir = meta?.rtl ? 'rtl' : 'ltr';
  });
}
