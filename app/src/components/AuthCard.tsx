// AuthCard — appears in the Home tabs as a "Cloud sync" panel.
// Hidden entirely when Supabase isn't configured.

import { useState } from 'preact/hooks';
import {
  currentUser, authLoading, displayName, signInWithEmail,
  signInWithGoogle, signOut, updateDisplayName, isSupabaseConfigured,
} from '../lib/auth';
import { hydrateFromCloud, syncing, lastSyncError } from '../lib/store';
import { showToast } from '../hooks/useToast';

export function AuthCard() {
  if (!isSupabaseConfigured()) return null;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const user = currentUser.value;

  async function onEmailSubmit(e: Event) {
    e.preventDefault();
    if (!email.includes('@')) {
      showToast('Enter a valid email');
      return;
    }
    const r = await signInWithEmail(email);
    if (r.ok) { setSent(true); showToast('Magic link sent to ' + email); }
    else showToast(r.error || 'Sign-in failed');
  }

  async function onGoogle() {
    const r = await signInWithGoogle();
    if (!r.ok) showToast(r.error || 'Google sign-in failed');
  }

  async function onSaveName() {
    const r = await updateDisplayName(name);
    if (r.ok) { setEditingName(false); showToast('Display name updated'); }
    else showToast(r.error || 'Could not update');
  }

  if (user) {
    return (
      <div class="auth-card signed-in">
        <div class="auth-head">
          <div class="auth-avatar">
            {(displayName.value || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div class="auth-name">
              {editingName ? (
                <input
                  class="auth-name-input"
                  value={name || displayName.value}
                  onInput={(e: Event) => setName((e.target as HTMLInputElement).value)}
                  placeholder="Display name"
                  maxLength={32}
                />
              ) : (displayName.value || 'Typist')}
            </div>
            <div class="auth-email">{user.email}</div>
          </div>
          {editingName ? (
            <div style="display:flex;gap:6px">
              <button class="btn ghost" onClick={() => { setEditingName(false); setName(''); }}>Cancel</button>
              <button class="btn primary" onClick={onSaveName}>Save</button>
            </div>
          ) : (
            <button class="btn ghost" onClick={() => { setEditingName(true); setName(displayName.value); }}>Edit name</button>
          )}
        </div>
        <div class="auth-actions">
          <button class="btn ghost" disabled={syncing.value} onClick={hydrateFromCloud}>
            {syncing.value ? 'Syncing…' : '↻ Refresh from cloud'}
          </button>
          <button class="btn ghost" onClick={signOut}>Sign out</button>
        </div>
        {lastSyncError.value && (
          <div class="auth-error">Last sync error: {lastSyncError.value}</div>
        )}
      </div>
    );
  }

  return (
    <div class="auth-card">
      <h3 class="auth-title">☁ Sync your progress across devices</h3>
      <p class="auth-sub">
        Optional. Without this you stay anonymous and your progress lives only in this browser.
        Sign in to back up your history, climb the global leaderboard, and pick up where you left off on any device.
      </p>

      <form onSubmit={onEmailSubmit} class="auth-form">
        <input
          class="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onInput={(e: Event) => setEmail((e.target as HTMLInputElement).value)}
          autocomplete="email"
          disabled={authLoading.value || sent}
        />
        <button class="btn primary" type="submit" disabled={authLoading.value || sent}>
          {sent ? 'Check your email ✓' : 'Send magic link'}
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <button class="btn ghost auth-google" onClick={onGoogle} disabled={authLoading.value}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
