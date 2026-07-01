# WORKLOG

Append-only log of changes per session. Newest first.

---

## 2026-07-01 (cont.) — Repo cleanup + pro README + Insights dashboard

**Repo cleanup (local + GitHub):**
- Deleted the fully-orphaned legacy app: 10 stale `.jsx` React prototypes, the
  root vanilla-JS app (index.html/app.js/data.js/audio.js/styles.css/test.js),
  root package.json+lock, `.thumbnail`, and the internal journey docs
  (HANDOFF/SESSION_HANDOFF/MIGRATION). Nothing referenced them; real app is in
  `app/`. All recoverable from git history.
- Moved backend/build guides into `docs/` (SUPABASE/STRIPE/TEAMS_SETUP, NATIVE,
  MOBILE_PWA, BUILD_APPS). Root now: README, INSTALL, SECURITY, PROJECT_MAP,
  WORKLOG, LICENSE. Fixed links in INSTALL/SECURITY to `docs/`.
- Verified app tests/build unaffected by the root deletions.

**Professional README + LICENSE:**
- Rewrote README.md: centered hero, badges, live link, prominent "Install on
  your laptop (1 min)" desktop+mobile steps, features table, tech, dev, deploy,
  repo map, docs index. Added MIT `LICENSE`. Set GitHub repo
  description/homepage/topics via `gh repo edit`.

**Typing-analysis / Insights dashboard (the requested "analysis" feature):**
- `lib/insights.ts` (NEW, pure/tested): weakestKeys (all-time, min-sample
  filtered), per-finger accuracy (via FINGER_MAP), computeInsights (best/avg
  WPM, avg accuracy, improvement delta, consistency=stdev of recent WPM), and a
  plain-English `recommend()`.
- Persistence: added `KeyStats` type + `keyStats` signal; `completeSession()`
  now accumulates per-key presses/errors into a lifetime aggregate (survives the
  20-session history cap); `resetProgress()` clears it.
- `components/InsightsPanel.tsx` (NEW, lazy): recommendation banner, 5 KPIs,
  weakest-keys list w/ accuracy bars + one-click "Drill weak keys" (custom-set),
  per-finger accuracy, "Build a custom drill" jump. Shown on Home when history
  exists. 11 i18n keys × 6 locales. CSS added.
- Tests: `test/insights.test.ts` (8, pure logic) + `test/insights-render.test.tsx`
  (2, component renders). **122 tests total, all green.** typecheck clean,
  build 0 warnings.

## 2026-07-01 — Chapter 0 visual primer + security hardening (launch prep)

**Chapter 0 — visual finger guide** (`src/components/FingerGuide.tsx` NEW):
- A colour-coded keyboard where every key is painted with its finger's colour
  (8 fingers = 8 hues, thumbs share one), driven by the existing `FINGER_MAP`.
- Live animated cue ("K → your right middle"), a two-hands illustration whose
  fingers light up in sync, an 8-finger legend, and 3 humanized tip cards.
- Warm, human copy (not AI-flat). Surfaces as a "Chapter 0 · Start here" card
  at the top of the lessons grid AND auto-opens once for brand-new visitors
  (localStorage `typing_master_seen_primer`; skipped if deep-linked or has
  history). "Start Chapter 1 →" jumps straight into lesson-1.
- Kept OUT of the 40-lesson array so it doesn't disturb the Chapter-N sequence
  / progress invariants. 3 i18n keys × 6 locales. `<Primer/>` mounted in App.
- Verified in-browser: auto-open works, animation cycles, Start-Chapter-1 flow
  navigates to practice, 0 a11y violations on the overlay, screenshots.
- Bug caught during verify: had `background`-shorthand-style base mismatch —
  serving a `base:'/'` build under the `/typing-master-scorp/` subpath 404'd the
  bundle (blank app). Always `build:pages` when previewing the subpath.

**Security hardening** (pre-launch audit via subagent — no secrets found):
- **CRITICAL fix** — `supabase/migrations/0005_security_hardening.sql` (NEW):
  0001 shipped `sessions_public_read USING (true)`, which (RLS is permissive-OR)
  made the whole sessions table world-readable and OVERRODE the 0004 Teams
  tenant boundary. 0005 drops it and serves the public leaderboard via a
  `SECURITY DEFINER` `leaderboard_top()` function (anonymized cols only). Also:
  scoped multiplayer `rooms`/`room_participants` reads to host-or-member (+ a
  `room_by_code()` definer fn for join-by-code) and made `profiles` reads
  authenticated-only.
- Client: `multiplayer.ts findRoom()` now uses the `room_by_code` RPC + new
  `fetchRoom()` re-read after join (member RLS reveals the prompt); `Multiplayer.tsx`
  join flow updated. `_shared/cors.ts` → origin allowlist (was `*`).
- Docs: `SECURITY.md` (NEW, disclosure + posture), `SUPABASE_SETUP.md` updated
  to apply 0005 as a required step.
- Audit verified-safe: anon/PostHog/publishable keys are the public kind;
  `.env.example` blank; one dangerouslySetInnerHTML is hardcoded icon paths;
  escapeHTML sound; Stripe webhook verifies signatures; RLS on every table.

**Gate:** 112 tests green · typecheck clean · build 0 warnings · 45 SEO pages.

## 2026-06-30 (cont. 2) — PWA update-prompt + a11y/design pass

**Task 1 — PWA update prompt** (no more silent-stale-cache for returning users):
- `vite.config.ts`: `registerType: 'autoUpdate'` → `'prompt'`, `injectRegister: null`.
- `src/lib/pwa.ts` (NEW): registers SW via `virtual:pwa-register`; `onNeedRefresh`
  → `showUpdateToast()`; Refresh runs `updateSW(true)` (activates new SW + reloads).
- `src/hooks/useToast.tsx`: added `showUpdateToast()` — a sticky, de-duped toast
  with an action button; host now `aria-live=polite role=status`.
- `src/main.tsx`: calls `initPwa()`. `src/vite-env.d.ts` (NEW): pwa client types.
- Note: SW registration now rides the main bundle (registerSW.js no longer
  emitted); SEO script's defensive SW-inject no-ops cleanly. Verified toast UI
  renders in-browser (screenshot).

**Task 3 — a11y + design pass** (audited live with axe-core 4.10):
- Light `--text-3` contrast: bumped to #69648f (≥4.8:1). Authoritative value is
  the override block (~line 2041), kept base in sync.
- `body` used `background:var(--bg-0)` (shorthand didn't reliably re-resolve the
  var on theme flip → body stayed dark in light mode, failing contrast checks &
  edge cases). Switched to `background-color` longhand; verified body flips to
  #f5f5fc in light. (This bug also proved why Task 1 matters — chased a stale-SW
  cache for a while.)
- Settings drawer: added aria-labels to the font-size + volume range sliders
  (was CRITICAL: unlabeled). Converted the 4 click-only `.switch` divs to an
  accessible `<Switch>` (role=switch, aria-checked, tabindex, Space/Enter) and
  the accent `.swatch` divs to radio buttons (role=radio, aria-checked). Added
  `:focus-visible` rings for both. Keyboard toggle verified.
- Skip link wrapped in a `<nav aria-label="Skip links">` landmark (region check).
- Result: clean axe run = 0 violations on light home + drawer. Remaining
  occasional flags (.t2/footer) are axe false-positives from translucent-glass
  backgrounds + stale SW cache — real rendered contrast passes (≥4.5:1).
- Perf: load is already excellent (DOMContentLoaded ~95ms; ~115KB gz first
  paint; SW cache → instant repeat loads). No perf changes needed.
- 112 tests green, typecheck clean, build 0 warnings.

## 2026-06-30 (cont.) — Curriculum 32→40 + literal-prompt fix

**Curriculum expanded to 40 chapters** (`app/src/lib/lessons.ts`): added Track 7
"Fluency & Mastery" — Ch33 Double Letters, 34 Everyday Words, 35 Capitalization
in Context, 36 Numbers in the Wild, 37 Symbols & Email, 38 Longer Words, 39
Quotes & Wisdom, 40 The Final Sprint. Each has guide (≥2 paras) + tip; titles
follow the `Chapter N:` sequence the tests enforce.

**Found + fixed a real pre-existing bug:** every lesson built its prompt by
flattening `pool` into a CHARACTER SET and generating random words — so the
sentence/word lessons (8,14,20,23,26-32 + the new ones) rendered as random
letter-soup (e.g. Ch20 pangram showed "pz.lcd opq jxu…"). Verified in-browser.
Fix: added `literal?: boolean` to the Lesson type (`types.ts`); `buildLiteralPrompt()`
in `data.ts` (picks sentences verbatim / concatenates word entries); store
`restart()` + `pickMode()` branch on `literal`. Marked the 18 real-text lessons
literal. Now Ch20 → "the quick brown fox…", Ch40 → 'She asked, "Can you finish
all 40 chapters?"'. Screenshot-confirmed.

**Drift-proofing:** `scripts/build-seo.mjs` imported a HAND-MAINTAINED mirror
(`lessons-cjs.mjs`) that was stale (still 32). Added `scripts/gen-lessons-cjs.mjs`
(esbuild-bundles the TS source → regenerates the mirror, guides included) and
wired it into `build`/`build:pages` so it can never drift again.

**Copy + tests:** "32"→"40" across build-seo.mjs, PricingPanel, README, lessons
header. Tests: +5 buildLiteralPrompt + Track-7 integrity + ≥40 floor → 112 total,
all green. Build: 45 SEO pages, 0 warnings. Fixed `.gitignore` `.claude/` rule
(had an invalid same-line comment).

## 2026-06-30 — Fix Settings/Theme tabs + hosted-PWA install path

**Bug fix — live visual settings (Settings + Theme tabs were "not working"):**
- `app/src/lib/store.ts` — root cause: `updateSetting()` persisted + re-applied
  audio but never re-applied **visual** settings, and `applyVisualSettings()`
  ran only once on mount. So theme/accent/font/font-size/cursor were saved but
  not painted until reload. Fix: added a Preact `effect()` that re-applies
  visuals on any `settings` change; also made the `matchMedia` read SSR-safe.
- `app/test/settings-visual.test.ts` — NEW. 6 regression tests (theme/accent/
  cursor/font/font-size apply live).
- Verified live in a real browser (Chrome MCP): theme toggle + drawer controls
  update instantly; screenshot confirmed; reset user's localStorage after.

**Test reliability:**
- `app/test/lazy.test.tsx` — fixed a pre-existing timing flake (~1/3 full runs)
  by replacing fixed `setTimeout` ticks with a `waitFor` poll. Suite now 106/106
  green across 5 consecutive full runs.

**Hosted PWA on GitHub Pages (install-from-web path):**
- `app/vite.config.ts` — documented base handling (use native `--base` CLI flag;
  avoids Git-Bash/Windows leading-slash env path-mangling).
- `app/scripts/build-seo.mjs` — made base-aware: derives BASE from Vite's built
  index.html (single source of truth), added `href()` for all internal links,
  base-prefixed sitemap/robots/schema, and added deploy fixups: patch dist
  manifest (start_url/scope/icons), write `404.html` SPA fallback + `.nojekyll`.
- `app/package.json` — added `build:pages` and `preview:pages` scripts.
- `.github/workflows/pages.yml` — NEW. Builds with base=/typing-master-scorp/
  and deploys to GitHub Pages on push to main.
- Verified the subpath build in-browser (port 4191): app mounts, 8/8 network
  requests 200/304 (zero 404s), theme toggle works, screenshot confirmed.
- Confirmed default root build still emits plain `/` paths (no regression).

**CI fix:**
- `.github/workflows/android.yml` — bumped Node 20 → 22. The prior APK build
  failed with "[fatal] The Capacitor CLI requires NodeJS >=22.0.0".

**Docs:**
- `README.md` — NEW (overview, install link, dev, deploy, repo map).
- `INSTALL.md` — NEW (end-user install on desktop/Android/iOS).
- `WORKLOG.md`, `PROJECT_MAP.md` — NEW (mandated living artifacts).

**Verification:** `npm test` 106/106 · `npm run typecheck` clean ·
`npm run build` 0 warnings · `npm run build:pages` 0 warnings, base correct.

---

## 2026-05-30 — GitHub push + CI scaffold (prior session)
- Pushed local repo to private GitHub repo `Dilip-kumar-22/typing-master-scorp`
  (branch main). Added `.github/workflows/android.yml` + `BUILD_APPS.md`.
- See `SESSION_HANDOFF.md` for the full 11-phase history that preceded this log.
