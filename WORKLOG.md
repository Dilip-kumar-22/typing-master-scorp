# WORKLOG

Append-only log of changes per session. Newest first.

---

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
