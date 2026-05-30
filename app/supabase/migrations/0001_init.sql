-- ============================================================
-- Typing Master · S-Corp — Initial schema
-- ============================================================
-- Apply this once to a fresh Supabase project:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Paste this file → Run
-- ============================================================

-- ─── profiles ──────────────────────────────────────────────
-- One row per auth user. Populated by the on-signup trigger below.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ─── sessions ──────────────────────────────────────────────
-- One row per completed typing session. Append-only from the client.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  mode_id text not null,
  mode_label text not null,
  wpm int not null check (wpm >= 0 and wpm <= 500),
  acc int not null check (acc >= 0 and acc <= 100),
  time_sec int not null check (time_sec >= 0),
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);
create index if not exists sessions_leaderboard_idx
  on public.sessions (mode_id, wpm desc, created_at desc);

-- ─── progress ──────────────────────────────────────────────
-- Single row per user — curriculum unlock state.
create table if not exists public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  unlocked_lessons text[] not null default array['lesson-1'],
  completed_lessons text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── leaderboard (view) ────────────────────────────────────
-- Public, anonymized 7-day top WPM per mode.
-- Safe for unauthenticated read because we only expose display_name.
create or replace view public.leaderboard as
  select
    p.display_name,
    s.mode_id,
    s.mode_label,
    s.wpm,
    s.acc,
    s.created_at
  from public.sessions s
  join public.profiles p on p.id = s.user_id
  where s.created_at >= now() - interval '7 days'
  order by s.wpm desc, s.created_at desc;

-- ─── RLS ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.progress enable row level security;

-- profiles: user reads/writes own row; everyone can read (for leaderboard names)
drop policy if exists "profiles_self_write" on public.profiles;
create policy "profiles_self_write" on public.profiles
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select using (true);

-- sessions: user reads/writes own rows; leaderboard view exposes the rest publicly
drop policy if exists "sessions_self_all" on public.sessions;
create policy "sessions_self_all" on public.sessions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sessions_public_read" on public.sessions;
create policy "sessions_public_read" on public.sessions
  for select using (true);

-- progress: strictly self-only
drop policy if exists "progress_self_all" on public.progress;
create policy "progress_self_all" on public.progress
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── on-signup trigger ─────────────────────────────────────
-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Typist'
    )
  )
  on conflict (id) do nothing;

  insert into public.progress (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
