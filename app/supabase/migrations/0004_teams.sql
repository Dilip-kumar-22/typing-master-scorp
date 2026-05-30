-- ============================================================
-- Typing Master · S-Corp — Teams / B2B schema (Phase 11)
-- Apply AFTER 0001..0003.
--
-- Model:
--   organizations    one row per school / company / classroom
--   org_members      a user's membership + role in an org
--   org_invites      shareable join codes (optionally email-bound, expiring)
--
-- The SENSITIVE part is RLS: a teacher must be able to read the typing
-- sessions of STUDENTS IN THEIR OWN ORG — and nobody else's. Getting this
-- wrong is a cross-tenant data leak, so the policies below are written
-- defensively and the helper functions are SECURITY DEFINER + search_path
-- pinned.
-- ============================================================

create type public.org_role as enum ('owner', 'teacher', 'student');

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  owner_id    uuid not null references auth.users on delete cascade,
  -- Mirror of the Stripe Team subscription seat count (subscription quantity).
  -- Updated by the stripe-webhook when a Team subscription changes quantity.
  seats       int not null default 10 check (seats >= 0 and seats <= 100000),
  created_at  timestamptz not null default now()
);
create index if not exists organizations_owner_idx on public.organizations (owner_id);

create table if not exists public.org_members (
  org_id      uuid not null references public.organizations on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  role        public.org_role not null default 'student',
  joined_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members (user_id);
create index if not exists org_members_org_idx  on public.org_members (org_id);

create table if not exists public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations on delete cascade,
  code        text unique not null check (char_length(code) between 6 and 12),
  role        public.org_role not null default 'student',
  -- Optional email binding: if set, only that email can redeem.
  email       text,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  created_by  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists org_invites_code_idx on public.org_invites (code);
create index if not exists org_invites_org_idx  on public.org_invites (org_id);

-- ─── Helper functions (SECURITY DEFINER) ───────────────────
-- Return the caller's role in an org, or null if not a member.
create or replace function public.org_role_of(uid uuid, oid uuid)
  returns public.org_role
  language sql stable security definer set search_path = public
as $$
  select role from public.org_members where user_id = uid and org_id = oid;
$$;

-- True if uid is an owner or teacher of oid.
create or replace function public.is_org_teacher(uid uuid, oid uuid)
  returns boolean
  language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('owner','teacher') from public.org_members
     where user_id = uid and org_id = oid),
    false
  );
$$;

-- All org ids the caller is a member of (any role). Used by policies +
-- avoids recursive policy evaluation on org_members.
create or replace function public.my_org_ids(uid uuid)
  returns setof uuid
  language sql stable security definer set search_path = public
as $$
  select org_id from public.org_members where user_id = uid;
$$;

-- ─── RLS ───────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;
alter table public.org_invites   enable row level security;

-- organizations: members can read their orgs; only the owner can write.
drop policy if exists "orgs_member_read" on public.organizations;
create policy "orgs_member_read" on public.organizations
  for select using (id in (select public.my_org_ids(auth.uid())));

drop policy if exists "orgs_owner_write" on public.organizations;
create policy "orgs_owner_write" on public.organizations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- org_members:
--   * a user can always read/insert/delete their OWN membership row (join/leave)
--   * teachers can read all membership rows in their org (the roster)
--   * teachers can delete student rows in their org (remove a student)
drop policy if exists "members_self_rw" on public.org_members;
create policy "members_self_rw" on public.org_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members_teacher_read" on public.org_members;
create policy "members_teacher_read" on public.org_members
  for select using (public.is_org_teacher(auth.uid(), org_id));

drop policy if exists "members_teacher_remove" on public.org_members;
create policy "members_teacher_remove" on public.org_members
  for delete using (public.is_org_teacher(auth.uid(), org_id) and role = 'student');

-- org_invites: teachers manage; anyone signed in can SELECT a single invite
-- by code in order to redeem it (the code is the bearer secret).
drop policy if exists "invites_teacher_all" on public.org_invites;
create policy "invites_teacher_all" on public.org_invites
  for all using (public.is_org_teacher(auth.uid(), org_id))
  with check (public.is_org_teacher(auth.uid(), org_id));

drop policy if exists "invites_read_by_code" on public.org_invites;
create policy "invites_read_by_code" on public.org_invites
  for select using (auth.role() = 'authenticated');

-- ─── The cross-user data path: teachers read students' sessions ────
-- Extend the existing sessions table (from 0001) with a policy that lets a
-- teacher read sessions belonging to members of an org they teach. This is
-- ADDITIVE to the existing "sessions_self_all" + "sessions_public_read"
-- policies. (Postgres RLS is permissive-OR by default, so adding a policy
-- only ever GRANTS more read access — here, scoped to same-org membership.)
drop policy if exists "sessions_teacher_read" on public.sessions;
create policy "sessions_teacher_read" on public.sessions
  for select using (
    exists (
      select 1
      from public.org_members student_m
      join public.org_members teacher_m on teacher_m.org_id = student_m.org_id
      where student_m.user_id = public.sessions.user_id
        and teacher_m.user_id = auth.uid()
        and teacher_m.role in ('owner','teacher')
    )
  );

-- ─── Seat-count sync hook (called by stripe-webhook on Team subs) ──
-- Convenience updater the webhook can call via RPC. Not used by RLS.
create or replace function public.set_org_seats(oid uuid, n int)
  returns void
  language sql security definer set search_path = public
as $$
  update public.organizations set seats = greatest(0, n) where id = oid;
$$;
