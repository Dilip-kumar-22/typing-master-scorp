# Mobile + PWA — Phase 4

After this phase the app:
1. **Works on phones** — responsive layout under 900 px and 600 px, soft-keyboard typing capture, touch-friendly tap targets, iOS safe-area handling.
2. **Installs as a PWA** — manifest, icons, service worker, offline-capable shell, install prompt button in the topbar.
3. **Respects accessibility** — `prefers-reduced-motion` disables orbs/parallax/confetti for users who get motion-sick.
4. **Ships a 32-chapter curriculum** with multi-paragraph guides shown before each lesson.

---

## What changed at a glance

| File | What |
|---|---|
| `app/public/manifest.webmanifest` | PWA manifest (name, icons, theme, display=standalone) |
| `app/public/icon.svg` | Brand mark — gradient keyboard |
| `app/public/icon-maskable.svg` | Maskable variant for Android adaptive icons |
| `app/vite.config.ts` | Wires `vite-plugin-pwa` (workbox + Google Fonts caching) |
| `app/index.html` | manifest link, apple-touch icons, viewport-fit=cover, safe-area meta |
| `app/src/lib/device.ts` | Reactive touch / viewport / reduced-motion detection |
| `app/src/lib/input.ts` | Shared key-processing core (desktop + mobile both call it) |
| `app/src/hooks/useGlobalKeys.ts` | Desktop keydown listener (refactored) |
| `app/src/hooks/useMobileInput.tsx` | Hidden `<textarea>` captures OS soft-keyboard input |
| `app/src/hooks/useInstallPrompt.ts` | `beforeinstallprompt` capture + trigger |
| `app/src/components/InstallButton.tsx` | "Install" pill, only visible when eligible |
| `app/src/components/Practice.tsx` | Mounts mobile input + hides 3D keyboard on compact viewports |
| `app/src/styles.css` | Responsive @media queries (900/600), reduced-motion guards, install + sponge styles |
| `app/src/lib/lessons.ts` | **32-chapter curriculum** with rich `guide[]` + `tip` per lesson |
| `app/src/components/TutorialCard.tsx` | Renders the rich guide + "skip forever" toggle |
| `app/src/lib/store.ts` | `skippedGuides` signal + `dismissGuideForever()` |
| `data.js` / `app.js` / `styles.css` | Same curriculum + guide rendering mirrored into legacy |

---

## How mobile typing works

Touch devices never fire `keydown` for OS-keyboard characters. The workaround:

1. On a touch device, when the practice view is open and the tutorial isn't blocking, `useMobileInput` mounts a hidden `<textarea>` positioned at the bottom of the viewport (1×24px, opacity ≈ 0).
2. The textarea auto-focuses, which triggers the OS soft keyboard.
3. Each `input` event is translated into a `LogicalInput` (char / backspace / enter) and dispatched into the same `processInput()` core that desktop uses.
4. The textarea is drained on every event so the OS sees an empty buffer (no autocomplete suggestions, no scrolling).
5. `font-size: 16px` on the sponge stops iOS Safari from auto-zooming when focused.

If the user taps elsewhere on the page and loses focus, the soft keyboard hides. Tapping the typing area refocuses it (the effect re-runs every render).

## Service worker behavior

`vite-plugin-pwa` runs in `generateSW` mode with `registerType: 'autoUpdate'`. On first load:
- The shell (HTML + JS + CSS) is precached for offline use
- Google Fonts CSS is cached `StaleWhileRevalidate`
- Google Fonts files are cached `CacheFirst` for 1 year
- Supabase API calls are denylisted from navigate-fallback, so auth/cloud-sync still hits the network when online

When a new version is deployed, the SW auto-updates on the next page load (no "Reload now" prompt — the user gets the new version next time they open the app).

The SW is **disabled in `vite dev`** to keep the dev loop simple. It's only active in `vite build` / `preview` and production deploys.

## Install prompt flow

1. Chrome/Edge/Brave on Android (and desktop Chrome) fire `beforeinstallprompt` when the install criteria are met (HTTPS or localhost, manifest, SW registered, user engagement).
2. `useInstallPrompt` captures the event, exposes `isInstallable` signal.
3. The `InstallButton` in the TopBar appears with a gradient pill.
4. Click → calls the browser's install prompt → toast on success.
5. iOS Safari doesn't fire `beforeinstallprompt`. Users install via Share → Add to Home Screen. The `apple-mobile-web-app-capable` meta + apple-touch-icon make this work cleanly.

## Reduced-motion

Two paths:
- CSS `@media (prefers-reduced-motion: reduce)` zeros out all animations/transitions globally
- A `reduce-motion` body class is set by `lib/device.ts` so JS-driven things (orbs, tilt-glare) can hide entirely

Confetti on results still fires, but the orbs and the typing-card parallax don't. Acceptable trade — confetti is brief and celebratory.

## How to test on your phone

1. `cd app && npm run build && npm run preview` — serves on `http://localhost:4173`
2. Find your machine's LAN IP (Windows: `ipconfig`, look for "IPv4 Address")
3. On your phone, hit `http://<your-lan-ip>:4173/` (same Wi-Fi)
4. Add to home screen via the browser's share/menu
5. Open the installed icon — it launches without the browser chrome

For real-device PWA testing you eventually want HTTPS. Cloudflare Tunnel (free) or `ngrok` are the easy options:
```
ngrok http 4173
# → use the https://*.ngrok-free.app URL on your phone
```

## What's still missing on mobile

These are deliberate Phase-4 omissions to keep scope bounded — flag any of them as Phase 5 if you want me to tackle them:

- **Custom on-screen practice keyboard.** Right now we use the native OS keyboard. A custom keyboard styled to match the 3D heatmap would be visually slicker and let us show finger cues without using up screen real estate. Bigger lift (~half day).
- **Landscape-optimized layout.** Currently we treat all `<600px` viewports the same. Landscape phones have unique aspect ratios that could fit more content.
- **Web Share API.** The Share Result button currently uses clipboard. On mobile, `navigator.share()` opens the native share sheet which is much nicer.
- **Vibration feedback** on incorrect keystrokes (`navigator.vibrate(20)`).
- **iOS install prompt UI.** Safari doesn't fire `beforeinstallprompt`. We could detect iOS Safari and show a one-time hint about Share → Add to Home Screen.
