import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Fallback for build / local dev testing without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Initialize Supabase Admin Service Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: 'pro',
            stripe_customer_id: (session.customer as string) || null,
            stripe_subscription_id: (session.subscription as string) || null,
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      if (customerId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: 'free',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
