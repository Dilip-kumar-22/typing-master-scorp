# Teams / B2B Setup — Classrooms & Org Dashboards

Phase 11 adds multi-user **organizations** (classrooms / companies): a teacher creates an org, invites students with a code, and sees everyone's WPM/accuracy in one roster. It builds on the Supabase backend (Phase 3b) and the Team Stripe tier (Phase 9).

Without Supabase configured, the **🏫 Teams** tab doesn't render at all — same graceful-degradation pattern as the rest of the backend.

---

## 1. Apply the schema (1 min)

Supabase Dashboard → **SQL Editor** → paste [`app/supabase/migrations/0004_teams.sql`](app/supabase/migrations/0004_teams.sql) → **Run**.

Creates:
- `organizations` (name, owner, **seats** = mirror of the Stripe Team subscription quantity)
- `org_members` (user + role: `owner` / `teacher` / `student`)
- `org_invites` (shareable 6-char codes, optional email binding, 14-day expiry)
- Helper functions `org_role_of`, `is_org_teacher`, `my_org_ids`
- The cross-tenant-safe RLS policies (see the safety model below)

> Apply order matters: `0001` → `0002` → `0003` → `0004`. The teacher-reads-student-sessions policy in `0004` extends the `sessions` table created in `0001`.

## 2. That's it for required setup

The client code is already wired. Sign in, open the **🏫 Teams** tab, and:
- **Create a classroom** → you become its `owner`.
- **Create invite code** → share the `ABC-DEF` code, or copy the invite link (`/?join=ABC-DEF`).
- Students open the link (or paste the code on the Teams tab) → they join as `student`.
- The **roster** shows each member's best WPM, average accuracy, session count, and last-active time, sorted teachers-first then by WPM.

## 3. Connecting seats to billing (optional, recommended for production)

The `organizations.seats` column is the cap the UI enforces ("3 seats left"). To keep it in sync with what the customer actually pays for:

1. When an org owner buys the **Team** plan (Phase 9 checkout, `quantity` = seats), the Stripe subscription carries a `quantity`.
2. Extend `stripe-webhook` (Phase 9) so that on `customer.subscription.updated` for a Team price, it calls the `set_org_seats(org_id, quantity)` RPC added in `0004`. You'll need to stamp the `org_id` into the subscription metadata at checkout time (add `subscription_data.metadata.org_id` in `create-checkout-session`).
3. Until you wire that, every new org defaults to **10 seats** (`organizations.seats` default), which matches the Team-plan minimum — fine for testing.

---

## The RLS safety model (read this if you touch the policies)

The dangerous capability here is **a teacher reading other users' typing sessions**. The rule we enforce: a teacher can read a session row *only if* its owner is a member of an org the teacher also belongs to as `owner`/`teacher`. Everything else stays private.

Key decisions:
- **Helper functions are `SECURITY DEFINER` with `search_path` pinned.** This avoids RLS recursion (a policy on `org_members` that queries `org_members` would loop) and prevents `search_path` hijacking.
- **`sessions` gets an ADDITIVE policy.** Postgres RLS is permissive-OR: adding `sessions_teacher_read` only ever *grants* the same-org read path; it can't widen the existing self-only/leaderboard policies.
- **Invites are bearer secrets.** Any authenticated user can `SELECT` an invite *by code* (needed to redeem), but the code itself is the unguessable secret (≈30^6 ≈ 730M combos, 14-day expiry). They cannot list invites — only fetch one they already hold the code for.
- **Students can only remove themselves; teachers can remove students** (not other teachers/owners). Enforced by the `members_teacher_remove` policy (`role = 'student'`) plus the `roleOutranks` check in the UI.

If you add Pro-gated *data* later, gate it with the `is_pro()` helper (Phase 9) and/or `is_org_teacher()` here — don't hand-roll new membership checks.

---

## What's deferred (be honest with yourself before selling this)

- **Seat→Stripe auto-sync** is documented above but not wired by default (defaults to 10 seats).
- **Assigning specific lessons to a class** (curriculum assignment) isn't built — the roster is read-only analytics for now.
- **Per-student drill-down** (a student's full history from the teacher view) isn't built — only aggregates show.
- **CSV export** of the roster — easy add, not done.
- **Email-based invites** (auto-send) — the schema supports email-bound codes, but there's no transactional-email integration; teachers share codes/links manually.
- **SSO / Google Classroom / Clever roster import** — the big enterprise-sales unlocks, each its own phase.

## Test coverage

`app/test/teams.test.ts` (13 tests) covers the pure logic: role gating (`canManage`, `roleOutranks`), seat math (`seatsAvailable`, `canAddMembers`), invite-code generation/normalization round-trips, and the `buildRoster` aggregation (best WPM, avg accuracy, last-active, teacher-first sort, missing-name fallback). The Supabase-touching functions are thin wrappers verified by typecheck + the graceful-fallback pattern; full integration testing needs a live Supabase project.
