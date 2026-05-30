// Multiplayer screen — Phase 6c.
//
// One file holds the three sub-screens: Lobby (create / join), Room (waiting
// for participants + host start), and Race (live cursor positions). Keeps the
// flow easy to follow as the user moves between states.

import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { currentUser, isSupabaseConfigured } from '../lib/auth';
import {
  createRoom, findRoom, joinRoom, startRoom, finishRace,
  subscribeToRoom,
  type Room, type Participant,
} from '../lib/multiplayer';
import { SENTENCES } from '../lib/data';
import { showToast } from '../hooks/useToast';

type Screen = 'lobby' | 'room' | 'race' | 'done';

const currentRoom = signal<Room | null>(null);
const participants = signal<Participant[]>([]);
const livePositions = signal<Record<string, number>>({});
const screen = signal<Screen>('lobby');

function chooseRacePrompt(): { prompt: string; label: string } {
  const pool = SENTENCES.paragraph;
  return {
    prompt: pool[Math.floor(Math.random() * pool.length)],
    label: 'Speed Run Endurance',
  };
}

export function Multiplayer() {
  if (!isSupabaseConfigured()) {
    return (
      <div class="tab-content">
        <div class="section-head"><h2>👥 Multiplayer Races</h2></div>
        <div class="mp-empty">
          Multiplayer needs cloud sync. See <a href="/SUPABASE_SETUP.md">SUPABASE_SETUP.md</a> to enable.
        </div>
      </div>
    );
  }
  if (!currentUser.value) {
    return (
      <div class="tab-content">
        <div class="section-head"><h2>👥 Multiplayer Races</h2></div>
        <div class="mp-empty">Sign in to host or join a race. Cloud-sync panel above ↑</div>
      </div>
    );
  }

  return (
    <div class="tab-content">
      <div class="section-head">
        <h2>👥 Multiplayer Races</h2>
        <p>Race head-to-head with friends. Share a 4-char room code and type the same paragraph at the same time.</p>
      </div>
      {screen.value === 'lobby' && <Lobby />}
      {(screen.value === 'room' || screen.value === 'race' || screen.value === 'done') && <RoomView />}
    </div>
  );
}

function Lobby() {
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function host() {
    setBusy(true);
    try {
      const { prompt, label } = chooseRacePrompt();
      const room = await createRoom(prompt, label);
      currentRoom.value = room;
      participants.value = [];
      livePositions.value = {};
      screen.value = 'room';
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not create room');
    } finally { setBusy(false); }
  }

  async function join() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return showToast('Enter a 4-char room code');
    setBusy(true);
    try {
      const room = await findRoom(code);
      if (!room) { showToast('Room not found'); setBusy(false); return; }
      if (room.status === 'finished') { showToast('That race is over'); setBusy(false); return; }
      await joinRoom(room.id);
      currentRoom.value = room;
      screen.value = room.status === 'racing' ? 'race' : 'room';
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not join room');
    } finally { setBusy(false); }
  }

  return (
    <div class="mp-lobby">
      <div class="mp-card mp-card-host">
        <h3>Host a race</h3>
        <p>Create a fresh room with a random paragraph. Share the 4-char code with friends.</p>
        <button class="btn primary lg" disabled={busy} onClick={host}>
          {busy ? 'Creating…' : 'Create room →'}
        </button>
      </div>
      <div class="mp-card mp-card-join">
        <h3>Join a race</h3>
        <p>Enter the 4-char code from your friend.</p>
        <div class="mp-join-form">
          <input
            class="auth-input mp-code-input"
            type="text"
            placeholder="A B C D"
            maxLength={8}
            value={joinCode}
            onInput={(e: Event) => setJoinCode((e.target as HTMLInputElement).value.toUpperCase())}
            aria-label="Room code"
          />
          <button class="btn primary" disabled={busy || joinCode.length < 4} onClick={join}>
            {busy ? '…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomView() {
  const room = currentRoom.value!;
  const me = currentUser.value!;
  const isHost = room.host_id === me.id;
  const subRef = useRef<ReturnType<typeof subscribeToRoom> | null>(null);
  const [, setTick] = useState(0);  // force re-render on signal change

  useEffect(() => {
    const sub = subscribeToRoom(room, {
      onRoomChange(updated) {
        currentRoom.value = updated;
        if (updated.status === 'racing' && screen.value === 'room') screen.value = 'race';
        if (updated.status === 'finished') screen.value = 'done';
        setTick(t => t + 1);
      },
      onParticipants(list) {
        participants.value = list;
        setTick(t => t + 1);
        // Auto-complete when every participant has finished.
        if (isHost && list.every(p => p.finished_at) && list.length > 0) {
          // best-effort: mark room finished
          import('../lib/supabase').then(({ getSupabase }) => {
            const sb = getSupabase();
            if (sb) sb.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString() } as never).eq('id', room.id);
          });
        }
      },
      onLivePos(userId, pos) {
        livePositions.value = { ...livePositions.value, [userId]: pos };
        setTick(t => t + 1);
      },
    });
    subRef.current = sub;
    return () => sub.close();
  }, [room.id]);

  function leave() {
    subRef.current?.close();
    currentRoom.value = null;
    participants.value = [];
    livePositions.value = {};
    screen.value = 'lobby';
  }

  if (screen.value === 'race') return <RaceView room={room} onFinish={leave} />;
  if (screen.value === 'done') return <ResultsView room={room} onLeave={leave} />;
  return <WaitingRoom room={room} isHost={isHost} onLeave={leave} />;
}

function WaitingRoom({ room, isHost, onLeave }: { room: Room; isHost: boolean; onLeave: () => void }) {
  const list = participants.value;
  async function host() {
    if (list.length < 1) return showToast('Need at least 1 participant');
    await startRoom(room.id);
  }
  function copyCode() {
    if (navigator.clipboard) navigator.clipboard.writeText(room.code).then(() => showToast('Code copied'));
  }
  return (
    <div class="mp-room">
      <div class="mp-room-head">
        <div>
          <div class="mp-eyebrow">Room code</div>
          <div class="mp-code-display" onClick={copyCode} title="Click to copy">{room.code}</div>
        </div>
        <div class="mp-room-meta">
          <div><strong>{list.length}</strong> participant{list.length === 1 ? '' : 's'}</div>
          <div class="mp-room-actions">
            <button class="btn ghost" onClick={onLeave}>Leave</button>
            {isHost && <button class="btn primary" onClick={host} disabled={list.length === 0}>Start race →</button>}
            {!isHost && <span class="mp-waiting">Waiting for host to start…</span>}
          </div>
        </div>
      </div>
      <ul class="mp-participants">
        {list.map(p => (
          <li class="mp-participant">
            <div class="mp-avatar">{(p.display_name || 'U').charAt(0).toUpperCase()}</div>
            <div class="mp-name">{p.display_name || 'Typist'}</div>
            {p.user_id === room.host_id && <span class="mp-host-tag">HOST</span>}
          </li>
        ))}
      </ul>
      <div class="mp-room-prompt">
        <div class="mp-eyebrow">Prompt preview</div>
        <p>{room.prompt}</p>
      </div>
    </div>
  );
}

function RaceView({ room, onFinish }: { room: Room; onFinish: () => void }) {
  const me = currentUser.value!;
  const [pos, setPos] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus the input so OS keyboard pops on mobile.
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Broadcast our cursor position whenever it changes.
  useEffect(() => {
    // The subscription was set up by RoomView; access it via the same module-level
    // signal pattern. Re-derive the broadcaster lazily:
    // (Simpler: just import subscribeToRoom isn't needed — we piggy-back on the
    // existing channel by re-resolving it from supabase directly.)
    import('../lib/supabase').then(({ getSupabase }) => {
      const sb = getSupabase();
      if (!sb) return;
      const ch = sb.channel(`room:${room.id}`);
      ch.send({ type: 'broadcast', event: 'cursor', payload: { userId: me.id, pos } });
    });
  }, [pos]);

  function onChange(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    if (startedAt == null) setStartedAt(Date.now());
    // Compare each typed char to the prompt, count errors against expected.
    let newErrors = 0;
    for (let i = 0; i < v.length; i++) {
      if (v[i] !== room.prompt[i]) newErrors++;
    }
    setErrors(newErrors);
    setPos(v.length);
    if (v.length >= room.prompt.length) {
      const t = Math.max(0.1, (Date.now() - (startedAt || Date.now())) / 1000);
      const correct = room.prompt.length - newErrors;
      const wpm = Math.max(0, Math.round((correct / 5) / (t / 60)));
      const acc = Math.max(0, Math.min(100, Math.round((correct / room.prompt.length) * 100)));
      finishRace(room.id, wpm, acc);
      showToast(`Finished — ${wpm} WPM, ${acc}%`);
      screen.value = 'done';
    }
  }

  const pct = Math.round((pos / room.prompt.length) * 100);
  const list = participants.value;
  const positions = livePositions.value;

  return (
    <div class="mp-race">
      <div class="mp-race-head">
        <div class="mp-eyebrow">Race in progress · room {room.code}</div>
        <button class="btn ghost" onClick={onFinish}>Leave</button>
      </div>

      {/* Live cursor positions per participant */}
      <div class="mp-tracks">
        {list.map(p => {
          const live = p.user_id === me.id ? pos : (positions[p.user_id] ?? 0);
          const trackPct = Math.min(100, (live / room.prompt.length) * 100);
          const done = p.finished_at != null;
          return (
            <div class="mp-track" key={p.user_id}>
              <div class="mp-track-name">
                {p.display_name}
                {p.user_id === me.id && <span class="mp-track-you"> (you)</span>}
                {done && <span class="mp-track-done"> ✓ {p.final_wpm} WPM</span>}
              </div>
              <div class="mp-track-bar">
                <div class="mp-track-fill" style={{ width: trackPct + '%' }} />
                <div class="mp-track-cursor" style={{ left: trackPct + '%' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* The actual typing area — a styled input, on-purpose-simple to keep
          this implementation tight. The fancy 3D typing card stays available
          in single-player mode. */}
      <div class="mp-prompt">
        <p>{room.prompt}</p>
      </div>
      <input
        ref={inputRef}
        class="mp-input"
        type="text"
        value={[...Array(pos)].map((_, i) => room.prompt[i] || '').join('')}
        onInput={onChange}
        autocapitalize="off"
        autocorrect="off"
        autocomplete="off"
        spellcheck={false}
        aria-label="Race typing input"
      />
      <div class="mp-race-stats">
        <span>{pos}/{room.prompt.length} chars</span>
        <span>{pct}%</span>
        <span style={{ color: errors > 0 ? '#fb7185' : 'var(--text-3)' }}>{errors} error{errors === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}

function ResultsView({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const list = [...participants.value]
    .sort((a, b) => (b.final_wpm ?? -1) - (a.final_wpm ?? -1));
  return (
    <div class="mp-results">
      <div class="mp-eyebrow">Final ranking — room {room.code}</div>
      <ol class="mp-rank">
        {list.map((p, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
          return (
            <li key={p.user_id} class="mp-rank-row">
              <span class="mp-rank-medal">{medal}</span>
              <span class="mp-rank-name">{p.display_name}</span>
              <span class="mp-rank-wpm">{p.final_wpm ?? '—'} WPM</span>
              <span class="mp-rank-acc">{p.final_acc ?? '—'}%</span>
            </li>
          );
        })}
      </ol>
      <button class="btn primary lg" onClick={onLeave}>Back to lobby</button>
    </div>
  );
}
