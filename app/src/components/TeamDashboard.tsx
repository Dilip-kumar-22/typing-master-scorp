// Team / classroom dashboard (Phase 11).
//
// Two faces in one component:
//   • Teacher/owner view — create org, invite (code + link), roster table
//     with per-student stats, remove student, seat usage.
//   • Student/no-org view — join by code, or a prompt to create an org.
//
// Lazy-loaded from Home, and only when Supabase is configured.

import { useEffect, useState } from 'preact/hooks';
import { currentUser } from '../lib/auth';
import {
  myOrgs, activeOrg, roster, teamsLoading, teamsError,
  fetchMyOrgs, createOrg, createInvite, redeemInvite, removeMember,
  fetchRoster, myRoleIn, canManage, seatsAvailable,
  isTeamsConfigured,
} from '../lib/teams';
import { showToast } from '../hooks/useToast';
import { timeAgo } from '../lib/utils';

export function TeamDashboard() {
  if (!isTeamsConfigured()) {
    return (
      <div class="tab-content">
        <div class="section-head"><h2>🏫 Teams</h2></div>
        <div class="mp-empty">Teams need cloud sync. See SUPABASE_SETUP.md to enable.</div>
      </div>
    );
  }
  if (!currentUser.value) {
    return (
      <div class="tab-content">
        <div class="section-head"><h2>🏫 Teams</h2></div>
        <div class="mp-empty">Sign in to create a classroom or join one with a code. Cloud-sync panel above ↑</div>
      </div>
    );
  }

  useEffect(() => { void fetchMyOrgs(); }, [currentUser.value]);

  const orgs = myOrgs.value;
  const org = activeOrg.value;

  return (
    <div class="tab-content">
      <div class="section-head">
        <h2>🏫 Teams &amp; Classrooms</h2>
        <p>Create a classroom, invite students with a code, and track everyone's progress. Team plan recommended for 10+ seats.</p>
      </div>

      {teamsError.value && <div class="pricing-error">{teamsError.value}</div>}

      {orgs.length === 0 ? <NoOrgView /> : (
        <>
          {orgs.length > 1 && <OrgSwitcher />}
          {org && <OrgView orgId={org.id} />}
        </>
      )}
    </div>
  );
}

function OrgSwitcher() {
  return (
    <div class="team-switcher">
      <label class="lb-filter-lbl">Classroom:</label>
      <select
        class="lb-filter-select"
        value={activeOrg.value?.id}
        onChange={(e: Event) => {
          const id = (e.target as HTMLSelectElement).value;
          activeOrg.value = myOrgs.value.find(o => o.id === id) ?? null;
        }}
      >
        {myOrgs.value.map(o => <option value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

function NoOrgView() {
  const [name, setName] = useState('');
  // Prefill the join code from an invite link (/?join=ABC-DEF), consumed once.
  const pending = (window as unknown as { __pendingJoinCode?: string }).__pendingJoinCode;
  const [code, setCode] = useState(pending ?? '');
  const [busy, setBusy] = useState(false);
  if (pending) delete (window as unknown as { __pendingJoinCode?: string }).__pendingJoinCode;

  async function create() {
    if (name.trim().length < 1) return;
    setBusy(true);
    const org = await createOrg(name);
    setBusy(false);
    if (org) showToast(`Classroom "${org.name}" created`);
  }
  async function join() {
    setBusy(true);
    const r = await redeemInvite(code);
    setBusy(false);
    if (r.ok) showToast('Joined classroom');
    else showToast(r.error || 'Could not join');
  }

  return (
    <div class="mp-lobby">
      <div class="mp-card mp-card-host">
        <h3>Create a classroom</h3>
        <p>You'll be the owner. Invite students with a code, track their WPM and accuracy.</p>
        <input
          class="auth-input"
          placeholder="e.g. Period 3 — Typing 101"
          value={name}
          maxLength={80}
          onInput={(e: Event) => setName((e.target as HTMLInputElement).value)}
          aria-label="Classroom name"
        />
        <button class="btn primary lg" style="margin-top:10px" disabled={busy || !name.trim()} onClick={create}>
          {busy ? 'Creating…' : 'Create classroom →'}
        </button>
      </div>
      <div class="mp-card mp-card-join">
        <h3>Join a classroom</h3>
        <p>Enter the 6-character code from your teacher.</p>
        <div class="mp-join-form">
          <input
            class="auth-input mp-code-input"
            placeholder="ABC-DEF"
            maxLength={7}
            value={code}
            onInput={(e: Event) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
            aria-label="Invite code"
          />
          <button class="btn primary" disabled={busy || code.length < 6} onClick={join}>
            {busy ? '…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrgView({ orgId }: { orgId: string }) {
  const role = myRoleIn(orgId);
  const org = myOrgs.value.find(o => o.id === orgId)!;
  const manage = canManage(role);

  useEffect(() => { void fetchRoster(orgId); }, [orgId]);

  const r = roster.value;
  const seatsLeft = seatsAvailable(org.seats, r.length);

  return (
    <div class="team-org">
      <div class="team-org-head">
        <div>
          <div class="mp-eyebrow">Classroom</div>
          <h3 class="team-org-name">{org.name}</h3>
        </div>
        <div class="team-org-meta">
          <span class="team-stat"><strong>{r.length}</strong> members</span>
          <span class="team-stat"><strong>{seatsLeft}</strong> seats left</span>
          <span class="team-role-badge">{role}</span>
        </div>
      </div>

      {manage && <InviteBar orgId={orgId} seatsLeft={seatsLeft} />}

      <RosterTable orgId={orgId} canManage={manage} />
    </div>
  );
}

function InviteBar({ orgId, seatsLeft }: { orgId: string; seatsLeft: number }) {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite() {
    if (seatsLeft <= 0) { showToast('No seats left — upgrade your Team plan'); return; }
    setBusy(true);
    const c = await createInvite(orgId, 'student');
    setBusy(false);
    if (c) { setCode(c); showToast('Invite code created'); }
  }
  function copyCode() {
    if (code && navigator.clipboard) navigator.clipboard.writeText(code).then(() => showToast('Code copied'));
  }
  function copyLink() {
    if (!code) return;
    const link = `${window.location.origin}/?join=${encodeURIComponent(code)}`;
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => showToast('Invite link copied'));
  }

  return (
    <div class="team-invite-bar">
      {!code ? (
        <button class="btn primary" disabled={busy} onClick={invite}>
          {busy ? 'Creating…' : '+ Create invite code'}
        </button>
      ) : (
        <div class="team-invite-result">
          <span class="team-invite-code" onClick={copyCode} title="Click to copy">{code}</span>
          <button class="btn ghost" onClick={copyCode}>Copy code</button>
          <button class="btn ghost" onClick={copyLink}>Copy invite link</button>
          <button class="btn" onClick={() => setCode(null)}>New code</button>
        </div>
      )}
    </div>
  );
}

function RosterTable({ orgId, canManage: manage }: { orgId: string; canManage: boolean }) {
  const r = roster.value;
  if (teamsLoading.value && r.length === 0) return <div class="lb-empty">Loading roster…</div>;
  if (r.length === 0) return <div class="lb-empty">No members yet. Share an invite code to get started.</div>;

  async function kick(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this classroom?`)) return;
    const ok = await removeMember(orgId, userId);
    if (ok) showToast(`${name} removed`);
  }

  return (
    <div class="lb-table team-roster">
      <div class="lb-head team-roster-row">
        <div>Member</div><div>Role</div><div>Best WPM</div><div>Avg Acc</div><div>Sessions</div><div>Last active</div>
        {manage && <div></div>}
      </div>
      {r.map(m => (
        <div class="lb-row team-roster-row" key={m.user_id}>
          <div class="lb-name">{m.display_name}</div>
          <div class="team-role-cell">{m.role}</div>
          <div class="lb-wpm">{m.best_wpm}</div>
          <div>{m.avg_acc}%</div>
          <div>{m.sessions}</div>
          <div class="lb-when">{m.last_active ? timeAgo(m.last_active) : '—'}</div>
          {manage && (
            <div>
              {m.role === 'student'
                ? <button class="team-kick" title="Remove" onClick={() => kick(m.user_id, m.display_name)}>✕</button>
                : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
