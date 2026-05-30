// Compact avatar+menu for the topbar. Hidden when not signed in.

import { useState, useRef, useEffect } from 'preact/hooks';
import { currentUser, displayName, signOut, isSupabaseConfigured } from '../lib/auth';
import { hydrateFromCloud, syncing } from '../lib/store';

export function UserMenu() {
  if (!isSupabaseConfigured()) return null;
  const user = currentUser.value;
  if (!user) return null;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  const letter = (displayName.value || user.email || 'U').charAt(0).toUpperCase();

  return (
    <div class="user-menu" ref={ref}>
      <button class="user-avatar" title={user.email || ''} onClick={() => setOpen(!open)}>
        {letter}
        {syncing.value && <span class="user-sync-dot" />}
      </button>
      {open && (
        <div class="user-pop">
          <div class="user-pop-head">
            <div class="user-pop-name">{displayName.value || 'Typist'}</div>
            <div class="user-pop-email">{user.email}</div>
          </div>
          <button class="user-pop-item" disabled={syncing.value}
            onClick={() => { hydrateFromCloud(); setOpen(false); }}>
            {syncing.value ? 'Syncing…' : '↻ Refresh from cloud'}
          </button>
          <button class="user-pop-item danger"
            onClick={() => { signOut(); setOpen(false); }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
