# MIGRATION — Vanilla → Vite + Preact + TS → Backend → Mobile/PWA → Adaptive → SEO/A11y/Multiplayer/Analytics

**Status:** Phases 1, 2, 3b, 4, 5, and 6 are all complete. The new app is fully functional, fully typed, fully tested, fully built.

- **Phase 3b** added optional cloud sync + global leaderboard via Supabase. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- **Phase 4** added mobile + PWA + the 32-chapter curriculum + tutorial guides. See [MOBILE_PWA.md](MOBILE_PWA.md).
- **Phase 5** added the keybr.com-style adaptive engine (`lib/keybr.ts`, `AdaptivePanel`).
- **Phase 6** added SEO landing pages, accessibility pass, multiplayer races, and PostHog analytics — all four built in a single push. See bottom of this doc.

Without env vars the app silently runs in local-only mode with no auth, no cloud, no leaderboard, no multiplayer, and no analytics, identical to Phase 2.

---

## Repo layout

```
TYPING MASTER FROM S-CORP/
├── index.html        ← LEGACY (vanilla JS, no build)
├── app.js            ← LEGACY — open index.html directly in a browser
├── data.js           ← LEGACY
├── audio.js          ← LEGACY
├── styles.css        ← LEGACY (source-of-truth visual system)
├── test.js           ← LEGACY tests (22 passing)
├── package.json      ← root — runs legacy tests with `npm test`
│
└── app/              ← NEW (Vite + Preact + TypeScript, v2.1.0)
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    ├── src/
    │   ├── main.tsx          ← Preact mount point
    │   ├── App.tsx           ← root, view routing
    │   ├── styles.css        ← identical to legacy styles.css
    │   ├── lib/
    │   │   ├── types.ts      ← all shared types & type-guards
    │   │   ├── data.ts       ← word banks, lessons, challenges, builders
    │   │   ├── audio.ts      ← Web Audio synth (3 packs)
    │   │   ├── metrics.ts    ← single source of truth for WPM/accuracy
    │   │   ├── utils.ts      ← escapeHTML, timeAgo, set helpers
    │   │   ├── icons.tsx     ← reusable <Icon/> + canonical SVG paths
    │   │   └── store.ts      ← Preact signals — replaces the global `S`
    │   ├── hooks/
    │   │   ├── useGlobalKeys.ts  ← global keydown / keyup / blur wiring
    │   │   └── useToast.tsx      ← toast host + showToast()
    │   └── components/
    │       ├── TopBar.tsx
    │       ├── Home.tsx           ← Hero, ModesNav, 3 tab grids, Stats, Trend, Recent, Footer
    │       ├── Practice.tsx       ← gates between TutorialCard and typing UI
    │       ├── PracticeHead.tsx   ← back/mode-picker/restart bar + popover
    │       ├── StatsBar.tsx       ← WPM / Acc / Err / Streak / Time bar
    │       ├── TypingCard.tsx     ← per-char render + mouse parallax + active-char display
    │       ├── KeyboardCard.tsx   ← 3D heatmap with target/down/heat states
    │       ├── CustomKeysPanel.tsx ← QWERTY picker (shared Home + Practice)
    │       ├── TutorialCard.tsx
    │       ├── ResultsOverlay.tsx ← donut + confetti + struggle bars + unlock notice
    │       ├── SettingsDrawer.tsx ← all settings, history mini-chart, reset button
    │       └── ShortcutsModal.tsx
    └── test/
        ├── metrics.test.ts  (8 tests)
        └── data.test.ts     (13 tests)
```

---

## Running each version

**Legacy (no build, just open):**
```
open D:\FUN_PROJECTS\TYPING MASTER FROM S-CORP\index.html
# or
npm test                        # 22 tests, ~200ms
```

**New (Vite dev server with HMR):**
```
cd app
npm install                     # already done
npm run dev                     # http://localhost:5173
npm run build                   # outputs dist/
npm run preview                 # serve the dist build
npm test                        # vitest, 21 tests
npm run typecheck               # tsc --noEmit
```

---

## What stayed identical

- **CSS** — the visual system in `app/src/styles.css` is byte-for-byte identical to the root `styles.css`. The 3D keyboard, glass panels, gradients, parallax glare, orbs, fonts, all of it.
- **Behavior** — every interaction, every keyboard shortcut, every animation duration, every state transition is preserved.
- **Data** — word banks, lessons, challenges, finger map, KB layout are all ported 1:1.
- **Storage key** (`typing_master_v2`) — users' existing progress carries across the migration.

## What changed structurally

| Area | Legacy | New |
|---|---|---|
| Rendering | Global `render()` blows away `#app.innerHTML` on every state change. | Preact diffs the VDOM. Each signal change only re-renders components that read it. |
| State | Single mutable `S` object touched from anywhere. | 28 `signal()` values + 3 `computed()` derivations in `lib/store.ts`. |
| Type safety | None. | Strict TS, including discriminated unions for `Mode = Lesson \| Challenge \| CustomSetMode`. |
| Bundle | 3 unminified scripts, ~150 KB raw, no compression strategy. | `app/dist/index.js` 80 KB / `index.css` 43 KB **— 27 KB / 8.6 KB after gzip**. ~85% smaller over the wire. |
| Build | None. | Vite + ESBuild + Rollup. Source maps, tree-shaking, code-splitting ready. |
| Tests | 22 jsdom-driven smoke + math tests. | 21 pure vitest tests against the typed source. |
| Dev loop | Hard refresh. | HMR — change a component, see it instantly. |
| Bugs | All Phase 1 bug fixes carried forward. | Same fixes, expressed in idiomatic Preact (e.g. backspace path uses immutable Set, not in-place mutation). |

---

## Why this matters for the 100M-user goal

This migration alone doesn't add a single user-facing feature.
What it **does** is unblock every Phase 3+ thing on the roadmap:

| Future work | Why it needs Phase 2 first |
|---|---|
| Mobile / PWA | Need a build pipeline to ship a service worker + manifest. |
| i18n | TS types make message-key safety enforceable at compile time. |
| Backend (Supabase / auth / leaderboard) | Need ES modules + npm to install SDKs. |
| Multiplayer races | Need a component model to subscribe to WebSocket events cleanly. |
| Code-splitting per route | Vite + Rollup do this in one config line. |
| Real component library (shadcn-style) | Was impossible with the `render()` blow-away approach. |

---

## How to make the final swap (when you're satisfied)

The legacy version stays as a fallback until you've put hands on the new one. When you're ready:

```
# from project root
mv index.html LEGACY-index.html
mv app.js     LEGACY-app.js
mv data.js    LEGACY-data.js
mv audio.js   LEGACY-audio.js
mv styles.css LEGACY-styles.css
mv test.js    LEGACY-test.js

# (optional) flatten the new app into root
mv app/* .
rmdir app
```

Or — easier — just deploy `app/dist/` to Vercel / Netlify / Cloudflare Pages.
Drag-and-drop the `dist/` folder onto Vercel and you're live.

---

## What I deliberately did NOT do in Phase 2

- **No new features.** The point was to migrate, not to add.
- **No CSS changes.** Visual parity is non-negotiable — the design is the moat.
- **No backend.** Phase 3.
- **No mobile responsiveness fixes.** Phase 3.
- **No i18n scaffolding.** Phase 4.
- **No accessibility audit.** Pending its own phase.

---

## Next decisions (when you're ready to keep going)

Pick one and say "go":

1. **Phase 3a — Mobile / PWA.** Service worker, manifest, install prompt, responsive layout under 600px, on-screen keyboard for phones. ~1 day.
2. **Phase 3b — Backend.** Supabase project, Google OAuth, cloud sync, global leaderboard. ~2 days. Requires a free Supabase account from you.
3. **Phase 3c — SEO + landing pages.** Static prerender per lesson, OG cards, sitemap, blog scaffolding. ~1 day.
4. **Phase 3d — Accessibility pass.** ARIA, focus traps, `prefers-reduced-motion`, contrast fixes, screen-reader labels. ~half a day.
5. **Polish only.** Expand to 30+ lessons, 500+ words per category, more sound packs, settings persistence improvements. ~half a day.

---

## Phase 6 — SEO + A11y + Multiplayer + Analytics (delivered together)

### 6a — SEO
- `app/scripts/build-seo.mjs` runs after `vite build` and writes **36 static landing pages** + `sitemap.xml` + `robots.txt` into `dist/`.
  - 1 home (`/`)
  - 1 lessons index (`/lessons/`)
  - 32 per-lesson pages (`/lessons/chapter-N/`)
  - 1 adaptive landing (`/adaptive/`)
  - 1 challenges landing (`/challenges/`)
- Each page carries: unique `<title>`, meta description, canonical URL, Open Graph + Twitter cards, Schema.org `Course` / `ItemList` / `WebApplication` JSON-LD, internal nav links.
- CTA on each landing page deep-links into the SPA via `?lesson=lesson-N` or `?mode=adaptive`. The SPA reads these query params at mount and pre-picks the right mode.
- `SITE_URL` env var lets you override the canonical host at build time. Defaults to `https://typingmaster.example.com` for local builds.
- **Action required before production**: replace the placeholder OG image (`/icon.svg`) with a proper 1200×630 PNG for richer social previews.

### 6b — Accessibility
- New `useFocusTrap()` hook traps Tab/Shift+Tab inside drawers and modals; restores focus on close.
- New `<A11yAnnouncer>` polite live region + `announce()` helper. Wired for: new-personal-best announcements, "letter unlocked" in adaptive mode.
- Skip-to-content link visible only on keyboard focus.
- ARIA additions: `role="banner"`, `role="toolbar"`, `role="tablist" / "tab"` on home tab nav, `role="dialog"` + `aria-modal` + `aria-labelledby` on Settings drawer, Results overlay, Shortcuts modal, `aria-label` on every icon-only button, `aria-pressed` on the theme toggle, `aria-expanded` + `aria-controls` on the settings button.
- High-contrast `outline: 2px solid var(--cyan)` focus ring on every interactive element (via `:focus-visible`).
- Contrast: `--text-3` bumped from `#5d5a86` (≈3:1) to `#7c78a8` (≈4.6:1) so it passes WCAG AA on dark glass.
- The `prefers-reduced-motion` CSS guard from Phase 4 is unchanged and still active.

### 6c — Multiplayer races
- SQL migration `0002_multiplayer.sql` adds `rooms` + `room_participants` tables with full RLS + realtime publication.
- `lib/multiplayer.ts` wraps the lifecycle: `createRoom`, `findRoom`, `joinRoom`, `startRoom`, `finishRace`, `fetchParticipants`, `subscribeToRoom` (live cursor positions via Supabase Realtime broadcast).
- `Multiplayer.tsx` ships the four sub-screens in one file:
  - **Lobby** — Host / Join cards. Joining uses a 4-char code.
  - **Waiting room** — participant avatars, prompt preview, click-to-copy code. Host has a Start button.
  - **Race** — live cursor positions per participant, simple typing input, live error count.
  - **Results** — ranked leaderboard with medals + final WPM/accuracy.
- New 4th tab on Home: **👥 Multiplayer**.
- Gracefully shows a setup hint when Supabase isn't configured.
- Apply the new migration: Supabase dashboard → SQL Editor → paste `app/supabase/migrations/0002_multiplayer.sql` → Run.

### 6d — Analytics
- `lib/analytics.ts` wraps `posthog-js`. No-ops without `VITE_POSTHOG_KEY` so dev/local sessions don't send traffic.
- Init on app load. Identifies on sign-in (email as super-prop). Resets on sign-out. Respects DNT, no session recording, no autocapture (we hand-instrument).
- Events wired across the codebase:
  - `app_loaded`
  - `lesson_start`, `lesson_complete`, `lesson_refresher_triggered`, `personal_best`
  - `adaptive_round_complete`, `adaptive_letter_unlocked`
  - `auth_signup_started`, `auth_signin`, `auth_signout`
  - `install_prompted`, `install_accepted`, `install_dismissed`
  - `multiplayer_room_created`, `multiplayer_room_joined`, `multiplayer_race_finished`
- All lesson/adaptive/multiplayer events carry `mode_id` + `mode_label` so PostHog funnels can slice by mode.
- Env: `VITE_POSTHOG_KEY` + optional `VITE_POSTHOG_HOST` (defaults to US cloud; set to `https://eu.i.posthog.com` for EU projects).

### Test + build state after Phase 6

```
Legacy (root):    25 tests passing
New app (vitest): 64 tests passing
─────────────────────────────────────
Total:            89 tests, all green

Production build: 543 KB JS / 67 KB CSS  → 168 / 12.5 KB gzipped
Service worker:   precaches 602 KB (7 entries)
SEO output:       36 landing pages + sitemap.xml + robots.txt
```

Bundle did cross the 500 KB minified warning line — PostHog + Supabase Realtime + Multiplayer all landed at once. **Next-cleanup candidate**: dynamic-import the multiplayer module + analytics so they don't sit on the critical-path bundle for users who never touch them. ~30 minute fix when you want it.
