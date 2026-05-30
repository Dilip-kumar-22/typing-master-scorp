// Global 7-day leaderboard. Visible only when backend is configured.

import { useEffect, useState } from 'preact/hooks';
import { isSupabaseConfigured } from '../lib/auth';
import { fetchLeaderboard } from '../lib/sync';
import type { DBLeaderboardRow } from '../lib/supabase';
import { LESSONS, CHALLENGES } from '../lib/data';
import { timeAgo } from '../lib/utils';

const MODE_OPTIONS = [
  { id: '__all__', label: 'All modes' },
  ...LESSONS.map(l => ({ id: l.id, label: l.title.split(':')[0] })),
  ...CHALLENGES.map(c => ({ id: c.id, label: c.label })),
];

export function Leaderboard() {
  if (!isSupabaseConfigured()) return null;

  const [rows, setRows] = useState<DBLeaderboardRow[] | null>(null);
  const [filter, setFilter] = useState('__all__');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLeaderboard(60).then(data => {
      if (!alive) return;
      setRows(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const filtered = (rows || [])
    .filter(r => filter === '__all__' || r.mode_id === filter)
    .slice(0, 25);

  return (
    <section class="leaderboard">
      <div class="section-head">
        <h2>🌍 Global Leaderboard</h2>
        <p>Top WPM in the last 7 days · refreshes on load</p>
      </div>

      <div class="lb-filter">
        <label class="lb-filter-lbl">Filter:</label>
        <select
          class="lb-filter-select"
          value={filter}
          onChange={(e: Event) => setFilter((e.target as HTMLSelectElement).value)}
        >
          {MODE_OPTIONS.map(o => <option value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div class="lb-table">
        <div class="lb-head">
          <div class="lb-rank">#</div>
          <div>Typist</div>
          <div>Mode</div>
          <div>WPM</div>
          <div>Accuracy</div>
          <div>When</div>
        </div>
        {loading && <div class="lb-empty">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div class="lb-empty">
            No results yet for this mode in the last 7 days.
            Be the first — finish a run and your score will appear here.
          </div>
        )}
        {filtered.map((r, i) => {
          const accColor = r.acc >= 95 ? '#4ade80' : r.acc >= 85 ? '#facc15' : '#fb7185';
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
          return (
            <div class="lb-row" key={i + '|' + r.created_at}>
              <div class="lb-rank">{medal}</div>
              <div class="lb-name">{r.display_name}</div>
              <div class="lb-mode">{r.mode_label}</div>
              <div class="lb-wpm">{r.wpm}</div>
              <div style={{ color: accColor }}>{r.acc}%</div>
              <div class="lb-when">{timeAgo(new Date(r.created_at).getTime())}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
