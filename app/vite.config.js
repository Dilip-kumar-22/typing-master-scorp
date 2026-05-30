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
        rollupOptions: {
            output: {
                manualChunks: undefined,
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: false,
    },
});
