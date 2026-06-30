// PWA service-worker registration with an explicit update prompt.
//
// We use vite-plugin-pwa's `prompt` mode: when a new build is deployed, the new
// service worker installs in the background and then waits. Instead of silently
// activating it on some future reload (the old 'autoUpdate' behavior — which
// left returning visitors on a stale cache), we surface a toast with a Refresh
// action. Clicking it activates the new SW and reloads, so the user gets the
// latest version immediately.
//
// `virtual:pwa-register` is provided by vite-plugin-pwa at build time. In dev
// (devOptions.enabled: false) the import resolves to a no-op stub, so guarding
// is still polite.

import { registerSW } from 'virtual:pwa-register';
import { showUpdateToast } from '../hooks/useToast';

export function initPwa(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    onNeedRefresh() {
      // A new version is waiting. Offer a one-tap refresh.
      showUpdateToast(() => { void updateSW(true); });
    },
    onOfflineReady() {
      // First install cached — app now works offline. (Quiet; no toast needed.)
    },
  });
}
