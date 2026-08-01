import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updatePlanSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  subscriptionPlan: z.enum(['free', 'pro'], {
    errorMap: () => ({ message: 'Subscription plan must be free or pro' }),
  }),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updatePlanSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, subscriptionPlan } = validationResult.data;

    // Execute update
    const { data: updatedProfile, error: updateErr } = await supabase
      .from('profiles')
      .update({ subscription_plan: subscriptionPlan })
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `User plan successfully updated to ${subscriptionPlan.toUpperCase()}`,
      profile: updatedProfile,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
