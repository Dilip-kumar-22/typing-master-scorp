# Security Policy

## Reporting a vulnerability

If you find a security issue in Typing Master, please **do not open a public
issue**. Instead, use GitHub's private **[Security Advisories](https://github.com/Dilip-kumar-22/typing-master-scorp/security/advisories/new)**
("Report a vulnerability") so it can be triaged privately. We aim to respond
within a few days.

## Security posture (as of the pre-launch audit, 2026-06-30)

A full pre-launch security review was performed. Summary:

- **No secrets in the repo.** The public build only ever ships `VITE_`-prefixed
  keys, which are *designed* to be public: the Supabase **anon** key (protected
  by Row-Level Security), the PostHog **project** key, and the Stripe
  **publishable** (`pk_`) key. Server-only secrets (Stripe secret key, webhook
  signing secret, Supabase service-role key) live exclusively in Supabase Edge
  Function environment variables and are read via `Deno.env.get` — never
  hardcoded, never in the client bundle.
- **No real `.env` is tracked** — only `app/.env.example` with blank
  placeholders. `.env*` files are gitignored.
- **XSS surface is minimal.** The single `dangerouslySetInnerHTML` (icon paths)
  is fed only hardcoded constants. All user/author content rendered into HTML
  (SEO pages) is escaped via a shared `escapeHTML`.
- **Row-Level Security** is enabled on every table holding user data. The
  public leaderboard is served through a `SECURITY DEFINER` function that
  returns only anonymized columns (see `migrations/0005_security_hardening.sql`).
- **Stripe webhooks verify signatures** against the raw body; the
  `subscriptions` table is written only by the service-role webhook.
- **Auth tokens** are stored by the Supabase SDK in `localStorage` (standard for
  supabase-js). They are never logged, placed in URLs, or sent to third parties.

## For self-hosters

- Apply **all** SQL migrations `0001` → `0005` **in order**. `0005` is a
  required security hardening step — see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
- Set `ALLOWED_ORIGINS` on your Edge Functions to your production origin(s) so
  CORS reflects an allowlist instead of `*`.
- Any Pro/paid *capability* must be enforced server-side (via RLS using the
  `is_pro()` helper), not only by the client-side `ProGate` UI component. The UI
  gate is for UX; it is not a security boundary.

## Scope

In-scope: the web app in `app/`, the SEO build, and the Supabase schema/edge
functions. Out-of-scope: the legacy vanilla-JS prototype at the repo root
(reference only, not deployed).
