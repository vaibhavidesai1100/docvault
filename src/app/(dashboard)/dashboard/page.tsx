'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, DocumentItem, PLAN_LIMITS, SubscriptionPlan } from '@/lib/constants';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/shared/Loader';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  FileText,
  Users,
  CreditCard,
  UploadCloud,
  ArrowRight,
  Download,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // User Dashboard State
  const [userDocsCount, setUserDocsCount] = useState(0);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);

  // Admin Dashboard State
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalDocs: 0,
    freeUsers: 0,
    proUsers: 0,
  });
  const [adminActivityFeed, setAdminActivityFeed] = useState<DocumentItem[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Check if returning from successful Stripe checkout
        const urlParams = new URLSearchParams(window.location.search);
        const isPaymentSuccess = urlParams.get('payment') === 'success';
        const sessionId = urlParams.get('session_id');

        if (isPaymentSuccess) {
          if (sessionId) {
            // Secure production verification via server-side Stripe API
            await fetch(`/api/stripe/verify?session_id=${sessionId}`);
          } else {
            // Direct profile sync
            await supabase
              .from('profiles')
              .update({ subscription_plan: 'pro' })
              .eq('id', user.id);
          }

          toast.success('🎉 Payment successful! Welcome to DocVault Pro!', { id: 'stripe-success' });
          window.history.replaceState({}, '', '/dashboard');
        }

        // Fetch User Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          const userProf = profileData as UserProfile;
          setProfile(userProf);

          if (userProf.role === 'admin') {
            // Fetch Admin Dashboard Stats
            const [
              { count: usersCount },
              { count: docsCount },
              { count: freeCount },
              { count: proCount },
              { data: feedData },
            ] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }),
              supabase.from('documents').select('*', { count: 'exact', head: true }),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user').eq('subscription_plan', 'free'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user').eq('subscription_plan', 'pro'),
              supabase
                .from('documents')
                .select('*, profiles(email, full_name)')
                .order('created_at', { ascending: false })
                .limit(5),
            ]);

            setAdminStats({
              totalUsers: usersCount || 0,
              totalDocs: docsCount || 0,
              freeUsers: freeCount || 0,
              proUsers: proCount || 0,
            });
            setAdminActivityFeed((feedData as DocumentItem[]) || []);
          } else {
            // Fetch User Dashboard Stats
            const [{ count: docsCount }, { data: docsData }] = await Promise.all([
              supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', user.id),
              supabase
                .from('documents')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5),
            ]);

            setUserDocsCount(docsCount || 0);
            setRecentDocs((docsData as DocumentItem[]) || []);
          }
        }
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase]);

  // Signed Download Trigger
  const handleDownload = async (docId: string, title: string) => {
    try {
      toast.loading(`Generating download link...`, { id: 'download' });
      const res = await fetch(`/api/documents/${docId}/download`);
      const data = await res.json();

      if (!res.ok || !data.downloadUrl) {
        toast.error(data.error || 'Failed to download document', { id: 'download' });
        return;
      }

      toast.success('Downloading...', { id: 'download' });
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Download failed', { id: 'download' });
    }
  };

  if (loading) {
    return <Loader label="Loading workspace metrics..." fullPage />;
  }

  const userPlan = (profile?.subscription_plan || 'free') as SubscriptionPlan;
  const planLimit = PLAN_LIMITS[userPlan];
  const remainingUploads =
    planLimit.maxDocuments === Infinity
      ? 'Unlimited'
      : Math.max(0, planLimit.maxDocuments - userDocsCount);

  const usagePercent =
    planLimit.maxDocuments === Infinity
      ? 0
      : Math.min(100, (userDocsCount / planLimit.maxDocuments) * 100);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {profile?.full_name || profile?.email}!
            </h1>
            <Badge variant={isAdmin ? 'admin' : 'brand'}>
              {isAdmin ? 'ADMIN DASHBOARD' : 'USER DASHBOARD'}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            {isAdmin
              ? 'Real-time platform usage metrics, document uploads, and user subscriptions'
              : 'Manage your documents, track your plan upload limits, and access files.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {!isAdmin && userPlan === 'free' && (
            <Button
              variant="default"
              onClick={async () => {
                try {
                  toast.loading('Redirecting to Stripe Checkout...', { id: 'stripe-db' });
                  const res = await fetch('/api/stripe/checkout', { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok || !data.url) {
                    toast.error(data.error || 'Failed to initiate checkout', { id: 'stripe-db' });
                    return;
                  }
                  window.location.href = data.url;
                } catch {
                  toast.error('Stripe Checkout error', { id: 'stripe-db' });
                }
              }}
              className="bg-brand-600 space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Upgrade to Pro</span>
            </Button>
          )}
          <Link href={isAdmin ? '/admin/documents' : '/documents'}>
            <Button variant="outline" className="space-x-2">
              <FileText className="h-4 w-4" />
              <span>{isAdmin ? 'View All System Documents' : 'View My Docs'}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* USER DASHBOARD METRICS */}
      {!isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Total Uploaded Documents"
              value={userDocsCount}
              description="Documents in your private vault"
              icon={FileText}
              iconBgColor="bg-brand-50"
              iconTextColor="text-brand-600"
            />

            <StatCard
              title="Current Plan Status"
              value={userPlan.toUpperCase()}
              description={`Max ${planLimit.maxSizeLabel} file size cap`}
              icon={CreditCard}
              iconBgColor={userPlan === 'pro' ? 'bg-indigo-50' : 'bg-slate-100'}
              iconTextColor={userPlan === 'pro' ? 'text-indigo-600' : 'text-slate-700'}
              badge={
                <Badge variant={userPlan === 'pro' ? 'pro' : 'brand'}>
                  {userPlan.toUpperCase()}
                </Badge>
              }
            />

            <StatCard
              title="Remaining Uploads"
              value={remainingUploads}
              description={
                userPlan === 'free'
                  ? `${userDocsCount} of ${planLimit.maxDocuments} uploads used`
                  : 'Unlimited storage active'
              }
              icon={UploadCloud}
              iconBgColor="bg-emerald-50"
              iconTextColor="text-emerald-600"
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>

          {/* Upload Progress Bar for Free Plan */}
          {userPlan === 'free' && (
            <Card className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-900">
                  <span>Free Plan Upload Limit Progress</span>
                  <span>
                    {userDocsCount} / {planLimit.maxDocuments} files ({usagePercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all duration-500 rounded-full"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                {userDocsCount >= planLimit.maxDocuments ? (
                  <p className="text-xs text-rose-600 font-medium flex items-center space-x-1">
                    <span>⚠️ You have reached your limit of 5 uploads. Upgrade to Pro for unlimited files!</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    You have <span className="font-semibold text-slate-900">{remainingUploads}</span> free upload(s) remaining.
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Recent Documents Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Uploads</h2>
              <Link href="/documents" className="text-sm font-semibold text-brand-600 hover:underline flex items-center space-x-1">
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {recentDocs.length === 0 ? (
              <EmptyState
                title="No recent documents"
                description="Upload your first file to populate your dashboard."
                actionLabel="Upload Document"
                onAction={() => (window.location.href = '/documents')}
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Size</th>
                        <th className="px-6 py-3">Uploaded</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {recentDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            <Link href={`/documents/${doc.id}`} className="hover:text-brand-600">
                              {doc.title}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="brand">{doc.category}</Badge>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {formatBytes(doc.file_size)}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {formatDate(doc.created_at)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.id, doc.title)}
                              className="text-brand-600"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {/* ADMIN DASHBOARD METRICS */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Registered Users"
              value={adminStats.totalUsers}
              description="Platform accounts"
              icon={Users}
              iconBgColor="bg-purple-50"
              iconTextColor="text-purple-600"
              href="/admin/users"
            />

            <StatCard
              title="Total System Documents"
              value={adminStats.totalDocs}
              description="Uploaded across all users"
              icon={FileText}
              iconBgColor="bg-brand-50"
              iconTextColor="text-brand-600"
              href="/admin/documents"
            />

            <StatCard
              title="Free Users"
              value={adminStats.freeUsers}
              description="5 docs limit plan"
              icon={CreditCard}
              iconBgColor="bg-slate-100"
              iconTextColor="text-slate-700"
              href="/admin/users"
            />

            <StatCard
              title="Pro Subscribers"
              value={adminStats.proUsers}
              description="Unlimited uploads plan"
              icon={Sparkles}
              iconBgColor="bg-indigo-50"
              iconTextColor="text-indigo-600"
              badge={<Badge variant="pro">PRO</Badge>}
              href="/admin/users"
            />
          </div>

          {/* Recent System Activity Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent System Activity</h2>
              <Link href="/admin/documents" className="text-sm font-semibold text-purple-600 hover:underline flex items-center space-x-1">
                <span>View all system docs</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-purple-50/50 border-b border-slate-200 text-xs font-semibold text-purple-900 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Document Title</th>
                      <th className="px-6 py-3">Uploader Email</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3">Upload Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {adminActivityFeed.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          No recent system uploads found.
                        </td>
                      </tr>
                    ) : (
                      adminActivityFeed.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {doc.title}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-700">
                            {doc.profiles?.email || doc.owner_id}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="brand">{doc.category}</Badge>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {formatBytes(doc.file_size)}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {formatDate(doc.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
