// Sync layer: localStorage ↔ Supabase.
//
// Strategy = offline-first, last-write-wins.
//   • Every completed session is appended to localStorage immediately
//     (so it survives crashes and offline use).
//   • If the user is signed in, the session is ALSO pushed to Supabase.
//   • On sign-in, we pull the user's remote sessions + progress and merge
//     into localStorage. The local copy stays authoritative for reads;
//     remote is just the cross-device source of truth.
//
// No conflict UI required — sessions are append-only (each row has a UUID),
// and progress is a monotonic union (unlocked never shrinks).

import { getSupabase } from './supabase';
import { currentUser } from './auth';
import type { Session } from './types';
import type { DBLeaderboardRow, DBSession } from './supabase';

/** Push a completed session to Supabase. No-op when offline / unconfigured. */
export async function pushSession(session: Session): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return;
  await sb.from('sessions').insert({
    user_id: user.id,
    mode_id: session.modeId,
    mode_label: session.modeLabel,
    wpm: session.wpm,
    acc: session.acc,
    time_sec: session.time,
  });
}

/** Push curriculum progress (unlocked/completed lessons) to Supabase. */
export async function pushProgress(unlocked: string[], completed: string[]): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return;
  await sb.from('progress').upsert({
    user_id: user.id,
    unlocked_lessons: unlocked,
    completed_lessons: completed,
    updated_at: new Date().toISOString(),
  } as never);
}

/** Pull the user's recent sessions + progress from Supabase. */
export async function pullAll(): Promise<{
  sessions: Session[];
  unlocked: string[] | null;
  completed: string[] | null;
}> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return { sessions: [], unlocked: null, completed: null };

  const { data: rawSessions } = await sb
    .from('sessions')
    .select('mode_id,mode_label,wpm,acc,time_sec,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: progress } = await sb
    .from('progress')
    .select('unlocked_lessons,completed_lessons')
    .eq('user_id', user.id)
    .maybeSingle();

  const sessions: Session[] = (rawSessions || []).map(toSession).reverse();
  return {
    sessions,
    unlocked: progress?.unlocked_lessons ?? null,
    completed: progress?.completed_lessons ?? null,
  };
}

/** Fetch the global 7-day leaderboard. */
export async function fetchLeaderboard(limit = 25): Promise<DBLeaderboardRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('leaderboard')
    .select('*')
    .order('wpm', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as DBLeaderboardRow[];
}

// ─── Pure helpers (exported for testing) ─────────────────────

type RemoteSessionRow = Pick<
  DBSession,
  'mode_id' | 'mode_label' | 'wpm' | 'acc' | 'time_sec' | 'created_at'
>;

export function toSession(row: RemoteSessionRow): Session {
  return {
    date: new Date(row.created_at).getTime(),
    modeId: row.mode_id,
    modeLabel: row.mode_label,
    wpm: row.wpm,
    acc: row.acc,
    time: row.time_sec,
  };
}

/** Merge local + remote sessions. De-dupes by (date, modeId, wpm) tuple,
 *  keeps the most recent 20 sorted by date ascending. */
export function mergeSessions(local: Session[], remote: Session[]): Session[] {
  const key = (s: Session) => `${s.date}|${s.modeId}|${s.wpm}`;
  const seen = new Set<string>();
  const merged: Session[] = [];
  for (const s of [...local, ...remote]) {
    const k = key(s);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(s);
  }
  merged.sort((a, b) => a.date - b.date);
  return merged.slice(-20);
}

/** Monotonic union — unlocked/completed lessons should never SHRINK on sync. */
export function unionStrings(a: string[], b: string[] | null): string[] {
  if (!b) return [...a];
  return [...new Set([...a, ...b])];
}
