import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the web app (built into dist/ by Vite) into native iOS and
// Android binaries. The dist/ output is served from the app bundle by a
// local WebView — no network round-trips for the app shell.
//
// To regenerate native projects after install:
//   npm run cap:add:android         (cross-platform)
//   npm run cap:add:ios             (requires macOS + CocoaPods)
//
// To sync web changes into the native projects after each web build:
//   npm run cap:sync

const config: CapacitorConfig = {
  appId: 'com.scorp.typingmaster',
  appName: 'Typing Master',
  webDir: 'dist',

  // The bundled web app talks to Supabase + PostHog over HTTPS — we let the
  // WebView use the public internet for those. Local app shell stays bundled.
  server: {
    androidScheme: 'https',
    // iosScheme defaults to 'capacitor'; leave as-is.
  },

  // Plugin configuration. Most defaults are sensible; we only override what
  // matters for brand consistency.
  plugins: {
    SplashScreen: {
      // Hide it as soon as our SPA mounts (we call SplashScreen.hide()
      // explicitly in lib/native.ts). Long fade-outs feel cheap.
      launchAutoHide: false,
      backgroundColor: '#07071a',
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },
    StatusBar: {
      // Default to dark-theme content (light text on dark bg). lib/native.ts
      // re-syncs whenever the user toggles theme.
      style: 'DARK',
      backgroundColor: '#07071a',
      overlaysWebView: false,
    },
    Keyboard: {
      // Resize behavior: 'native' is the iOS default and feels best for our
      // typing screen — the WebView shrinks rather than the page sliding up.
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },

  // Android-specific tweaks
  android: {
    allowMixedContent: false,
    captureInput: true,    // ensures hardware keyboards (Bluetooth) hit our keydown listener
    webContentsDebuggingEnabled: false, // flip to true when debugging via Chrome DevTools
  },

  // iOS-specific tweaks
  ios: {
    contentInset: 'always',
    // Standard scrolling inside the WebView; we handle scroll manually inside
    // the typing card. Leave overscroll off so the page doesn't bounce.
    scrollEnabled: false,
  },
};

export default config;
