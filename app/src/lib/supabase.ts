// Typed Supabase client with graceful no-config fallback.
//
// When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are absent, this module
// returns `null` from getSupabase() and the rest of the app silently runs in
// local-only mode. This is intentional: contributors can clone and develop
// without setting up a backend, and production deploys can choose whether to
// enable cloud features by setting env vars at build time.

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Strongly-typed DB schema — mirrors supabase/migrations/0001_init.sql.
// If you change the SQL, change this and the TS will tell you what broke.
export interface DBProfile {
  id: string;
  display_name: string;
  created_at: string;
}
export interface DBSession {
  id: string;
  user_id: string;
  mode_id: string;
  mode_label: string;
  wpm: number;
  acc: number;
  time_sec: number;
  created_at: string;
}
export interface DBProgress {
  user_id: string;
  unlocked_lessons: string[];
  completed_lessons: string[];
  updated_at: string;
}
export interface DBLeaderboardRow {
  display_name: string;
  mode_id: string;
  mode_label: string;
  wpm: number;
  acc: number;
  created_at: string;
}

export interface Database {
  // Required by @supabase/supabase-js v2.106+ — version pin lets the generated
  // PostgREST builders pick the right SQL flavor.
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      profiles: {
        Row: DBProfile;
        Insert: { id: string; display_name: string };
        Update: Partial<DBProfile>;
        Relationships: [];
      };
      sessions: {
        Row: DBSession;
        Insert: Omit<DBSession, 'id' | 'created_at'>;
        Update: Partial<DBSession>;
        Relationships: [];
      };
      progress: {
        Row: DBProgress;
        Insert: {
          user_id: string;
          unlocked_lessons?: string[];
          completed_lessons?: string[];
          updated_at?: string;
        };
        Update: Partial<DBProgress>;
        Relationships: [];
      };
    };
    Views: {
      leaderboard: { Row: DBLeaderboardRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// We intentionally don't pass the Database generic into createClient — the
// supabase-js v2 query inference path is heavy, and it gives us no real type
// safety beyond what we already enforce at the read/write boundaries via the
// DBProfile/DBSession/DBProgress shapes above (see lib/auth.ts and lib/sync.ts,
// which cast their reads explicitly).
let client: SupabaseClient | null = null;
let configured: boolean | null = null;

export function isSupabaseConfigured(): boolean {
  if (configured != null) return configured;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  configured = Boolean(url && key && url.startsWith('http') && key.length > 20);
  return configured;
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return client;
}

/** Test-only — lets unit tests inject a mock client. */
export function __setSupabaseForTesting(c: SupabaseClient | null): void {
  client = c;
  configured = c != null;
}
