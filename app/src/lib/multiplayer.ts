// Multiplayer typing-race engine (Phase 6c).
//
// Architecture: one Supabase Realtime "room channel" per active race.
//   • The host creates a row in `rooms` (status='waiting') with a generated
//     4-char share code and the chosen prompt.
//   • Joiners look up the room by code, insert a row in `room_participants`,
//     and subscribe to the same realtime channel.
//   • Live cursor positions are BROADCAST through the channel (not written
//     to the DB) — Realtime's `broadcast` event with payload {userId, pos}.
//   • The host flips status='racing' to start; everyone gets the flip via a
//     Postgres-changes subscription on `rooms`.
//   • When a participant finishes, they `update` their participant row with
//     finalWpm/finalAcc; everyone sees it via Postgres-changes on
//     `room_participants`. When all participants have finished, the host
//     flips status='finished'.

import { getSupabase } from './supabase';
import { currentUser, displayName } from './auth';
import { track } from './analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Room {
  id: string;
  code: string;
  host_id: string;
  prompt: string;
  mode_label: string;
  status: 'waiting' | 'racing' | 'finished';
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Participant {
  room_id: string;
  user_id: string;
  display_name: string;
  final_wpm: number | null;
  final_acc: number | null;
  finished_at: string | null;
  joined_at: string;
  livePos?: number;   // synthesized from broadcast, not in DB
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L for legibility

export function generateRoomCode(len = 4): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Host creates a fresh room. Returns the inserted row. */
export async function createRoom(prompt: string, modeLabel: string): Promise<Room> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) throw new Error('Not signed in');
  // Retry once on collision (extremely rare given the alphabet).
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await sb
      .from('rooms')
      .insert({ code, host_id: user.id, prompt, mode_label: modeLabel })
      .select('*')
      .maybeSingle();
    if (!error && data) {
      // Host is also a participant.
      await sb.from('room_participants').insert({
        room_id: (data as Room).id,
        user_id: user.id,
        display_name: displayName.value || 'Host',
      });
      track('multiplayer_room_created', { code: (data as Room).code });
      return data as Room;
    }
    if (error && !String(error.message).includes('unique')) throw new Error(error.message);
  }
  throw new Error('Could not allocate room code — try again');
}

/** Look up a room by its share code. Returns null if not found.
 *
 * Uses the `room_by_code` SECURITY DEFINER function (0005) rather than a direct
 * table select: after the RLS hardening, a joiner is not yet a room member and
 * so cannot read the `rooms` row directly. The function resolves the code to
 * the minimal fields needed to join; once the joiner inserts their participant
 * row, the member RLS policy grants read of the full room (incl. the prompt). */
export async function findRoom(code: string): Promise<Room | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .rpc('room_by_code', { p_code: code.toUpperCase() })
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Pick<Room, 'id' | 'code' | 'mode_label' | 'status' | 'host_id'>;
  // The function intentionally omits `prompt` (revealed after joining) and the
  // timestamp fields; fill the Room shape with safe placeholders until the
  // member-scoped realtime read hydrates the rest.
  return {
    id: r.id, code: r.code, host_id: r.host_id,
    mode_label: r.mode_label, status: r.status,
    prompt: '', started_at: null, finished_at: null, created_at: '',
  };
}

/** After joining, re-read the full room row (now permitted by member RLS) so
 *  the joiner gets the prompt + timestamps. Returns null if not yet readable. */
export async function fetchRoom(roomId: string): Promise<Room | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('rooms').select('*').eq('id', roomId).maybeSingle();
  return (data ?? null) as Room | null;
}

/** Join an existing room. Idempotent — if you're already in, returns ok. */
export async function joinRoom(roomId: string): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) throw new Error('Not signed in');
  await sb.from('room_participants').upsert({
    room_id: roomId,
    user_id: user.id,
    display_name: displayName.value || 'Typist',
  } as never);
  track('multiplayer_room_joined', { room_id: roomId });
}

/** Host transitions room to racing. */
export async function startRoom(roomId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from('rooms')
    .update({ status: 'racing', started_at: new Date().toISOString() } as never)
    .eq('id', roomId);
}

/** Mark current user as finished with their final stats. */
export async function finishRace(
  roomId: string,
  finalWpm: number,
  finalAcc: number,
): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return;
  await sb
    .from('room_participants')
    .update({
      final_wpm: finalWpm,
      final_acc: finalAcc,
      finished_at: new Date().toISOString(),
    } as never)
    .eq('room_id', roomId)
    .eq('user_id', user.id);
  track('multiplayer_race_finished', { room_id: roomId, wpm: finalWpm, acc: finalAcc });
}

/** Fetch all participants for a room. */
export async function fetchParticipants(roomId: string): Promise<Participant[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('room_participants')
    .select('*')
    .eq('room_id', roomId);
  return (data ?? []) as Participant[];
}

/** Subscribe to live updates for a room. Returns an unsubscribe function. */
export interface RoomSubscriptionCallbacks {
  onRoomChange(room: Room): void;
  onParticipants(participants: Participant[]): void;
  onLivePos(userId: string, pos: number): void;
}
export function subscribeToRoom(
  room: Room,
  cb: RoomSubscriptionCallbacks,
): { channel: RealtimeChannel; broadcast: (pos: number) => void; close: () => void } {
  const sb = getSupabase();
  if (!sb) {
    return {
      channel: {} as RealtimeChannel,
      broadcast: () => { /* noop */ },
      close: () => { /* noop */ },
    };
  }

  const channel = sb.channel(`room:${room.id}`, {
    config: { broadcast: { self: false } },
  });

  channel.on('postgres_changes',
    { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
    (payload) => {
      if (payload.new) cb.onRoomChange(payload.new as Room);
    },
  );

  channel.on('postgres_changes',
    { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${room.id}` },
    async () => {
      const ps = await fetchParticipants(room.id);
      cb.onParticipants(ps);
    },
  );

  channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
    const p = payload as { userId: string; pos: number };
    if (p && typeof p.userId === 'string' && typeof p.pos === 'number') {
      cb.onLivePos(p.userId, p.pos);
    }
  });

  channel.subscribe();

  // Initial pull so the UI has something before the first realtime event.
  fetchParticipants(room.id).then(cb.onParticipants);

  return {
    channel,
    broadcast: (pos: number) => {
      const user = currentUser.value;
      if (!user) return;
      channel.send({ type: 'broadcast', event: 'cursor', payload: { userId: user.id, pos } });
    },
    close: () => { channel.unsubscribe(); },
  };
}
