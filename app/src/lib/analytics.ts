// Analytics wrapper — PostHog under the hood, no-op without env vars.
//
// Phase 10: PostHog is DYNAMICALLY IMPORTED only when `VITE_POSTHOG_KEY` is
// set. For local-dev / unconfigured deploys we skip the ~25 KB-gzipped
// posthog-js download entirely. The track() / identify() / reset() public
// API is unchanged — calls before the SDK has finished loading are queued
// and flushed once it lands.

type PostHogLib = typeof import('posthog-js').default;

let ph: PostHogLib | null = null;
let inited = false;
let loading: Promise<void> | null = null;
const queue: Array<() => void> = [];

export function isAnalyticsConfigured(): boolean {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  return typeof key === 'string' && key.length > 10;
}

export function initAnalytics(): void {
  if (inited) return;
  inited = true;
  if (!isAnalyticsConfigured()) return;

  loading = import('posthog-js').then(({ default: posthog }) => {
    const key = import.meta.env.VITE_POSTHOG_KEY as string;
    const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';
    posthog.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: true,
      persistence: 'localStorage',
      disable_session_recording: true,
      respect_dnt: true,
    });
    ph = posthog;
    // Flush any events that fired while we were loading.
    for (const fn of queue.splice(0)) fn();
  }).catch(err => {
    console.warn('analytics: failed to load posthog-js', err);
  });
}

function withSDK(fn: (sdk: PostHogLib) => void): void {
  if (ph) { fn(ph); return; }
  if (loading) queue.push(() => { if (ph) fn(ph); });
  // else: not configured, silently drop
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  withSDK(sdk => sdk.identify(userId, props));
}
export function reset(): void {
  withSDK(sdk => sdk.reset());
}
export function track(event: string, props?: Record<string, unknown>): void {
  withSDK(sdk => sdk.capture(event, props));
}
export function trackWithContext(
  event: string,
  ctx: { modeId?: string; modeLabel?: string; extra?: Record<string, unknown> },
): void {
  withSDK(sdk => sdk.capture(event, {
    mode_id: ctx.modeId,
    mode_label: ctx.modeLabel,
    ...(ctx.extra || {}),
  }));
}
