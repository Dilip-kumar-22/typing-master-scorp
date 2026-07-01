import { useEffect } from 'preact/hooks';
import {
  view, applyVisualSettings, applySettingsToAudio,
  restart, result, hydrateFromCloud,
  pickAndStart, activeTab, ADAPTIVE_MODE,
  primerOpen, history as sessionHistory,
} from './lib/store';
import { initAuth, currentUser } from './lib/auth';
import { initDevice } from './lib/device';
import { initInstallPrompt } from './hooks/useInstallPrompt';
import { initAnalytics, identify, reset, track } from './lib/analytics';
import {
  hideSplash, setStatusBar, initBackButton, isNative,
} from './lib/native';
import { drawerOpen, shortcutsHelpOpen, goHome as goHomeAction } from './lib/store';
import { hydrateSubscription, subscription } from './lib/billing';
import { showToast } from './hooks/useToast';
import { LESSONS, CHALLENGES } from './lib/data';
import { TopBar } from './components/TopBar';
import { Home } from './components/Home';
import { Practice } from './components/Practice';
import { ResultsOverlay } from './components/ResultsOverlay';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Primer } from './components/FingerGuide';
import { ToastHost } from './hooks/useToast';
import { useGlobalKeys } from './hooks/useGlobalKeys';
import { A11yAnnouncer } from './hooks/useA11yAnnouncer';

export function App() {
  useEffect(() => {
    initDevice();
    initInstallPrompt();
    initAnalytics();
    track('app_loaded', { platform: isNative() ? 'native' : 'web' });
    applyVisualSettings();
    applySettingsToAudio();

    // ─── Native (Capacitor) bootstrap ──────────────────
    // All of these are no-ops on the web.
    void hideSplash();
    void setStatusBar('dark', '#07071a');
    initBackButton({
      isOnHome: () => view.value === 'home',
      closeOverlay: () => {
        if (shortcutsHelpOpen.value) { shortcutsHelpOpen.value = false; return true; }
        if (result.value)            { result.value = null; return true; }
        if (drawerOpen.value)        { drawerOpen.value = false; return true; }
        return false;
      },
      goHome: goHomeAction,
    });

    // SEO deep-link handling: ?lesson=lesson-7 / ?mode=adaptive / ?mode=challenges
    // Landing pages link into the SPA with these params so users land on the
    // right thing without an extra click.
    const params = new URLSearchParams(window.location.search);
    const deepLesson = params.get('lesson');
    const deepMode = params.get('mode');
    if (deepLesson) {
      const lesson = LESSONS.find(l => l.id === deepLesson);
      const challenge = CHALLENGES.find(c => c.id === deepLesson);
      if (lesson) { pickAndStart(lesson); return; }
      if (challenge) { pickAndStart(challenge); return; }
    }
    if (deepMode === 'adaptive') { pickAndStart(ADAPTIVE_MODE); return; }
    if (deepMode === 'challenges') { activeTab.value = 'challenges'; }
    if (deepMode === 'multiplayer') { activeTab.value = 'multiplayer' as never; }
    if (deepMode === 'pricing') {
      // No dedicated pricing tab — the PricingPanel sits inline on Home.
      // Scroll to it after the first render so deep-linkers land on it.
      requestAnimationFrame(() => {
        document.querySelector('.pricing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Stripe Checkout redirects back with ?billing=success|canceled. Show a
    // toast, clear the param so a refresh doesn't re-toast, and re-hydrate
    // the subscription so the UI reflects the new tier immediately
    // (the webhook may take a beat to land).
    const billing = params.get('billing');
    if (billing === 'success') {
      showToast('Subscription activated — welcome to Pro! 🚀');
      void hydrateSubscription();
      track('checkout_completed');
      history.replaceState({}, '', window.location.pathname);
    } else if (billing === 'canceled') {
      showToast('Checkout canceled');
      track('checkout_canceled');
      history.replaceState({}, '', window.location.pathname);
    }

    restart();
    void initAuth();

    // First-timer welcome: open Chapter 0 (the visual finger primer) once, for
    // brand-new visitors only (no saved progress, haven't seen it, and not deep-
    // linked into a specific lesson/mode). Persisted so it never nags again.
    const SEEN_PRIMER = 'typing_master_seen_primer';
    const isFreshVisitor =
      !localStorage.getItem(SEEN_PRIMER) &&
      sessionHistory.value.length === 0 &&
      !deepLesson && !deepMode;
    if (isFreshVisitor) {
      primerOpen.value = true;
      try { localStorage.setItem(SEEN_PRIMER, '1'); } catch { /* ignore */ }
    }
  }, []);

  // Auto-pull from cloud whenever the user becomes signed-in.
  // Also identify / reset analytics + hydrate subscription tier.
  useEffect(() => {
    const u = currentUser.value;
    if (u) {
      void hydrateFromCloud();
      void hydrateSubscription();
      identify(u.id, { email: u.email });
      track('auth_signin');
    } else {
      reset();
      subscription.value = { tier: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false };
    }
  }, [currentUser.value]);

  useGlobalKeys();

  return (
    <>
      {/* Skip link wrapped in a nav landmark so no content sits outside a
          landmark (WCAG region check) while still being the first focusable. */}
      <nav class="skip-nav" aria-label="Skip links">
        <a href="#main" class="skip-link">Skip to main content</a>
      </nav>
      <TopBar />
      <main id="main" tabIndex={-1}>
        {view.value === 'home' ? <Home /> : <Practice />}
      </main>
      {result.value && <ResultsOverlay />}
      <SettingsDrawer />
      <ShortcutsModal />
      <Primer />
      <ToastHost />
      <A11yAnnouncer />
    </>
  );
}
