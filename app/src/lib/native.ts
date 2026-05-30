// Web-safe wrapper over Capacitor's native APIs.
//
// Every export here is a no-op on the web and a real native call inside the
// Capacitor WebView. The pattern: use `Capacitor.isNativePlatform()` to gate.
// This keeps the rest of the codebase platform-agnostic — no
// `if (isNative)` branches scattered through components.

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const platform = (): 'web' | 'ios' | 'android' => {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : 'web';
};

/** Sync the OS status bar to match the current theme (dark/light + brand color). */
export async function setStatusBar(theme: 'dark' | 'light', bgColor = '#07071a'): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    // Android only — iOS uses Info.plist for status-bar color.
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: bgColor });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch { /* permissions / very old OS — silently ignore */ }
}

/** Hide the launch splash. Called once the SPA has mounted + run useEffect. */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try { await SplashScreen.hide({ fadeOutDuration: 200 }); } catch { /* ignore */ }
}

/** Wire up the Android hardware back button. On the Home view it minimises
 *  the app; on Practice it returns to Home; in modals it closes them. */
export function initBackButton(handlers: {
  isOnHome: () => boolean;
  closeOverlay: () => boolean;   // returns true if it actually closed something
  goHome: () => void;
}): void {
  if (!isNative()) return;
  CapApp.addListener('backButton', () => {
    // 1. Close any open overlay first (drawer / results / shortcuts / modal).
    if (handlers.closeOverlay()) return;
    // 2. If we're not on Home, go Home.
    if (!handlers.isOnHome()) {
      handlers.goHome();
      return;
    }
    // 3. Already on Home — minimize the app rather than killing the process,
    //    so the user can come back where they were.
    CapApp.minimizeApp();
  });
}

/** Helpful for any future "shrink layout when keyboard appears" tweaks. */
export function onKeyboardShow(cb: (heightPx: number) => void): () => void {
  if (!isNative()) return () => {};
  const listener = Keyboard.addListener('keyboardWillShow', info => cb(info.keyboardHeight));
  return () => { void listener.then(l => l.remove()); };
}

/** Haptic feedback. Tiny tap for an error keystroke, sharper for completion. */
export async function hapticTap(): Promise<void> {
  if (!isNative()) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* ignore */ }
}
export async function hapticError(): Promise<void> {
  if (!isNative()) return;
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch { /* ignore */ }
}
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* ignore */ }
}

/** Native key-value store. Falls back to localStorage on the web. Useful if
 *  you ever want progress to survive WebView cache clears on native. */
export async function nativeSet(key: string, value: string): Promise<void> {
  if (isNative()) {
    try { await Preferences.set({ key, value }); return; } catch { /* fall through */ }
  }
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
export async function nativeGet(key: string): Promise<string | null> {
  if (isNative()) {
    try { const { value } = await Preferences.get({ key }); return value ?? null; } catch { /* fall through */ }
  }
  try { return localStorage.getItem(key); } catch { return null; }
}
