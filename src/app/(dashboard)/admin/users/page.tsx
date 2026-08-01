'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, SubscriptionPlan } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/shared/Loader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { formatDate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [confirmingUser, setConfirmingUser] = useState<UserProfile | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const supabase = createClient();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error(error.message || 'Failed to load user records');
        return;
      }

      setUsers((data as UserProfile[]) || []);
    } catch {
      toast.error('An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleTogglePlan = async (user: UserProfile) => {
    const newPlan: SubscriptionPlan = user.subscription_plan === 'pro' ? 'free' : 'pro';
    setUpdatingUserId(user.id);
    try {
      const res = await fetch('/api/admin/users/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subscriptionPlan: newPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to update plan');
        setUpdatingUserId(null);
        return;
      }

      toast.success(`Updated ${user.email}'s plan to ${newPlan.toUpperCase()}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, subscription_plan: newPlan } : u))
      );
    } catch {
      toast.error('An error occurred during plan update');
    } finally {
      setUpdatingUserId(null);
      setConfirmingUser(null);
    }
  };

  if (loading) {
    return <Loader label="Loading user directory..." fullPage />;
  }

  // Calculate paginated users
  const totalPages = Math.ceil(users.length / itemsPerPage) || 1;
  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">
            View all registered users and manage subscription tiers manually
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadUsers} className="space-x-2">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh List</span>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">User Details</th>
                <th className="px-6 py-3">Assigned Role</th>
                <th className="px-6 py-3">Subscription Plan</th>
                <th className="px-6 py-3">Joined Date</th>
                <th className="px-6 py-3 text-right">Manual Plan Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No registered users found in database.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold text-xs">
                          {u.full_name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.full_name || 'N/A'}</p>
                          <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'admin' ? 'admin' : 'default'}>
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <Badge variant="admin">SYSTEM (ADMIN)</Badge>
                      ) : (
                        <Badge variant={u.subscription_plan === 'pro' ? 'pro' : 'brand'}>
                          {u.subscription_plan.toUpperCase()}
                        </Badge>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(u.created_at)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-slate-400 font-medium italic">
                          System Administrator
                        </span>
                      ) : (
                        <Button
                          variant={u.subscription_plan === 'pro' ? 'outline' : 'default'}
                          size="sm"
                          isLoading={updatingUserId === u.id}
                          onClick={() => setConfirmingUser(u)}
                          className={
                            u.subscription_plan === 'pro'
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                              : 'bg-brand-600'
                          }
                        >
                          {u.subscription_plan === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          totalItems={users.length}
          itemsPerPage={itemsPerPage}
        />
      </Card>

      {/* Plan Override Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmingUser}
        title={
          confirmingUser?.subscription_plan === 'pro'
            ? 'Confirm Plan Downgrade'
            : 'Confirm Plan Upgrade'
        }
        description={`Are you sure you want to ${
          confirmingUser?.subscription_plan === 'pro' ? 'downgrade' : 'upgrade'
        } "${confirmingUser?.email}" to the ${
          confirmingUser?.subscription_plan === 'pro' ? 'FREE' : 'PRO'
        } plan?`}
        confirmText={
          confirmingUser?.subscription_plan === 'pro'
            ? 'Downgrade to Free'
            : 'Upgrade to Pro'
        }
        isLoading={!!updatingUserId}
        onConfirm={() => {
          if (confirmingUser) handleTogglePlan(confirmingUser);
        }}
        onClose={() => setConfirmingUser(null)}
      />
    </div>
  );
}
