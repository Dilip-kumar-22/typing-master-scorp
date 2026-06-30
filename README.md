# ⌨️ Typing Master · S-Corp

A premium, free touch-typing trainer — a 32-chapter curriculum, keybr-style
adaptive practice, real-time multiplayer races, a 3D mechanical-keyboard
heatmap, and a polished neon-on-midnight UI. Built as an installable PWA, so
anyone can run it on a laptop or phone with all progress saved on-device.

**▶️ Live app (install from here):**
**https://dilip-kumar-22.github.io/typing-master-scorp/**

> New here? See **[INSTALL.md](INSTALL.md)** for one-tap install on desktop,
> Android, and iOS.

---

## ✨ Features

- **40-chapter curriculum** — home row → top/bottom rows → capitals → numbers →
  symbols → speed drills, each with a guided tutorial.
- **Adaptive mode** — keybr.com-style: letters unlock as you hit your target
  WPM, weighting practice toward your weakest keys.
- **Challenges** — daily seeded run, paragraph speed-runs, punctuation, code.
- **3D keyboard heatmap** — see which keys you hit most and miss most.
- **Multiplayer races** — head-to-head WPM via room codes (needs backend).
- **6 languages** (en/es/pt/hi/fr/de) and **5 keyboard layouts**
  (QWERTY/AZERTY/QWERTZ/Dvorak/Colemak).
- **Themes** — light/dark/auto, 4 accent colors, fonts, cursor styles — all
  apply live.
- **Offline-first PWA** — installs to your device; progress persists locally;
  optional cloud sync + leaderboard.

## 🛠 Tech stack

Preact + TypeScript + Vite · @preact/signals state · vite-plugin-pwa · Capacitor
(native shells) · optional Supabase (auth/sync/multiplayer), Stripe (billing),
PostHog (analytics). The app degrades gracefully to local-only when no backend
env vars are set.

## 🚀 Develop

```bash
cd app
npm install
npm run dev          # http://localhost:5173
npm test             # vitest → 106 passing
npm run typecheck    # tsc, clean
npm run build        # tsc + vite + 37 SEO pages + PWA SW (0 warnings)
npm run preview      # serve the production build
```

GitHub Pages build (subpath base + manifest/404/.nojekyll fixups):

```bash
npm run build:pages
npm run preview:pages
```

## 📦 Deployment & native builds

- **PWA → GitHub Pages**: automatic on push to `main` via
  [`.github/workflows/pages.yml`](.github/workflows/pages.yml). One-time setup:
  repo **Settings → Pages → Source → GitHub Actions**.
- **Android APK / iOS / desktop**: see [BUILD_APPS.md](BUILD_APPS.md).

## 📚 Project docs

| Doc | What |
|---|---|
| [INSTALL.md](INSTALL.md) | How end-users install the app |
| [BUILD_APPS.md](BUILD_APPS.md) | Native (APK/iOS/desktop) build paths |
| [PROJECT_MAP.md](PROJECT_MAP.md) | File map + architecture diagram |
| [WORKLOG.md](WORKLOG.md) | Change log |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) · [STRIPE_SETUP.md](STRIPE_SETUP.md) · [TEAMS_SETUP.md](TEAMS_SETUP.md) | Backend setup |
| [MOBILE_PWA.md](MOBILE_PWA.md) · [NATIVE.md](NATIVE.md) · [MIGRATION.md](MIGRATION.md) | Subsystem notes |

## 📁 Repository layout

```
.
├── app/                 # ← the real product (Preact + TS + Vite)
│   ├── src/             # components, lib (store/metrics/keybr/i18n/…), hooks
│   ├── scripts/         # build-seo.mjs (37 static SEO pages, base-aware)
│   ├── android/ ios/    # Capacitor native shells
│   └── test/            # 106 vitest tests
├── .github/workflows/   # pages.yml (PWA deploy) · android.yml (APK)
├── index.html app.js …  # legacy vanilla-JS prototype (kept for reference)
└── *.md                 # docs (see table above)
```

The repo root also holds the original **vanilla-JS prototype** (`index.html`,
`app.js`, `data.js`, …). The maintained app is everything under `app/`.

## 📄 License

No license file yet — all rights reserved by the owner until one is added.
