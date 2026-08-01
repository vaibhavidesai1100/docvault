import Stripe from 'stripe';

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build',
  {
    apiVersion: '2025-01-27.acacia' as any,
    typescript: true,
  }
);
