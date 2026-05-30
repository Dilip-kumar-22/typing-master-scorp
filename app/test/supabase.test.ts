import { describe, it, expect, vi, beforeEach } from 'vitest';

// We stub import.meta.env BEFORE importing the module so the cached
// `configured` flag inside supabase.ts evaluates against our stubs.
beforeEach(() => {
  vi.resetModules();
});

describe('isSupabaseConfigured', () => {
  it('returns false when env vars are absent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const { isSupabaseConfigured, getSupabase } = await import('../src/lib/supabase');
    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabase()).toBeNull();
  });

  it('returns false when URL is malformed', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x'.repeat(40));
    const { isSupabaseConfigured } = await import('../src/lib/supabase');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns false when anon key is too short to be real', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'short');
    const { isSupabaseConfigured } = await import('../src/lib/supabase');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns true when both env vars look real', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc123.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x'.repeat(80));
    const { isSupabaseConfigured } = await import('../src/lib/supabase');
    expect(isSupabaseConfigured()).toBe(true);
  });
});
