import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Retrieve authentic Checkout Session directly from Stripe API
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || (session.payment_status !== 'paid' && session.status !== 'complete')) {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Security Check: Verify session belongs to logged in user
    const sessionUserId = session.client_reference_id || session.metadata?.userId;
    if (sessionUserId && sessionUserId !== user.id) {
      return NextResponse.json({ error: 'Session user mismatch' }, { status: 403 });
    }

    // Update Supabase profile to PRO
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        subscription_plan: 'pro',
        stripe_customer_id: session.customer as string,
      })
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: 'pro' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Verification failed' }, { status: 500 });
  }
}
