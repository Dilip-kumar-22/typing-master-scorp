// Settings-drawer addition: shows the current tier + opens the Stripe
// Customer Portal so the user can manage their subscription. Hidden when
// billing isn't configured or the user is signed out.

import {
  subscription, currentTier, isPro,
  isBillingConfigured, openCustomerPortal,
  billingLoading,
} from '../lib/billing';
import { currentUser } from '../lib/auth';

export function BillingPanel() {
  if (!isBillingConfigured()) return null;
  if (!currentUser.value) return null;

  const s = subscription.value;
  const tier = currentTier.value;
  const proActive = isPro.value;

  const expires = s.currentPeriodEnd
    ? new Date(s.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div class="setting-row billing-row">
      <div class="lbl">
        <span class="name">Subscription</span>
        <span class="v">
          {tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Team'}
          {s.status !== 'active' && s.status !== 'trialing' ? ` · ${s.status}` : ''}
        </span>
      </div>
      {proActive && expires && (
        <div class="billing-meta">
          {s.cancelAtPeriodEnd
            ? `Cancels on ${expires}`
            : `Renews on ${expires}`}
        </div>
      )}
      {tier !== 'free' && (
        <button class="btn ghost" disabled={billingLoading.value} onClick={openCustomerPortal}>
          {billingLoading.value ? 'Opening…' : 'Manage subscription →'}
        </button>
      )}
    </div>
  );
}
