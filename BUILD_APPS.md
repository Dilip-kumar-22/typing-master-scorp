# Building the native apps

This Windows machine has **no Android SDK / JDK and cannot run Apple's
toolchain**, so native binaries are built **in the cloud** via GitHub Actions
(now that the repo lives at `github.com/Dilip-kumar-22/typing-master-scorp`).

---

## Android — installable APK (works today, free)

A workflow at `.github/workflows/android.yml` builds a **debug APK** on every
push to `main` (or manually via the Actions tab → "Run workflow").

**Get the app on your phone:**
1. GitHub → **Actions** tab → open the latest **"Android build (debug APK)"** run.
2. Wait for the green check (~5–8 min the first time).
3. Scroll to **Artifacts** → download **`typing-master-debug-apk`** (a .zip).
4. Unzip → copy the `.apk` to your Android phone (USB, Drive, email to yourself…).
5. Tap it to install. First time, Android asks to allow "Install unknown apps"
   for your file manager — allow it, then install.

> This is a **debug** build: perfect for testing on your own devices, **not**
> for the Play Store (debug-signed, not optimized).

### Android — release AAB for the Play Store (when you're ready)
Needs a **signing keystore** (your app's permanent identity — keep it safe):
1. Generate once (on any machine with the JDK, or I can add a CI step):
   `keytool -genkey -v -keystore release.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. Add to GitHub repo **Settings → Secrets and variables → Actions**:
   `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
3. Tell me, and I'll add a `bundleRelease` job that outputs a signed `.aab`.

---

## iOS — the honest situation

You **cannot** produce an installable iPhone app from Windows, and an
installable `.ipa` requires an **Apple Developer Program membership ($99/yr)**
for code signing — there is no free workaround for installing on a real device.

Two real paths once you have that membership:
- **A Mac with Xcode** — open `app/ios/App` and Archive.
- **CI on GitHub macOS runners** — I can add an `ios.yml` workflow. Note macOS
  CI minutes bill at **10×** on private repos, so I'd make it **manual-only**.
  It still needs your Apple signing certs/profiles added as secrets to produce
  a device-installable build (an unsigned/simulator build can't be installed on
  a physical iPhone).

Tell me if you have (or will get) an Apple Developer account and I'll wire it up.
