-- ============================================================
-- Typing Master · S-Corp — Multiplayer schema (Phase 6c)
-- Apply on top of 0001_init.sql.
-- ============================================================

-- A room is a private race lobby identified by a short share code.
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null check (char_length(code) between 4 and 8),
  host_id     uuid not null references auth.users on delete cascade,
  prompt      text not null,
  mode_label  text not null,
  status      text not null default 'waiting'
              check (status in ('waiting', 'racing', 'finished')),
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists rooms_code_idx     on public.rooms (code);
create index if not exists rooms_created_idx  on public.rooms (created_at desc);

-- Each participant in a room. Live cursor position is broadcast via the
-- Realtime channel (not stored row-by-row to avoid write amplification).
-- The final WPM/accuracy ARE written when the race ends.
create table if not exists public.room_participants (
  room_id      uuid not null references public.rooms on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null,
  final_wpm    int,
  final_acc    int,
  finished_at  timestamptz,
  joined_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists rp_room_idx on public.room_participants (room_id);

-- RLS ────────────────────────────────────────────────────────
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;

-- Anyone signed-in can read a room (they need the code to find it though).
drop policy if exists "rooms_read_all"     on public.rooms;
create policy "rooms_read_all" on public.rooms for select using (auth.role() = 'authenticated');

-- Only the host can create or mutate a room.
drop policy if exists "rooms_host_writes"  on public.rooms;
create policy "rooms_host_writes" on public.rooms
  for all
  using  (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Anyone in the room can read its participant list.
drop policy if exists "rp_read_room"       on public.room_participants;
create policy "rp_read_room" on public.room_participants
  for select using (auth.role() = 'authenticated');

-- Anyone can insert their own participant row (joining), and update only
-- their own row (writing final stats). Host can delete the whole room
-- via cascade on rooms.
drop policy if exists "rp_self_insert"     on public.room_participants;
create policy "rp_self_insert" on public.room_participants
  for insert with check (auth.uid() = user_id);

drop policy if exists "rp_self_update"     on public.room_participants;
create policy "rp_self_update" on public.room_participants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable realtime for these tables.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_participants;
