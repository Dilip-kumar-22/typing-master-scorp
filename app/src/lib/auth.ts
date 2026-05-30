// Authentication state + actions.
// All operations are no-ops when Supabase isn't configured, so the rest of
// the app can call them unconditionally.

import { signal } from '@preact/signals';
import type { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { track } from './analytics';

export const currentUser = signal<User | null>(null);
export const authLoading = signal<boolean>(false);
export const displayName = signal<string>('');

/** Wires up the auth subscription. Call once at app startup. */
export async function initAuth(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  authLoading.value = true;
  const { data: { session } } = await sb.auth.getSession();
  currentUser.value = session?.user ?? null;
  if (session?.user) await refreshDisplayName(session.user.id);
  authLoading.value = false;

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser.value = session?.user ?? null;
    if (session?.user) refreshDisplayName(session.user.id);
    else displayName.value = '';
  });
}

async function refreshDisplayName(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  const row = data as { display_name?: string } | null;
  if (row?.display_name) displayName.value = row.display_name;
}

export async function signInWithEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Backend not configured' };
  authLoading.value = true;
  track('auth_signup_started', { method: 'email' });
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  authLoading.value = false;
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Backend not configured' };
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  track('auth_signout');
  await sb.auth.signOut();
  currentUser.value = null;
  displayName.value = '';
}

export async function updateDisplayName(name: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return { ok: false, error: 'Not signed in' };
  const trimmed = name.trim().slice(0, 32);
  if (!trimmed) return { ok: false, error: 'Display name required' };
  const { error } = await sb.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  displayName.value = trimmed;
  return { ok: true };
}

export { isSupabaseConfigured };
