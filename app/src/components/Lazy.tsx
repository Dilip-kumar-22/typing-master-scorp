// Tiny lazy-component helper for Preact.
//
// Preact has no built-in `lazy`/`Suspense` (those live in preact/compat which
// would add weight). This is a 25-line replacement that:
//   1. Lazy-imports the module on first render
//   2. Shows a minimal placeholder while loading
//   3. Renders the resolved component on subsequent renders
//   4. Caches across re-renders so we don't re-fetch
//
// Usage:
//   const Multiplayer = lazyComponent(() => import('./Multiplayer').then(m => m.Multiplayer));
//   <Multiplayer />

import { useState, useEffect } from 'preact/hooks';
import type { ComponentType } from 'preact';

type AnyProps = Record<string, unknown>;

export function lazyComponent<P extends AnyProps>(
  loader: () => Promise<ComponentType<P>>,
): ComponentType<P> {
  let cached: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;

  return function Lazy(props: P) {
    const [, force] = useState(0);

    useEffect(() => {
      if (cached) return;
      if (!pending) {
        pending = loader().then(C => {
          cached = C;
        }).catch(err => {
          console.error('lazyComponent: failed to load', err);
        });
      }
      pending.then(() => force(t => t + 1));
    }, []);

    if (cached) {
      const C = cached;
      return <C {...props} />;
    }
    return <div class="lazy-spinner" aria-label="Loading">
      <div class="lazy-spinner-dot" />
      <div class="lazy-spinner-dot" />
      <div class="lazy-spinner-dot" />
    </div>;
  };
}
