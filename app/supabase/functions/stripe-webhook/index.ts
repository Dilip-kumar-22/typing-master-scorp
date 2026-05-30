// Edge function: receive Stripe webhook events and mirror them into the
// `subscriptions` table. Stripe is the source of truth — this table is just
// a fast-query cache.
//
// Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...
//
// Then in Stripe Dashboard → Webhooks → "Add endpoint":
//   URL: https://<your-project>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed
//           customer.subscription.created
//           customer.subscription.updated
//           customer.subscription.deleted
//           invoice.payment_failed

// @ts-ignore
import Stripe from 'npm:stripe@17.0.0';
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2';

// @ts-ignore — Deno global
const env = (k: string): string => (Deno as { env: { get(k: string): string | undefined } }).env.get(k) ?? '';

const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

// @ts-ignore — Deno serve
Deno.serve(async (req: Request) => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, sig, env('STRIPE_WEBHOOK_SECRET'),
    );
  } catch (err) {
    return new Response(
      `Webhook signature invalid: ${err instanceof Error ? err.message : err}`,
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (userId && customerId) {
          await admin.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            // The 'created' event below will fill in the rest.
          }, { onConflict: 'user_id' });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as Record<string, string>)?.user_id;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        // Map Stripe price id → our tier.
        const priceId = sub.items.data[0]?.price.id;
        const tier =
          priceId === env('STRIPE_PRO_PRICE_ID')  ? 'pro'  :
          priceId === env('STRIPE_TEAM_PRICE_ID') ? 'team' : 'free';
        const status = sub.status as string;

        // Find the user_id from either the metadata or by looking up the customer id.
        let resolvedUserId = userId;
        if (!resolvedUserId) {
          const { data } = await admin.from('subscriptions')
            .select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
          resolvedUserId = data?.user_id;
        }
        if (!resolvedUserId) {
          console.warn('webhook: no user_id resolvable for sub', sub.id);
          break;
        }

        await admin.from('subscriptions').upsert({
          user_id: resolvedUserId,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          tier: event.type === 'customer.subscription.deleted' ? 'free' : tier,
          status: event.type === 'customer.subscription.deleted' ? 'canceled' : status,
          current_period_end: new Date(sub.items.data[0]?.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (customerId) {
          await admin.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }
      // Other events ignored — Stripe will redeliver if we 200.
    }
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(
      `Processing failed: ${err instanceof Error ? err.message : err}`,
      { status: 500 },
    );
  }
});
