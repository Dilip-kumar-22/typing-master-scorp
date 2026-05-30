// Edge function: return a Stripe Customer Portal URL so the user can
// manage payment method, view invoices, cancel, etc.
//
// Deploy:
//   supabase functions deploy create-portal-session --no-verify-jwt
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_...

// @ts-ignore
import Stripe from 'npm:stripe@17.0.0';
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-ignore — Deno global
const env = (k: string): string => (Deno as { env: { get(k: string): string | undefined } }).env.get(k) ?? '';

const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

// @ts-ignore — Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401);

    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Invalid session' }, 401);

    const { returnUrl } = (await req.json()) as { returnUrl: string };

    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return json({ error: 'No Stripe customer for this user yet — start a subscription first.' }, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
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
