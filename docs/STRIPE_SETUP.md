# Stripe Setup — Free / Pro / Team Monetization

After Phase 9 the app has end-to-end billing wired through Stripe Checkout + Customer Portal + a Supabase Edge Function webhook. With no env vars, billing is invisible and every user stays Free forever — so the rest of the app keeps working unchanged.

This doc walks you through enabling it.

---

## Prerequisites

- ✅ Supabase project from [SUPABASE_SETUP.md](SUPABASE_SETUP.md) already set up (Phase 3b)
- A Stripe account — sign up at https://dashboard.stripe.com/register
- The Supabase CLI installed locally: `npm install -g supabase`

---

## 1. Create the products in Stripe (5 min)

Stripe Dashboard → **Products** → **Add product**:

**Pro**
- Name: `Typing Master Pro`
- Pricing: Recurring, $5.00 / month (or $50.00 / year — create two prices on one product)
- Save → copy the `price_...` ID for the monthly price

**Team**
- Name: `Typing Master Team`
- Pricing: Recurring, $3.00 / month / per unit (Stripe → "per unit", which becomes per seat at checkout)
- Save → copy the `price_...` ID

You now have two price IDs: `STRIPE_PRO_PRICE_ID` and `STRIPE_TEAM_PRICE_ID`.

## 2. Apply the SQL migration (1 min)

Supabase Dashboard → **SQL Editor** → **New Query** → paste [`app/supabase/migrations/0003_billing.sql`](app/supabase/migrations/0003_billing.sql) → **Run**.

This creates:
- `subscription_tier` + `subscription_status` enums
- `subscriptions` table (one row per user, mirroring Stripe state)
- RLS so users can only read their own row (only the webhook writes, via the service role)
- `is_pro(uid)` SQL helper for fast tier checks
- An updated `handle_new_user()` trigger that auto-creates a Free row on signup
- A backfill that gives every existing user a Free row

## 3. Deploy the three Edge Functions (3 min)

From `app/`:

```bash
supabase login                        # one-time
supabase link --project-ref <your-ref>  # find it in your Supabase project URL

# Deploy
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy create-portal-session   --no-verify-jwt
supabase functions deploy stripe-webhook          --no-verify-jwt

# Set the secrets (server-side only — never in .env.local)
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRO_PRICE_ID=price_... \
  STRIPE_TEAM_PRICE_ID=price_...
```

> `--no-verify-jwt` is intentional: the checkout / portal functions re-verify the user JWT themselves (so we control the error response); the webhook uses Stripe signature verification, not Supabase auth.

## 4. Tell Stripe about the webhook (1 min)

Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://<your-project>.supabase.co/functions/v1/stripe-webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Save → reveal the signing secret (`whsec_...`) → set it on Supabase:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## 5. Point the client at Stripe (30 sec)

In `app/.env.local`:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

(Plus the Supabase vars from earlier; the client uses Supabase to invoke the edge functions.)

Restart `npm run dev` — the **Pricing** panel now appears on Home, and the **Subscription** row appears in the Settings drawer.

## 6. Test the flow end-to-end (3 min)

1. Sign in to your app
2. Home → scroll to **💎 Pricing**
3. Click **Upgrade to Pro**
4. Stripe Checkout opens — use one of Stripe's [test cards](https://stripe.com/docs/testing#cards), e.g. `4242 4242 4242 4242` / any future date / any CVC
5. Complete payment → redirects back to your app with `?billing=success`
6. Toast appears: "Subscription activated — welcome to Pro! 🚀"
7. The Pricing card flips to "Current plan"
8. Settings drawer → Subscription row shows "Pro" + renewal date + "Manage subscription →"
9. Click "Manage subscription" → Stripe Customer Portal opens; cancel from there

Confirm the webhook fired: Stripe Dashboard → Webhooks → click your endpoint → check the **Logs** tab. You should see green `200 OK` responses for `checkout.session.completed` and `customer.subscription.created`.

---

## Going live

When you're ready to take real money:

1. Stripe Dashboard → toggle **View test data → Live mode** (top-right)
2. Repeat steps 1–4 against live mode (new product + price IDs, new webhook endpoint, new live signing secret)
3. Swap your env vars:
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...`
4. **Enable Tax** (Stripe Dashboard → Tax → Activate) — `automatic_tax: enabled` is already set in `create-checkout-session/index.ts`, so the moment Stripe Tax is activated for your account, EU/UK/etc. tax is calculated correctly at checkout
5. **Configure the Customer Portal** (Stripe Dashboard → Customer portal): allow cancellations, plan switching, payment-method updates, invoice history. The portal URL the app opens is the one you configure here.
6. **Privacy policy + Terms of service** — required by the App Store, Play Store, and Stripe. Link from your footer.

---

## Pricing decisions encoded in the code

| Tier | Price | Gating |
|---|---|---|
| Free | $0 forever | 32-chapter curriculum, adaptive, multiplayer up to 2 players, local + cloud sync |
| Pro | $5/mo or $50/yr | Custom paragraph paste, advanced analytics (future), unlimited multiplayer, premium themes |
| Team | $3/seat/mo, min 10 seats | All Pro features + teacher dashboard (future), class leaderboards (future), SSO (future) |

The **only Pro feature wired right now is "Custom paragraph paste"** — it appears as a frosted panel under the Custom picker tab. Free users see what they're missing + a one-click upgrade button. This proves the `ProGate` pattern; adding more Pro features is now just wrapping them in `<ProGate>...</ProGate>`.

## How tier-gating works in code

```tsx
import { ProGate } from './components/ProGate';

<ProGate feature="Advanced analytics dashboard">
  <ChartsThatOnlyProsSee />
</ProGate>
```

For server-side gates (RLS on Pro-only data):
```sql
create policy "pro_only_table_read" on public.pro_only_table
  for select using (public.is_pro(auth.uid()));
```

The `is_pro()` function from the migration is the source of truth across the whole stack.

## Things this phase deliberately did NOT do

- **Team / B2B dashboard.** The schema (`subscriptions.org_id`) is plumbed for it but the seat-management UI, teacher dashboard, and per-seat invite flow are their own future phase. The Team checkout works (users can buy it via the pricing panel), they just don't have a UI to invite seats yet.
- **In-app payment method update.** Users go to the Stripe Customer Portal for that. Building an in-app form means handling PCI scope — not worth it for the volume.
- **Free trial.** Easy to add (`trial_period_days` on the Stripe price). Held off because conversion rates are usually better with a strong free tier than with a trial.
- **Annual prices in the UI.** The Stripe product can carry both monthly and annual prices, and the panel hardcodes monthly. Add a monthly/annual toggle in `PricingPanel.tsx` when you're ready.
- **Native (iOS / Android) in-app purchases.** Apple takes 30% if you bill through StoreKit instead of Stripe — but Apple ALSO requires StoreKit for digital goods sold to iOS users (or you risk app removal). For an MVP, the recommendation is: web checkout via Stripe (this code), and either restrict iOS in-app upgrade UI (link out to the web) or bite the bullet on StoreKit per-platform. Documented as a future-phase decision.
- **Receipts / invoices UI.** Customer Portal handles this. Stripe also emails them automatically.

## Cost economics, rough

Stripe takes 2.9% + $0.30 per transaction.
- $5 Pro sub → Stripe takes $0.45, you keep $4.55 (≈ 91%)
- $50 Pro annual → Stripe takes $1.75, you keep $48.25 (≈ 96%)
- $30 Team (10 seats) → Stripe takes $1.17, you keep $28.83 (≈ 96%)

At 100M users, even a 1% conversion to Pro at $5/mo = **$5M MRR**, with Stripe taking ~$450K/mo. The Supabase free tier (50K MAU) breaks the moment you cross it — at 100M users you'll be on the Team plan ($599/mo) or Enterprise.
