// Screen-reader live region. Mounted once at the top of <App/>; any module
// can call `announce("message")` to push a string into the live region,
// which screen readers will read aloud politely.

import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

const message = signal<string>('');
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function announce(msg: string): void {
  message.value = msg;
  if (clearTimer) clearTimeout(clearTimer);
  // Clear after a moment so future announcements re-fire (assistive tech only
  // re-reads when the text actually changes).
  clearTimer = setTimeout(() => { message.value = ''; }, 1200);
}

export function A11yAnnouncer() {
  // Re-render on signal change.
  const text = message.value;
  // Keep the node in the DOM permanently — only the inner text changes.
  useEffect(() => () => { if (clearTimer) clearTimeout(clearTimer); }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >{text}</div>
  );
}
