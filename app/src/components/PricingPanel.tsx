// Pricing panel — shown on Home as its own section when billing is
// configured. The three tiers side-by-side, with the user's current tier
// highlighted.

import {
  isPro, currentTier, isBillingConfigured,
  startCheckout, billingLoading, billingError,
} from '../lib/billing';
import { currentUser } from '../lib/auth';

export function PricingPanel() {
  if (!isBillingConfigured()) return null;

  const tier = currentTier.value;
  const proActive = isPro.value;
  const signedIn = currentUser.value != null;

  function ctaFor(plan: 'free' | 'pro' | 'team') {
    if (!signedIn) return { label: 'Sign in to choose', disabled: true, action: () => {} };
    if (plan === 'free' && tier === 'free') return { label: 'Current plan', disabled: true, action: () => {} };
    if (plan === 'pro' && proActive)         return { label: 'Current plan', disabled: true, action: () => {} };
    if (plan === 'team' && tier === 'team')  return { label: 'Current plan', disabled: true, action: () => {} };
    if (plan === 'free') return { label: 'Downgrade in billing', disabled: true, action: () => {} };
    return {
      label: billingLoading.value ? 'Redirecting…' : `Upgrade to ${plan === 'pro' ? 'Pro' : 'Team'}`,
      disabled: billingLoading.value,
      action: () => startCheckout(plan),
    };
  }

  const cards: { id: 'free' | 'pro' | 'team'; name: string; price: string; sub: string; bullets: string[]; tone: string; }[] = [
    {
      id: 'free', name: 'Free', price: '$0', sub: 'forever, no card',
      tone: 'tone-cyan',
      bullets: [
        '32-chapter curriculum',
        'Adaptive learning (keybr-style)',
        'Local-only progress + sync to cloud',
        '3D keyboard heatmap',
        'Multiplayer rooms (up to 2 players)',
      ],
    },
    {
      id: 'pro', name: 'Pro', price: '$5', sub: 'per month · or $50/yr',
      tone: 'tone-violet',
      bullets: [
        'Everything in Free',
        'Unlimited multiplayer room size',
        'Custom paragraph paste',
        'Advanced per-key analytics dashboard',
        'All premium themes + accent colors',
        'No ads (ads are not in Free yet either — but they will be)',
        'Priority on the global leaderboard',
      ],
    },
    {
      id: 'team', name: 'Team', price: '$3', sub: 'per seat · min 10 seats',
      tone: 'tone-magenta',
      bullets: [
        'Everything in Pro for every seat',
        'Teacher dashboard (assign lessons, track class)',
        'Class leaderboards',
        'Bulk seat management',
        'Priority support',
        'SSO — coming soon',
      ],
    },
  ];

  return (
    <section class="pricing-section">
      <div class="section-head">
        <h2>💎 Pricing</h2>
        <p>You're on the <strong>{tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Team'}</strong> plan. Upgrade any time.</p>
      </div>

      {billingError.value && <div class="pricing-error">{billingError.value}</div>}

      <div class="pricing-grid">
        {cards.map(c => {
          const cta = ctaFor(c.id);
          const isCurrent =
            (c.id === 'free' && tier === 'free') ||
            (c.id === 'pro'  && proActive) ||
            (c.id === 'team' && tier === 'team');
          return (
            <div class={`pricing-card ${c.tone}${isCurrent ? ' is-current' : ''}${c.id === 'pro' ? ' featured' : ''}`}>
              {c.id === 'pro' && <div class="pricing-badge">Most popular</div>}
              <h3 class="pricing-name">{c.name}</h3>
              <div class="pricing-price">
                <span class="amount">{c.price}</span>
                <span class="sub">{c.sub}</span>
              </div>
              <ul class="pricing-bullets">
                {c.bullets.map(b => <li>{b}</li>)}
              </ul>
              <button
                class={'btn ' + (c.id === 'pro' ? 'primary lg' : 'ghost')}
                style="width:100%;justify-content:center"
                disabled={cta.disabled}
                onClick={cta.action}
              >{cta.label}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
