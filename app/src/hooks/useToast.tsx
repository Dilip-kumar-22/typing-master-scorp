// Toast host + hook. Mounted once at the top of <App/>.

import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

interface ToastItem {
  id: number;
  msg: string;
  /** Optional action button (label + handler). When present the toast is
   *  "sticky" — it does NOT auto-dismiss until the action or close is used. */
  action?: { label: string; onAct: () => void };
  sticky?: boolean;
}

const toasts = signal<ToastItem[]>([]);
let nextId = 1;

function dismiss(id: number): void {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

export function showToast(msg: string, ms = 2400): void {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, msg }];
  setTimeout(() => dismiss(id), ms);
}

/**
 * Sticky toast with a "Refresh" action, used by the PWA update flow. Stays on
 * screen until the user taps Refresh (which runs onRefresh → activates the new
 * service worker and reloads) or dismisses it. De-duped so repeated
 * onNeedRefresh callbacks don't stack multiple banners.
 */
export function showUpdateToast(onRefresh: () => void): void {
  if (toasts.value.some(t => t.sticky)) return; // already showing one
  const id = nextId++;
  toasts.value = [
    ...toasts.value,
    {
      id,
      msg: 'A new version is available.',
      sticky: true,
      action: { label: 'Refresh', onAct: onRefresh },
    },
  ];
}

export function ToastHost() {
  // Re-render whenever toasts change.
  const items = toasts.value;
  // CSS-driven in/out animation; we add `.in` shortly after mount.
  return (
    <div class="toast-host" id="toast-host" aria-live="polite" role="status">
      {items.map(t => <ToastView key={t.id} item={t} />)}
    </div>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelectorAll('.toast').forEach(el => el.classList.add('in'));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div class={'toast' + (item.action ? ' toast-action' : '')}>
      <span>{item.msg}</span>
      {item.action && (
        <button
          class="toast-btn"
          onClick={() => { item.action!.onAct(); dismiss(item.id); }}
        >{item.action.label}</button>
      )}
    </div>
  );
}
