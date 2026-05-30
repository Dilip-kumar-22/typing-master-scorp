// Edge function: mint a Stripe Checkout session and return its URL.
//
// Auth: the caller must be a signed-in Supabase user. We re-derive their id
// from the JWT in the Authorization header (Supabase passes it through to
// edge functions automatically when called via the JS SDK).
//
// Deploy:
//   supabase functions deploy create-checkout-session --no-verify-jwt
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRO_PRICE_ID=price_...
//
// Note: --no-verify-jwt because we accept anonymous fetches and re-verify
// the token ourselves below (so we control the error response shape).

// Deno runtime — the @ts-ignore lines suppress local TS warnings; Deno
// resolves these at deploy time.
// @ts-ignore
import Stripe from 'npm:stripe@17.0.0';
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-ignore — Deno global
const env = (k: string): string => (Deno as { env: { get(k: string): string | undefined } }).env.get(k) ?? '';

const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

interface ReqBody {
  plan: 'pro' | 'team';
  /** Where Stripe should redirect after a successful purchase. */
  successUrl: string;
  /** Where Stripe should redirect if the user cancels. */
  cancelUrl: string;
}

// @ts-ignore — Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Identify the caller
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return json({ error: 'Not signed in' }, 401);
    }
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Invalid session' }, 401);

    const body = (await req.json()) as ReqBody;
    if (!['pro', 'team'].includes(body.plan)) return json({ error: 'Bad plan' }, 400);

    const priceId = body.plan === 'pro'
      ? env('STRIPE_PRO_PRICE_ID')
      : env('STRIPE_TEAM_PRICE_ID');
    if (!priceId) return json({ error: 'Price not configured' }, 500);

    // Look up the user's existing customer id, if any, to avoid duplicates.
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: sub?.stripe_customer_id ?? undefined,
      customer_email: sub?.stripe_customer_id ? undefined : user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      subscription_data: { metadata: { user_id: user.id } },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
