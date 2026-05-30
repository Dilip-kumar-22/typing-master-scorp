// Focus trap for modal/drawer surfaces.
// - When `active` becomes true: focus the first focusable child, then trap
//   Tab/Shift+Tab inside the container.
// - When `active` becomes false: restore focus to the element that was
//   focused before the trap opened.
//
// Usage:
//   const ref = useRef<HTMLElement | null>(null);
//   useFocusTrap(ref, drawerOpen.value);

import { useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Defer first-focus by one frame so the surface has been laid out.
    const id = requestAnimationFrame(() => {
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      if (first) first.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const all: HTMLElement[] = [];
      container!.querySelectorAll<HTMLElement>(FOCUSABLE).forEach(el => {
        if (!el.hasAttribute('aria-hidden') && el.offsetParent !== null) all.push(el);
      });
      if (all.length === 0) return;
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKey);
      // Restore focus to whatever opened us, if it still exists.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active]);
}
