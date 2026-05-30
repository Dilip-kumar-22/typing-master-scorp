// Mobile soft-keyboard capture.
//
// Touch devices don't fire `keydown` for OS-keyboard characters. To capture
// them we mount a hidden but focused <textarea>, then translate its `input`
// events into LogicalInput dispatched through the same processing core as
// desktop. The textarea content is discarded — it's a sponge for keystrokes.

import { useEffect, useRef } from 'preact/hooks';
import { view, drawerOpen, result, tutorialActive } from '../lib/store';
import { isTouchDevice } from '../lib/device';
import { processInput } from '../lib/input';

interface InputEventWithType extends Event {
  inputType?: string;
  data?: string | null;
}

export function useMobileInput() {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Keep the textarea focused whenever the practice view is open on touch.
  useEffect(() => {
    if (!isTouchDevice.value) return;
    if (view.value !== 'practice') return;
    if (drawerOpen.value || result.value || tutorialActive.value) return;

    const t = ref.current;
    if (!t) return;
    const id = requestAnimationFrame(() => t.focus({ preventScroll: true } as FocusOptions));
    return () => cancelAnimationFrame(id);
  });

  function onInput(e: Event) {
    const evt = e as InputEventWithType;
    const t = ref.current;
    if (t) t.value = '';            // immediately drain the sponge
    const type = evt.inputType || '';

    if (type === 'deleteContentBackward' || type === 'deleteContentForward') {
      processInput({ kind: 'backspace' });
      return;
    }
    if (type === 'insertLineBreak') {
      processInput({ kind: 'char', char: '\n' });
      return;
    }
    if (evt.data) {
      // Some IMEs deliver multi-char insertions (autocomplete, paste).
      // Treat each char as its own input event.
      for (const c of evt.data) {
        processInput({ kind: 'char', char: c });
      }
    }
  }

  // The textarea itself: visually nil, fully accessible to focus + OS keyboard.
  if (!isTouchDevice.value) return null;
  if (view.value !== 'practice') return null;

  return (
    <textarea
      ref={ref}
      class="mobile-input-sponge"
      onInput={onInput}
      autocapitalize="off"
      autocorrect="off"
      autocomplete="off"
      spellcheck={false}
      inputMode="text"
      aria-label="Typing input"
    />
  );
}
