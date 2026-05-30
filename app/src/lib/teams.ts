// Teams / B2B client layer.
//
// Same graceful pattern as the rest of the backend: every async call is a
// no-op (returns empty/error) when Supabase isn't configured. The PURE
// helpers at the top have no dependencies and are unit-tested.

import { signal } from '@preact/signals';
import { getSupabase } from './supabase';
import { currentUser } from './auth';
import { track } from './analytics';

export type OrgRole = 'owner' | 'teacher' | 'student';

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  seats: number;
  created_at: string;
}

export interface OrgMembership {
  org_id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string;
}

export interface RosterEntry {
  user_id: string;
  display_name: string;
  role: OrgRole;
  best_wpm: number;
  avg_acc: number;
  sessions: number;
  last_active: number | null; // ms epoch
}

// ─── PURE HELPERS (unit-tested, no deps) ───────────────────

const ROLE_RANK: Record<OrgRole, number> = { student: 0, teacher: 1, owner: 2 };

/** Can a member with `role` manage the roster (invite / remove students)? */
export function canManage(role: OrgRole | null | undefined): boolean {
  return role === 'owner' || role === 'teacher';
}

/** Higher rank can act on lower rank; equal/!lower cannot. */
export function roleOutranks(actor: OrgRole, target: OrgRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/** Seats remaining given total seats and current member count. Never < 0. */
export function seatsAvailable(totalSeats: number, memberCount: number): number {
  return Math.max(0, totalSeats - memberCount);
}

/** True if there's room to add `n` more members. */
export function canAddMembers(totalSeats: number, memberCount: number, n = 1): boolean {
  return seatsAvailable(totalSeats, memberCount) >= n;
}

// Invite codes: human-friendly, unambiguous (no 0/O/1/I/L), grouped 3-3.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function genInviteCode(rng: () => number = Math.random): string {
  let raw = '';
  for (let i = 0; i < 6; i++) raw += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return raw.slice(0, 3) + '-' + raw.slice(3); // e.g. "ABC-DEF"
}

/** Normalize user-entered codes: uppercase, strip non-alphanumerics, keep the
 *  raw 6 chars (the DB stores them with the dash; we compare on the raw). */
export function normalizeInviteCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 6) return cleaned; // caller validates length
  return cleaned.slice(0, 3) + '-' + cleaned.slice(3);
}

export function isValidInviteCodeShape(input: string): boolean {
  return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(normalizeInviteCode(input));
}

// ─── REACTIVE STATE ────────────────────────────────────────
export const myOrgs = signal<Organization[]>([]);
export const myMemberships = signal<OrgMembership[]>([]);
export const activeOrg = signal<Organization | null>(null);
export const roster = signal<RosterEntry[]>([]);
export const teamsLoading = signal(false);
export const teamsError = signal<string | null>(null);

export function isTeamsConfigured(): boolean {
  return getSupabase() != null;
}

export function myRoleIn(orgId: string): OrgRole | null {
  return myMemberships.value.find(m => m.org_id === orgId)?.role ?? null;
}

// ─── ASYNC (Supabase) ──────────────────────────────────────

export async function fetchMyOrgs(): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) { myOrgs.value = []; myMemberships.value = []; return; }
  teamsLoading.value = true;
  teamsError.value = null;
  try {
    const { data: mems, error: e1 } = await sb
      .from('org_members')
      .select('org_id, user_id, role, joined_at')
      .eq('user_id', user.id);
    if (e1) throw new Error(e1.message);
    myMemberships.value = (mems ?? []) as OrgMembership[];

    const ids = myMemberships.value.map(m => m.org_id);
    if (ids.length === 0) { myOrgs.value = []; return; }

    const { data: orgs, error: e2 } = await sb
      .from('organizations')
      .select('*')
      .in('id', ids);
    if (e2) throw new Error(e2.message);
    myOrgs.value = (orgs ?? []) as Organization[];
    if (!activeOrg.value && myOrgs.value.length) activeOrg.value = myOrgs.value[0];
  } catch (e) {
    teamsError.value = e instanceof Error ? e.message : String(e);
  } finally {
    teamsLoading.value = false;
  }
}

export async function createOrg(name: string): Promise<Organization | null> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return null;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) { teamsError.value = 'Name required'; return null; }
  teamsLoading.value = true;
  teamsError.value = null;
  try {
    const { data: org, error } = await sb
      .from('organizations')
      .insert({ name: trimmed, owner_id: user.id })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    // Owner is also a member with role 'owner'.
    await sb.from('org_members').insert({
      org_id: (org as Organization).id, user_id: user.id, role: 'owner',
    });
    track('team_org_created');
    await fetchMyOrgs();
    activeOrg.value = org as Organization;
    return org as Organization;
  } catch (e) {
    teamsError.value = e instanceof Error ? e.message : String(e);
    return null;
  } finally {
    teamsLoading.value = false;
  }
}

export async function createInvite(orgId: string, role: OrgRole = 'student'): Promise<string | null> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return null;
  teamsError.value = null;
  // Retry on the (very unlikely) code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = genInviteCode();
    const { error } = await sb.from('org_invites').insert({
      org_id: orgId, code, role, created_by: user.id,
    });
    if (!error) { track('team_invite_created', { role }); return code; }
    if (!String(error.message).toLowerCase().includes('unique')) {
      teamsError.value = error.message;
      return null;
    }
  }
  teamsError.value = 'Could not allocate invite code — try again';
  return null;
}

export async function redeemInvite(rawCode: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return { ok: false, error: 'Sign in first' };
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCodeShape(code)) return { ok: false, error: 'Invalid code format' };

  // Look up the invite (bearer-secret read allowed by RLS).
  const { data: inv, error } = await sb
    .from('org_invites')
    .select('org_id, role, email, expires_at')
    .eq('code', code)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!inv) return { ok: false, error: 'Code not found' };
  const invite = inv as { org_id: string; role: OrgRole; email: string | null; expires_at: string };
  if (new Date(invite.expires_at).getTime() < Date.now()) return { ok: false, error: 'Code expired' };
  if (invite.email && invite.email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return { ok: false, error: 'This code is bound to a different email' };
  }

  const { error: joinErr } = await sb.from('org_members').upsert({
    org_id: invite.org_id, user_id: user.id, role: invite.role,
  }, { onConflict: 'org_id,user_id' });
  if (joinErr) return { ok: false, error: joinErr.message };
  track('team_invite_redeemed', { role: invite.role });
  await fetchMyOrgs();
  return { ok: true };
}

export async function removeMember(orgId: string, userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('org_members')
    .delete().eq('org_id', orgId).eq('user_id', userId);
  if (error) { teamsError.value = error.message; return false; }
  track('team_member_removed');
  await fetchRoster(orgId);
  return true;
}

/** Build the roster: each member + their aggregate stats. Teachers can read
 *  member sessions via the RLS policy added in 0004_teams.sql. */
export async function fetchRoster(orgId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) { roster.value = []; return; }
  teamsLoading.value = true;
  teamsError.value = null;
  try {
    const { data: members, error: e1 } = await sb
      .from('org_members')
      .select('user_id, role, joined_at')
      .eq('org_id', orgId);
    if (e1) throw new Error(e1.message);
    const mems = (members ?? []) as { user_id: string; role: OrgRole; joined_at: string }[];
    if (mems.length === 0) { roster.value = []; return; }

    const ids = mems.map(m => m.user_id);

    // Profiles for display names.
    const { data: profiles } = await sb
      .from('profiles').select('id, display_name').in('id', ids);
    const nameOf = new Map<string, string>(
      ((profiles ?? []) as { id: string; display_name: string }[]).map(p => [p.id, p.display_name]),
    );

    // Sessions for stats (RLS lets a teacher see members' rows).
    const { data: sessions } = await sb
      .from('sessions')
      .select('user_id, wpm, acc, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(2000);

    roster.value = buildRoster(mems, nameOf, (sessions ?? []) as RosterSessionRow[]);
  } catch (e) {
    teamsError.value = e instanceof Error ? e.message : String(e);
  } finally {
    teamsLoading.value = false;
  }
}

// ─── Pure roster aggregation (unit-tested) ─────────────────
export interface RosterSessionRow { user_id: string; wpm: number; acc: number; created_at: string; }

export function buildRoster(
  members: { user_id: string; role: OrgRole }[],
  nameOf: Map<string, string>,
  sessions: RosterSessionRow[],
): RosterEntry[] {
  const byUser = new Map<string, RosterSessionRow[]>();
  for (const s of sessions) {
    const arr = byUser.get(s.user_id) ?? [];
    arr.push(s);
    byUser.set(s.user_id, arr);
  }
  const rows: RosterEntry[] = members.map(m => {
    const ss = byUser.get(m.user_id) ?? [];
    const best = ss.reduce((mx, s) => Math.max(mx, s.wpm), 0);
    const avgAcc = ss.length ? Math.round(ss.reduce((a, s) => a + s.acc, 0) / ss.length) : 0;
    const last = ss.reduce<number | null>((mx, s) => {
      const t = new Date(s.created_at).getTime();
      return mx == null || t > mx ? t : mx;
    }, null);
    return {
      user_id: m.user_id,
      display_name: nameOf.get(m.user_id) ?? 'Member',
      role: m.role,
      best_wpm: best,
      avg_acc: avgAcc,
      sessions: ss.length,
      last_active: last,
    };
  });
  // Teachers/owners first, then by best WPM desc.
  rows.sort((a, b) =>
    (ROLE_RANK[b.role] - ROLE_RANK[a.role]) || (b.best_wpm - a.best_wpm),
  );
  return rows;
}
