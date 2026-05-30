// Global desktop keyboard handler. The actual scoring/state logic lives in
// lib/input.ts so the mobile-input hook can call it too.

import { useEffect } from 'preact/hooks';
import {
  view, drawerOpen, shortcutsHelpOpen, zen, result, tutorialActive,
  prompt, pos, activeKeys,
} from '../lib/store';
import { processInput, hasStartedTyping } from '../lib/input';

export function useGlobalKeys(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      // Universal hotkeys (work anywhere).
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        zen.value = !zen.value;
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        drawerOpen.value = !drawerOpen.value;
        return;
      }

      // Outside practice → only `?` works.
      if (view.value !== 'practice') {
        const target = e.target as HTMLElement | null;
        if (
          e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey &&
          target && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          shortcutsHelpOpen.value = !shortcutsHelpOpen.value;
        }
        return;
      }

      // In practice but UI is overlaying — let the store gating handle it
      // (we still mark the visual "down" for non-blocking keys below).
      if (drawerOpen.value || result.value || tutorialActive.value) return;

      // Visual "key pressed" marker on the 3D heatmap.
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.code;
      activeKeys.value = new Set([...activeKeys.value, k]);

      if (e.key === 'Escape') {
        e.preventDefault();
        processInput({ kind: 'escape' });
        return;
      }

      const expected = prompt.value[pos.value];
      // Plain Tab restarts (Ctrl/Shift/Alt/Meta+Tab keeps OS behavior).
      if (
        e.key === 'Tab' && expected !== '\t' &&
        !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey
      ) {
        e.preventDefault();
        processInput({ kind: 'tab' });
        return;
      }

      if (e.key === '?' && !hasStartedTyping()) {
        e.preventDefault();
        shortcutsHelpOpen.value = !shortcutsHelpOpen.value;
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        processInput({ kind: 'backspace' });
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Resolve into a LogicalInput.
      let char: string | null = null;
      if (e.key === 'Enter') char = '\n';
      else if (e.key === 'Tab') char = '\t'; // expected === '\t' fell through above
      else if (e.key.length === 1) char = e.key;

      if (char == null) return;
      e.preventDefault();
      processInput({ kind: 'char', char });
    }

    function onKeyUp(e: KeyboardEvent): void {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.code;
      if (!activeKeys.value.has(k)) return;
      const next = new Set(activeKeys.value);
      next.delete(k);
      activeKeys.value = next;
    }

    function onBlur(): void {
      if (activeKeys.value.size === 0) return;
      activeKeys.value = new Set();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
