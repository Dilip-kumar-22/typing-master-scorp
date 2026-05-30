# Supabase Setup — 5 Minutes to Cloud Sync + Leaderboard

The new `app/` runs in two modes:
- **Local-only** (default) — no env vars, no auth UI, progress lives in localStorage. Identical UX to Phase 2.
- **Backend-enabled** — set two env vars, paste one SQL migration, get auth + cross-device sync + global leaderboard.

This doc walks the backend setup.

---

## 1. Create a free Supabase project (1 min)

1. Go to <https://supabase.com> → **New project**
2. Pick a name, a strong DB password (save it somewhere), pick a region near your users
3. Wait ~60 seconds for the project to provision

## 2. Apply the schema (1 min)

1. In the Supabase dashboard, open **SQL Editor → New Query**
2. Paste the entire contents of [`app/supabase/migrations/0001_init.sql`](app/supabase/migrations/0001_init.sql)
3. Click **Run** — should report "Success. No rows returned."

This creates three tables (`profiles`, `sessions`, `progress`), one view (`leaderboard`), Row-Level Security policies, and an auto-create-profile trigger that fires on every new signup.

## 3. Wire up auth providers (2 min)

### Email magic link
- Dashboard → **Authentication → Providers → Email**
- Already enabled by default. No action needed.

### Google OAuth (optional but recommended)
- Dashboard → **Authentication → Providers → Google → Enabled**
- Follow Supabase's inline instructions to create a Google Cloud OAuth app
- Paste the Client ID + Client Secret back into the Supabase page
- Save

If you skip Google, the email magic link still works. The "Continue with Google" button on the AuthCard will return a friendly error.

## 4. Point the app at your project (30 sec)

In `app/`:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill both vars (find them in Supabase: **Settings → API**):

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...           # the "anon / public" key, ~250 chars
```

> ⚠️ Vite only exposes vars prefixed with `VITE_` to the client bundle.
> The **anon key is designed to be public** — your DB is protected by the RLS policies in step 2.

## 5. Start the app

```bash
cd app
npm run dev      # http://localhost:5173
```

You should now see:
- A "☁ Sync your progress across devices" panel on the home screen
- A "🌍 Global Leaderboard" panel below it
- An avatar dot will appear in the top-right after you sign in

Sign in with email → check inbox for the magic link → click → you're in. Your existing localStorage history pulls into Supabase on first sign-in.

---

## How sync works (mental model)

- **Local-first.** Every session is written to localStorage *first*, then pushed to Supabase if you're signed in. If the network is down or you're signed out, the session still saves locally. Next time you're online + signed in, refreshing the page (or hitting "↻ Refresh from cloud") will reconcile.
- **No conflict UI.** Sessions are append-only with UUIDs — both copies of the same session de-dupe by `(date, modeId, wpm)` tuple. Progress (unlocked + completed lessons) is a monotonic union — it can grow but never shrink.
- **RLS-enforced.** Every read/write of `sessions` and `progress` is scoped to `auth.uid()`. Even if someone got hold of your anon key, they can only read public leaderboard rows and their own data.

## What lives where

| Concern | Layer |
|---|---|
| Session insert on completion | `app/src/lib/store.ts → completeSession()` calls `pushSession()` |
| Pull on sign-in | `app/src/App.tsx → useEffect(currentUser)` calls `hydrateFromCloud()` |
| Merge logic | `app/src/lib/sync.ts → mergeSessions / unionStrings` (pure, tested) |
| Auth UI | `app/src/components/AuthCard.tsx` (Home screen panel) + `UserMenu.tsx` (TopBar avatar) |
| Leaderboard | `app/src/components/Leaderboard.tsx` (Home screen panel) |
| Display name editor | `AuthCard.tsx → "Edit name"` |
| Schema | `app/supabase/migrations/0001_init.sql` |

---

## Deployment notes

When you deploy `app/` to Vercel / Netlify / Cloudflare Pages, set the two `VITE_*` env vars in the platform's project settings and re-deploy. The build will pick them up and bake them into the bundle.

Different envs (staging / prod) → different Supabase projects. Don't share a production project with local dev.

## What didn't get built (yet)

- **Email confirmations / password reset UI** — Supabase handles these out of the box via its own hosted pages. Customize them in the dashboard if you want.
- **Realtime leaderboard updates** — currently fetches on load only. Easy add: subscribe to `supabase.channel('leaderboard').on('postgres_changes', ...)`.
- **Friend leaderboards / private rooms** — needs a `friends` join table and per-room RLS.
- **OAuth providers beyond Google** — same flow as Google, just enable in the dashboard.
- **Avatar uploads** — needs Supabase Storage; haven't wired it up.

## Cost estimate

Supabase free tier covers:
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 5 GB egress per month
- 7-day backups

For a typing app, sessions are ~150 bytes each. 50K MAU averaging 10 sessions/day = ~225 MB/month of growth. Free tier survives that easily. You'd hit egress or backup limits first around ~100K MAU, at which point Pro is $25/month.
