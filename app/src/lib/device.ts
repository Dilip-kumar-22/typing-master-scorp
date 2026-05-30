// Device / capability detection. SSR-safe (window guards) and reactive — we
// update on resize so rotating a phone or resizing a desktop window flips
// `isTouchDevice` and `isCompactViewport` immediately.

import { signal, computed } from '@preact/signals';

export const isTouchDevice = signal(false);
export const viewportWidth = signal(0);
export const reducedMotion = signal(false);

export const isCompactViewport = computed(() => viewportWidth.value > 0 && viewportWidth.value < 900);
export const isMobileViewport  = computed(() => viewportWidth.value > 0 && viewportWidth.value < 600);

export function initDevice(): void {
  if (typeof window === 'undefined') return;

  const touchQuery = window.matchMedia('(pointer: coarse)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const update = () => {
    isTouchDevice.value = touchQuery.matches;
    viewportWidth.value = window.innerWidth;
    reducedMotion.value = motionQuery.matches;
    // Side-effect: also flip a body class so CSS can react.
    document.body.classList.toggle('is-touch', touchQuery.matches);
    document.body.classList.toggle('is-mobile', window.innerWidth < 600);
    document.body.classList.toggle('reduce-motion', motionQuery.matches);
  };

  update();
  window.addEventListener('resize', update, { passive: true });
  touchQuery.addEventListener('change', update);
  motionQuery.addEventListener('change', update);
}
