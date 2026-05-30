// Tracks the browser's `beforeinstallprompt` event so we can offer an
// "Install app" button only when the platform supports it AND hasn't
// already been installed.

import { signal } from '@preact/signals';
import { track } from '../lib/analytics';

// Minimal shape of the event so we don't need a DOM lib polyfill.
interface BIPEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = signal<BIPEvent | null>(null);
export const isInstallable = signal(false);
export const isInstalled = signal(false);

export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return;

  // Already installed (Android Chrome / Edge / Brave)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled.value = true;
  }
  // iOS Safari has its own check
  if ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) {
    isInstalled.value = true;
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt.value = e as BIPEvent;
    isInstallable.value = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null;
    isInstallable.value = false;
    isInstalled.value = true;
  });
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const p = deferredPrompt.value;
  if (!p) return 'unavailable';
  track('install_prompted');
  await p.prompt();
  const { outcome } = await p.userChoice;
  deferredPrompt.value = null;
  isInstallable.value = false;
  track(outcome === 'accepted' ? 'install_accepted' : 'install_dismissed');
  return outcome;
}
