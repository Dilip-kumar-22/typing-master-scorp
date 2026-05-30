// Wraps a Pro-only feature. If the active user is Pro, renders children
// transparently. Otherwise renders an upgrade prompt + the children visually
// dimmed underneath (so users see what they're missing).

import { type ComponentChildren } from 'preact';
import { isPro, startCheckout, isBillingConfigured } from '../lib/billing';
import { currentUser } from '../lib/auth';

interface Props {
  children: ComponentChildren;
  /** Short tagline shown in the upgrade prompt. */
  feature: string;
}

export function ProGate({ children, feature }: Props) {
  // If billing isn't configured at all (local dev / open source), don't gate.
  if (!isBillingConfigured()) return <>{children}</>;
  if (isPro.value) return <>{children}</>;

  const signedIn = currentUser.value != null;

  return (
    <div class="pro-gate">
      <div class="pro-gate-inner" aria-hidden="true">{children}</div>
      <div class="pro-gate-veil">
        <div class="pro-gate-badge">PRO</div>
        <h3 class="pro-gate-title">{feature}</h3>
        <p class="pro-gate-sub">
          {signedIn
            ? 'Upgrade to Pro to unlock this feature plus advanced analytics, custom paragraph paste, and unlimited multiplayer.'
            : 'Sign in and upgrade to Pro to unlock this feature.'}
        </p>
        <button
          class="btn primary lg"
          disabled={!signedIn}
          onClick={() => startCheckout('pro')}
        >Upgrade to Pro</button>
      </div>
    </div>
  );
}
