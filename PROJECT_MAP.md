# PROJECT MAP

The maintained app lives in `app/` (Preact + TS + Vite). The repo root also
contains a legacy vanilla-JS prototype (kept for reference, not built/shipped).

## Architecture (app/src)

```mermaid
graph TD
  subgraph Entry
    HTML["index.html<br/>#app mount + bg layers"]
    MAIN["main.tsx<br/>render(App)"]
    APP["App.tsx<br/>bootstrap, deep-links, view router"]
  end

  subgraph State["lib/ — state & logic (pure-ish)"]
    STORE["store.ts<br/>signals + actions + applyVisualSettings()"]
    METRICS["metrics.ts<br/>WPM/accuracy (pure)"]
    INPUT["input.ts<br/>keystroke processing"]
    DATA["data.ts<br/>word banks, prompt builders"]
    LESSONS["lessons.ts<br/>32-chapter curriculum"]
    KEYBR["keybr.ts (+keybr_words)<br/>adaptive engine"]
    TYPES["types.ts"]
    I18N["i18n.ts (+locales/*)<br/>6 languages"]
    LAYOUTS["layouts.ts<br/>5 kb layouts"]
    AUDIO["audio.ts"]
    DEVICE["device.ts"]
    ICONS["icons.tsx"]
  end

  subgraph Backend["lib/ — backend (no-op without env)"]
    SUPA["supabase.ts"]
    AUTH["auth.ts"]
    SYNC["sync.ts"]
    BILLING["billing.ts"]
    TEAMS["teams.ts"]
    MP["multiplayer.ts"]
    ANALYTICS["analytics.ts"]
    NATIVE["native.ts (Capacitor)"]
  end

  subgraph UI["components/"]
    TOPBAR["TopBar<br/>theme toggle, install, gear"]
    HOME["Home<br/>tabs + chapter grid + Ch0 card"]
    PRACTICE["Practice + TypingCard<br/>StatsBar, KeyboardCard"]
    DRAWER["SettingsDrawer<br/>all settings"]
    RESULTS["ResultsOverlay"]
    PRIMER["FingerGuide/Primer<br/>Chapter 0 visual finger guide"]
    LAZY["Lazy.tsx<br/>code-split helper"]
    LAZYUI["AdaptivePanel · Multiplayer ·<br/>Pricing/Billing · TeamDashboard ·<br/>CustomParagraph (lazy)"]
  end

  subgraph Hooks["hooks/"]
    GK["useGlobalKeys"]
    MI["useMobileInput"]
    FT["useFocusTrap"]
    IP["useInstallPrompt"]
    TOAST["useToast"]
    A11Y["useA11yAnnouncer"]
  end

  subgraph Build["build / deploy"]
    VITE["vite.config.ts<br/>base, PWA SW"]
    SEO["scripts/build-seo.mjs<br/>37 pages, base-aware,<br/>manifest/404/.nojekyll"]
    PAGES[".github/workflows/pages.yml<br/>→ GitHub Pages PWA"]
    ANDROID[".github/workflows/android.yml<br/>→ debug APK"]
  end

  HTML --> MAIN --> APP
  APP --> TOPBAR & HOME & PRACTICE & DRAWER & RESULTS & PRIMER
  APP --> STORE
  TOPBAR --> STORE
  DRAWER --> STORE
  PRACTICE --> INPUT --> STORE
  STORE --> METRICS & DATA & KEYBR & I18N & NATIVE & SYNC
  DATA --> LESSONS
  HOME --> LAZY --> LAZYUI
  LAZYUI --> BILLING & TEAMS & MP
  AUTH --> SUPA
  SYNC --> SUPA
  MP --> SUPA
  GK --> INPUT
  MI --> INPUT
  APP --> IP
  VITE --> SEO
  PAGES --> SEO
  ANDROID --> NATIVE
```

## Key flows

- **Settings → live repaint:** any control → `updateSetting()` (store) → updates
  `settings` signal + persists → a reactive `effect()` calls
  `applyVisualSettings()` → writes body classes + CSS vars. (This is the path
  that was broken and is now fixed + tested.)
- **Typing:** `useGlobalKeys`/`useMobileInput` → `input.ts processInput()` →
  store updates `pos/errorIdx/...` → `metrics.ts` computes WPM/acc (computed
  signal) → `completeSession()` writes history + optional cloud push.
- **Deep links:** SEO pages link `/?lesson=ID` / `?mode=adaptive` → `App.tsx`
  reads query params on mount and pre-picks the mode.
- **Base path:** root `/` for dev/custom-domain/native; `/typing-master-scorp/`
  for GitHub Pages (via `build:pages`). `build-seo.mjs` derives BASE from Vite's
  built index.html so SEO pages always match the bundle.

## Backend gating

Every backend module exports an `isXConfigured()` and no-ops without env vars,
so the app runs fully local-only out of the box. Env vars documented in
`app/.env.example` + the `*_SETUP.md` files.
