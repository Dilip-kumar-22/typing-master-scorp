// Toast host + hook. Mounted once at the top of <App/>.

import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

interface ToastItem { id: number; msg: string; }

const toasts = signal<ToastItem[]>([]);
let nextId = 1;

export function showToast(msg: string, ms = 2400): void {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, msg }];
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, ms);
}

export function ToastHost() {
  // Re-render whenever toasts change.
  const items = toasts.value;
  // CSS-driven in/out animation; we add `.in` shortly after mount.
  return (
    <div class="toast-host" id="toast-host">
      {items.map(t => <ToastView key={t.id} msg={t.msg} />)}
    </div>
  );
}

function ToastView({ msg }: { msg: string }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelectorAll('.toast').forEach(el => el.classList.add('in'));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return <div class="toast">{msg}</div>;
}
