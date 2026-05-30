// Client-side billing — tier signals + checkout / portal helpers.
//
// Graceful no-op pattern (same as supabase.ts / analytics.ts):
//   - Without VITE_STRIPE_PUBLISHABLE_KEY: isBillingConfigured() returns false,
//     the upgrade UI hides, every user reads as 'free' forever.
//   - With env vars + Supabase configured: tier hydrates from the
//     `subscriptions` table on sign-in; startCheckout() redirects to Stripe.

import { signal, computed } from '@preact/signals';
import { getSupabase } from './supabase';
import { currentUser } from './auth';
import { track } from './analytics';

export type Tier = 'free' | 'pro' | 'team';
export type Status =
  | 'trialing' | 'active' | 'past_due' | 'canceled'
  | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';

export interface SubscriptionView {
  tier: Tier;
  status: Status;
  currentPeriodEnd: number | null; // ms epoch
  cancelAtPeriodEnd: boolean;
}

const FREE: SubscriptionView = {
  tier: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false,
};

export const subscription = signal<SubscriptionView>(FREE);
export const billingLoading = signal(false);
export const billingError = signal<string | null>(null);

export const currentTier = computed<Tier>(() => subscription.value.tier);
export const isPro = computed<boolean>(() => {
  const s = subscription.value;
  return (s.tier === 'pro' || s.tier === 'team')
      && (s.status === 'active' || s.status === 'trialing');
});

export function isBillingConfigured(): boolean {
  const k = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  return typeof k === 'string' && k.startsWith('pk_');
}

/** Pull the active user's tier from Supabase. Call on sign-in. */
export async function hydrateSubscription(): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) {
    subscription.value = FREE;
    return;
  }
  billingLoading.value = true;
  billingError.value = null;
  try {
    const { data, error } = await sb
      .from('subscriptions')
      .select('tier, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      subscription.value = FREE;
      return;
    }
    const row = data as {
      tier: Tier; status: Status;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
    };
    subscription.value = {
      tier: row.tier,
      status: row.status,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).getTime() : null,
      cancelAtPeriodEnd: row.cancel_at_period_end,
    };
  } catch (e) {
    billingError.value = e instanceof Error ? e.message : String(e);
  } finally {
    billingLoading.value = false;
  }
}

/** Start a Stripe Checkout for the given plan. Redirects on success. */
export async function startCheckout(plan: 'pro' | 'team'): Promise<void> {
  if (!isBillingConfigured()) {
    billingError.value = 'Billing is not configured on this deploy.';
    return;
  }
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) {
    billingError.value = 'Sign in first.';
    return;
  }
  track('checkout_started', { plan });
  billingLoading.value = true;
  try {
    const { data, error } = await sb.functions.invoke('create-checkout-session', {
      body: {
        plan,
        successUrl: window.location.origin + '/?billing=success',
        cancelUrl:  window.location.origin + '/?billing=canceled',
      },
    });
    if (error) throw new Error(error.message);
    const url = (data as { url?: string })?.url;
    if (!url) throw new Error('No checkout URL returned');
    window.location.href = url;
  } catch (e) {
    billingError.value = e instanceof Error ? e.message : String(e);
    billingLoading.value = false;
  }
}

/** Open the Stripe Customer Portal for the active user. Redirects. */
export async function openCustomerPortal(): Promise<void> {
  const sb = getSupabase();
  const user = currentUser.value;
  if (!sb || !user) return;
  track('portal_opened');
  billingLoading.value = true;
  try {
    const { data, error } = await sb.functions.invoke('create-portal-session', {
      body: { returnUrl: window.location.origin },
    });
    if (error) throw new Error(error.message);
    const url = (data as { url?: string })?.url;
    if (!url) throw new Error('No portal URL returned');
    window.location.href = url;
  } catch (e) {
    billingError.value = e instanceof Error ? e.message : String(e);
    billingLoading.value = false;
  }
}

/** Pure tier-gate helper for tests and components. */
export function tierIncludes(have: Tier, need: Tier): boolean {
  const rank: Record<Tier, number> = { free: 0, pro: 1, team: 2 };
  return rank[have] >= rank[need];
}
