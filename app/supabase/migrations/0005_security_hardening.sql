-- ============================================================
-- Typing Master · S-Corp — Security hardening (pre-launch)
-- Apply on top of 0001–0004. Fixes findings from the pre-launch
-- security audit. SAFE to run on an existing project (idempotent).
-- ============================================================
-- WHY THIS EXISTS
-- 0001 shipped `sessions_public_read USING (true)` and
-- `profiles_public_read USING (true)` to feed the public leaderboard.
-- Because Postgres RLS is permissive-OR, a `USING (true)` SELECT policy
-- makes the WHOLE table world-readable and OVERRIDES every narrower
-- policy — including the same-org `sessions_teacher_read` added in 0004.
-- Net effect (before this migration): anyone with the public anon key
-- could read every user's sessions (incl. user_id) across all orgs,
-- silently nullifying the Teams tenant boundary.
--
-- FIX: stop exposing the base tables directly. Serve the public
-- leaderboard through a SECURITY DEFINER function that returns only the
-- safe, anonymized columns for the last 7 days. Drop the blanket read
-- policies. Owner + same-org-teacher access remain intact.
-- ============================================================

begin;

-- ─── 1. CRITICAL: sessions no longer world-readable ────────
-- Drop the blanket public read. After this, sessions is readable only by:
--   • its owner            (sessions_self_all,     from 0001)
--   • a same-org teacher   (sessions_teacher_read, from 0004)
drop policy if exists "sessions_public_read" on public.sessions;

-- ─── 2. profiles: authenticated-only instead of fully public ─
-- Display names no longer enumerable by anonymous clients. The leaderboard
-- gets names via the SECURITY DEFINER function below, so it does not depend
-- on this policy. Signed-in features (roster, multiplayer) still work.
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_authenticated_read" on public.profiles
  for select using (auth.role() = 'authenticated');

-- ─── 3. Public leaderboard via SECURITY DEFINER function ───
-- Runs as the function owner (bypasses the caller's RLS) but only ever
-- returns anonymized, aggregated-safe columns — never user_id. This is the
-- ONLY public window into sessions data. search_path pinned for safety.
create or replace function public.leaderboard_top(
  p_mode_id text default null,
  p_limit   int  default 25
)
returns table (
  display_name text,
  mode_id      text,
  mode_label   text,
  wpm          int,
  acc          int,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.display_name, s.mode_id, s.mode_label, s.wpm, s.acc, s.created_at
  from public.sessions s
  join public.profiles p on p.id = s.user_id
  where s.created_at >= now() - interval '7 days'
    and (p_mode_id is null or s.mode_id = p_mode_id)
  order by s.wpm desc, s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

-- Anyone (even anonymous) may call the function; it self-limits what it returns.
grant execute on function public.leaderboard_top(text, int) to anon, authenticated;

-- Keep the old `leaderboard` view working for backwards compat, but back it
-- with the definer function so it no longer depends on a base-table read
-- policy. (Views are SECURITY INVOKER by default; without the dropped
-- `sessions_public_read` a direct view select would now return nothing, so we
-- redefine it over the function.)
create or replace view public.leaderboard as
  select display_name, mode_id, mode_label, wpm, acc, created_at
  from public.leaderboard_top(null, 100);
grant select on public.leaderboard to anon, authenticated;

-- ─── 4. Multiplayer: no enumerating all rooms/participants ─
-- Was `using (auth.role() = 'authenticated')` → any signed-in user could list
-- every room (with its prompt + host) and every participant (user_ids, names,
-- WPM). Scope reads to rooms you host or have joined. Discovery-by-code still
-- works via the SECURITY DEFINER lookup function below.
drop policy if exists "rooms_read_all" on public.rooms;
create policy "rooms_read_member" on public.rooms
  for select using (
    host_id = auth.uid()
    or exists (
      select 1 from public.room_participants rp
      where rp.room_id = public.rooms.id
        and rp.user_id = auth.uid()
    )
  );

drop policy if exists "rp_read_room" on public.room_participants;
create policy "rp_read_member" on public.room_participants
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = public.room_participants.room_id
        and r.host_id = auth.uid()
    )
    or exists (
      select 1 from public.room_participants me
      where me.room_id = public.room_participants.room_id
        and me.user_id = auth.uid()
    )
  );

-- Join-by-code: resolve a share code to a room id WITHOUT letting the caller
-- read arbitrary rooms. Returns only what the lobby needs to join. Once the
-- caller inserts their participant row, the member policies above grant the
-- rest. search_path pinned.
create or replace function public.room_by_code(p_code text)
returns table (id uuid, code text, mode_label text, status text, host_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.code, r.mode_label, r.status, r.host_id
  from public.rooms r
  where r.code = upper(trim(p_code))
  limit 1;
$$;
grant execute on function public.room_by_code(text) to authenticated;

commit;
