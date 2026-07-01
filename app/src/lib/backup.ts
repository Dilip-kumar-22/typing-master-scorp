// Export / import all local app data as a portable JSON file.
//
// The app stores everything on-device (no account). This lets a user back up
// their progress, stats, streak, achievements, settings — and move them to
// another browser or machine — with a plain JSON file they own. Pure helpers
// (buildBackup / parseBackup) are unit-tested; the file-download/upload glue is
// thin and browser-only.

// All localStorage keys the app owns. Keep in sync if new keys are added.
const KEYS = [
  'typing_master_v2',            // main store (history, keyStats, progress, settings, practiceDays, keybr)
  'typing_master_locale',        // chosen language
  'typing_master_seen_primer',   // Chapter-0 dismissed flag
  'typing_master_skipped_guides',// per-lesson "skip intro" prefs
] as const;

const BACKUP_MAGIC = 'typing-master-backup';
const BACKUP_VERSION = 1;

export interface Backup {
  magic: string;
  version: number;
  exportedAt: string;   // ISO timestamp (stamped by the caller — kept out of pure build for testability)
  data: Record<string, unknown>;
}

/** Collect the current on-device data into a backup object (pure). */
export function buildBackup(
  read: (key: string) => string | null,
  exportedAt: string,
): Backup {
  const data: Record<string, unknown> = {};
  for (const k of KEYS) {
    const raw = read(k);
    if (raw == null) continue;
    // Store parsed JSON where possible so the file is human-readable; fall back
    // to the raw string for plain values.
    try { data[k] = JSON.parse(raw); } catch { data[k] = raw; }
  }
  return { magic: BACKUP_MAGIC, version: BACKUP_VERSION, exportedAt, data };
}

/** Validate + parse a backup file's text. Throws with a friendly message. */
export function parseBackup(text: string): Backup {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  if (!obj || typeof obj !== 'object') throw new Error('That file is not a Typing Master backup.');
  const b = obj as Partial<Backup>;
  if (b.magic !== BACKUP_MAGIC) throw new Error('That file is not a Typing Master backup.');
  if (typeof b.data !== 'object' || b.data == null) throw new Error('This backup has no data in it.');
  // Only accept keys we recognise (ignore anything unexpected).
  const clean: Record<string, unknown> = {};
  for (const k of KEYS) if (k in (b.data as object)) clean[k] = (b.data as Record<string, unknown>)[k];
  return { magic: BACKUP_MAGIC, version: b.version ?? 1, exportedAt: b.exportedAt ?? '', data: clean };
}

/** Write the parsed backup back into a storage (pure over the writer). */
export function applyBackup(
  backup: Backup,
  write: (key: string, value: string) => void,
): number {
  let n = 0;
  for (const [k, v] of Object.entries(backup.data)) {
    write(k, typeof v === 'string' ? v : JSON.stringify(v));
    n++;
  }
  return n;
}

// ─── Browser glue (not unit-tested; trivial) ──────────────

/** Trigger a download of the current data as `typing-master-backup-<date>.json`. */
export function downloadBackup(): void {
  const stamp = new Date().toISOString();
  const backup = buildBackup(k => localStorage.getItem(k), stamp);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `typing-master-backup-${stamp.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Read a File, validate, restore into localStorage, and reload. Returns the
 *  number of keys restored (before reload). Throws a friendly error on bad file. */
export async function restoreFromFile(file: File): Promise<number> {
  const text = await file.text();
  const backup = parseBackup(text);
  const n = applyBackup(backup, (k, v) => localStorage.setItem(k, v));
  return n;
}
