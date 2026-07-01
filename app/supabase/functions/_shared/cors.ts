// Shared CORS helper for the edge functions.
//
// Instead of a blanket `Access-Control-Allow-Origin: *`, we reflect the request
// origin only when it's on an allowlist. The checkout/portal functions already
// require a valid Supabase JWT (so `*` was not directly exploitable), but an
// allowlist is defense-in-depth and stops other sites from invoking these
// endpoints from a browser. Add your production origin(s) here (or set the
// ALLOWED_ORIGINS env var as a comma-separated list) before deploying.

const DEFAULT_ALLOWED = [
  'https://dilip-kumar-22.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

function allowedOrigins(): string[] {
  const env = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } })
    .Deno?.env.get('ALLOWED_ORIGINS');
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean);
  return DEFAULT_ALLOWED;
}

/** Build CORS headers for a given request, reflecting an allowlisted origin. */
export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const list = allowedOrigins();
  const allow = list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Back-compat: a static export for any function still importing `corsHeaders`.
// Falls back to the first allowlisted origin. Prefer corsFor(req) in new code.
export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins()[0],
  'Vary': 'Origin',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
