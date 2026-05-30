import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      // We already wrote our own manifest in public/ so VitePWA shouldn't
      // try to generate one — we just want the service worker.
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        // Cache Google Fonts (CSS + font files) for offline use.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gfonts-stylesheets',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'gfonts-files',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Skip Supabase API calls — those must always hit the network.
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
      },
      devOptions: {
        // Don't register the SW in `vite dev` — only `vite build` / preview.
        // Keeps the dev loop simple.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 400,
    // Code-splitting here comes entirely from DYNAMIC IMPORTS (Home tabs,
    // locales, analytics, billing) — that's what produces the first-paint
    // win. We intentionally do NOT use rollup `manualChunks`: @preact/preset-vite
    // overrides output.manualChunks, so it was silently a no-op. Shipping it
    // would be config that lies. Vendor-chunk caching across deploys is a
    // future option if the preset stops clobbering manualChunks.
  },
  test: {
    environment: 'jsdom',
    globals: false,
    // Vitest transforms test files with esbuild, which (unlike the build
    // pipeline) does NOT pick up the Preact JSX runtime from the preset.
    // Without this, `render(<x/>)` in a test produces React-shaped vnodes
    // that Preact's render() silently drops. This makes component tests work.
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
});
