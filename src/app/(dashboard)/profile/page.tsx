'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, UpdateProfileInput } from '@/lib/validations/auth';
import { UserProfile, PLAN_LIMITS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/shared/Loader';
import { User, Shield, CreditCard, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            setProfile(data as UserProfile);
            setValue('fullName', data.full_name || '');
          }
        }
      } catch {
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [supabase, setValue]);

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: data.fullName })
        .eq('id', profile.id);

      if (error) {
        toast.error(error.message || 'Failed to update profile');
        setSaving(false);
        return;
      }

      setProfile({ ...profile, full_name: data.fullName });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('An error occurred while updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Loading profile..." fullPage />;
  }

  const currentPlanInfo =
    profile?.subscription_plan === 'pro' ? PLAN_LIMITS.pro : PLAN_LIMITS.free;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Profile</h1>
        <p className="text-slate-500 text-sm">
          Manage your personal details and view your subscription details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-brand-600" />
              <span>Personal Details</span>
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center space-x-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{profile?.email}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed directly.</p>
              </div>

              <Input
                label="Full Name"
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <Button type="submit" isLoading={saving} disabled={!isValid || saving}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span>Role & Permissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Assigned Role</span>
                <Badge variant={profile?.role === 'admin' ? 'admin' : 'default'}>
                  {profile?.role?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {profile?.role === 'admin'
                  ? 'Full administrative access to users and documents.'
                  : 'Standard user access to upload and manage personal documents.'}
              </p>
            </CardContent>
          </Card>

          {profile?.role === 'admin' ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span>Admin Capabilities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-2 text-slate-600 bg-purple-50/60 p-3 rounded-lg border border-purple-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="font-semibold text-slate-900">User Directory & Manual Plan Overrides</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="font-semibold text-slate-900">Global Document Oversight & Deletion</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="font-semibold text-slate-900">Real-Time Platform Usage Metrics</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-brand-600" />
                  <span>Subscription Plan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Plan</span>
                  <Badge variant={profile?.subscription_plan === 'pro' ? 'pro' : 'brand'}>
                    {currentPlanInfo.name.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span>Document Limit:</span>
                    <span className="font-semibold">
                      {currentPlanInfo.maxDocuments === Infinity ? 'Unlimited' : `${currentPlanInfo.maxDocuments} docs`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max File Size:</span>
                    <span className="font-semibold">{currentPlanInfo.maxSizeLabel}</span>
                  </div>
                </div>

                {profile?.subscription_plan === 'free' && (
                  <Button
                    onClick={async () => {
                      try {
                        toast.loading('Redirecting to Stripe Checkout...', { id: 'stripe' });
                        const res = await fetch('/api/stripe/checkout', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok || !data.url) {
                          toast.error(data.error || 'Failed to initiate checkout', { id: 'stripe' });
                          return;
                        }
                        window.location.href = data.url;
                      } catch {
                        toast.error('Stripe Checkout error', { id: 'stripe' });
                      }
                    }}
                    className="w-full bg-brand-600 space-x-2 mt-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Upgrade to Pro ($19/mo)</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
