-- ============================================================
-- Typing Master · S-Corp — Billing schema (Phase 9)
-- Apply AFTER 0001_init.sql and 0002_multiplayer.sql.
--
-- Mirrors Stripe state so we can query "is this user Pro?" in O(1) without
-- hitting the Stripe API. Stripe is the source of truth; this table is
-- ONLY ever written to by the stripe-webhook edge function (service role).
-- ============================================================

-- Tier enum — kept narrow on purpose. Add 'team' rows in a future migration.
create type public.subscription_tier as enum ('free', 'pro', 'team');
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
);

create table if not exists public.subscriptions (
  user_id              uuid primary key references auth.users on delete cascade,
  stripe_customer_id   text unique,
  stripe_subscription_id text unique,
  tier                 public.subscription_tier   not null default 'free',
  status               public.subscription_status not null default 'active',
  -- For revenue analytics + churn-reason segmentation downstream.
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  -- For "Team" tier we'll later attach an org_id; left null for individual Pro.
  org_id               uuid,
  updated_at           timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_status_idx   on public.subscriptions (status);

-- ─── RLS ───────────────────────────────────────────────────
alter table public.subscriptions enable row level security;

-- Users see only their own subscription row.
drop policy if exists "subscriptions_self_read" on public.subscriptions;
create policy "subscriptions_self_read" on public.subscriptions
  for select using (auth.uid() = user_id);

-- NO public insert / update / delete policies. Webhook uses service-role.
-- (Service role bypasses RLS — that's the only path that mutates this table.)

-- ─── is_pro() helper ───────────────────────────────────────
-- One-liner used by client SQL queries and (eventually) by RLS policies on
-- Pro-only data. Returns true if the user has an ACTIVE pro or team
-- subscription (trialing also counts as Pro).
create or replace function public.is_pro(uid uuid)
  returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select coalesce(
    (select tier in ('pro', 'team') and status in ('active', 'trialing')
     from public.subscriptions where user_id = uid),
    false
  );
$$;

-- ─── on-signup: ensure a free-tier row exists ──────────────
-- Extends the existing handle_new_user() so every new auth user gets a
-- 'free' subscription row by default. Idempotent: re-running this migration
-- replaces the function; no extra rows are created on existing users (we
-- only insert on signup).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Typist')
  ) on conflict (id) do nothing;

  insert into public.progress (user_id) values (new.id) on conflict (user_id) do nothing;

  -- NEW: default subscription row (free tier).
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill existing users with a free-tier row.
insert into public.subscriptions (user_id, tier, status)
select id, 'free', 'active' from auth.users
on conflict (user_id) do nothing;
