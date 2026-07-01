# Native Apps — Capacitor (iOS + Android)

After Phase 8 the app builds three artifacts from the same Vite + Preact + TS source:

1. **Web** — `dist/` (deployed to any static host)
2. **Android** — `app/android/` (open in Android Studio → produce `.aab` / `.apk`)
3. **iOS** — `app/ios/` (open in Xcode → produce `.ipa`)

The web app is wrapped in a native WebView via Capacitor. JS/TS code is **shared 100%** across all three. Only the platform-specific shell (status bar, splash, hardware back button, haptics, preferences) differs — and even that is hidden behind [`app/src/lib/native.ts`](app/src/lib/native.ts) so component code stays platform-agnostic.

---

## TL;DR commands (from `app/`)

```bash
npm run build              # produces dist/ + 36 SEO pages
npm run cap:sync           # pushes dist/ into both android/ and ios/
npm run cap:open:android   # opens Android Studio
npm run cap:open:ios       # opens Xcode (macOS only)
npm run cap:run:android    # build + sync + run on a connected device/emulator
npm run cap:run:ios        # same, iOS (macOS only)
```

After **any** web-side change: `npm run cap:sync` to push it into the native projects.

---

## What was wired up

| Native concern | Where |
|---|---|
| Status bar color tracks the theme | `lib/native.ts → setStatusBar()` called from `applyVisualSettings()` |
| Splash screen hides on first mount | `App.tsx → useEffect → hideSplash()` |
| Android hardware back button | `App.tsx → initBackButton()` — closes overlay → goes home → minimizes app |
| Haptic on incorrect keystroke | `lib/input.ts → hapticError()` on wrong-char path |
| On-screen keyboard resize behavior | `capacitor.config.ts → plugins.Keyboard.resize: 'native'` |
| Native key-value preferences fallback | `lib/native.ts → nativeSet/nativeGet` (currently still uses localStorage app-wide; available for future migration) |

Every native call is **a no-op on the web** — same TS source, three targets.

---

## Prerequisites (one-time install)

### For Android
- **Node 18+** ✅ (you have v24)
- **JDK 17+** — Capacitor 8 requires it
  - Windows: https://adoptium.net/temurin/releases/?version=17
  - Verify: `java -version`
- **Android Studio** (latest stable) — https://developer.android.com/studio
  - On first launch: install Android SDK 34, Android SDK Build-Tools, Android Emulator
- **`ANDROID_HOME` env var** pointing at the SDK directory
  - Typically `C:\Users\<you>\AppData\Local\Android\Sdk` on Windows

### For iOS
- **macOS** — non-negotiable (Apple's Xcode toolchain is macOS-only)
- **Xcode 15+** (free, ~15 GB) — Mac App Store
- An Apple Developer account ($99/yr) when you're ready to ship to TestFlight / the App Store

---

## Daily dev loop

### Android (Windows / macOS / Linux)
1. `npm run dev` — iterate on the web app in a browser (fastest loop)
2. When ready to test on a device:
   ```bash
   npm run cap:run:android
   ```
   This builds the web app, syncs into `android/`, and launches into a connected device or running emulator.
3. For deeper Android debugging:
   ```bash
   npm run cap:open:android   # opens Android Studio
   ```
   - Run → click ▶ to install on a device
   - Logcat tab shows native logs
   - Chrome DevTools: open `chrome://inspect` while the app is running

### iOS (macOS only)
1. `npm run dev` — same browser loop
2. `npm run cap:open:ios` → Xcode opens
3. In Xcode: pick a simulator (top toolbar) → click ▶
4. For Safari Web Inspector: Safari menu → Develop → [simulator name] → [app]

---

## Producing release builds

### Android `.aab` (Play Store submission format)
1. Generate a release keystore — **do this ONCE and back it up:**
   ```bash
   keytool -genkey -v -keystore release-key.keystore \
     -alias typingmaster -keyalg RSA -keysize 2048 -validity 10000
   ```
   Put the keystore at `app/android/app/release-key.keystore`.
2. Create `app/android/keystore.properties` (gitignored):
   ```
   storeFile=release-key.keystore
   storePassword=...
   keyAlias=typingmaster
   keyPassword=...
   ```
3. Open `app/android/app/build.gradle` and wire `signingConfigs.release` to read those properties (Capacitor's template includes a stub).
4. From Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
5. Output: `app/android/app/release/app-release.aab` — upload to Play Console.

### iOS `.ipa` (App Store / TestFlight)
1. Xcode → top toolbar → device selector → **Any iOS Device (arm64)**.
2. **Product → Archive**. Wait ~3 min.
3. Window → Organizer → **Distribute App** → App Store Connect → Upload.
4. App Store Connect → TestFlight tab → invite testers.
5. Once verified by TestFlight, submit for App Store review.

---

## App-store readiness checklist

| | Android (Play) | iOS (App Store) |
|---|---|---|
| Developer account | $25 one-time | $99/yr |
| App icon (square) | 512×512 PNG | 1024×1024 PNG |
| Feature graphic | 1024×500 PNG | (none) |
| Screenshots | min 2, up to 8 | 6.7", 6.5", 5.5" sizes |
| Privacy policy URL | required | required |
| Data-safety disclosure | required | required (incl. analytics, auth tracking) |
| App preview video | optional | optional |
| Content rating questionnaire | required | required |
| Initial review time | 1-3 days | 1-7 days |

Your current data exposure (Supabase email + PostHog events) qualifies as "User Data Collected". Disclose it.

---

## Common gotchas

1. **WebView caches the old bundle.** After `cap sync`, fully kill and relaunch the app on the device — Android in particular happily serves a 5-day-old bundle if you just background/foreground. `adb shell pm clear com.scorp.typingmaster` nukes the cache.
2. **Status bar overlapping content on Android 15+.** Already handled — `overlaysWebView: false` in `capacitor.config.ts` reserves the space.
3. **iOS notch / Dynamic Island.** Our CSS already uses `env(safe-area-inset-*)` (Phase 4) so the layout adapts. Verify in the iPhone 15 Pro simulator.
4. **Service worker behavior in Capacitor.** The bundled web app DOES register the SW, but since the file:// scheme is served locally, the SW is largely redundant for offline (the WebView already has the bundle). Harmless either way.
5. **Supabase OAuth redirect.** Google sign-in via `signInWithOAuth` uses `window.location.origin`, which inside the WebView is `capacitor://localhost` (iOS) or `https://localhost` (Android). Supabase Auth → URL Configuration → add both as Allowed Redirect URLs before shipping.
6. **PostHog respects DNT.** Native users have no DNT default; consider adding an explicit analytics-opt-in toggle in Settings before shipping.

---

## Updating native dependencies

Capacitor releases majors every ~9 months. To upgrade:
```bash
npx @capacitor/cli@latest migrate
npm install
npm run cap:sync
```
Then re-test on both platforms before submitting another release.

---

## What this phase did NOT do

- **Did not actually compile Android / iOS** — that requires Android Studio / Xcode, which aren't installed on this dev box. The scaffolding, configuration, sync pipeline, and native-API wiring are all in place; producing `.aab` / `.ipa` files is a fresh-install-of-Android-Studio away.
- **Did not generate app store assets** (icons in every required size, screenshots, feature graphics). Capacitor expects them in `android/app/src/main/res/` and `ios/App/App/Assets.xcassets/`. There are CLI helpers like `cordova-res` / `@capacitor/assets` that auto-generate every size from one source image — recommended as a follow-up.
- **Did not migrate localStorage → native Preferences.** The native fallback is wired but unused. Migrating would let progress survive WebView cache wipes; ~30 min change in `store.ts` when you're ready.
- **Did not set up Crashlytics / Sentry-native.** Web Sentry / PostHog runs inside the WebView, but native crashes (rare, but possible in the native shell) won't surface. Add `@capacitor-community/sentry` when you go to production.
