'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/lib/constants';
import { LogOut, User as UserIcon, FileText, Menu } from 'lucide-react';
import { toast } from 'sonner';

interface NavbarProps {
  userProfile?: UserProfile | null;
  onMenuToggle?: () => void;
}

export function Navbar({ userProfile, onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-sm">
      <div className="flex items-center space-x-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Doc<span className="text-brand-600">Vault</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {userProfile ? (
          <>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700 max-w-[120px] md:max-w-[200px] truncate">
                {userProfile.full_name || userProfile.email}
              </span>
              <Badge variant={userProfile.role === 'admin' ? 'admin' : 'default'}>
                {userProfile.role.toUpperCase()}
              </Badge>
              {userProfile.role !== 'admin' && (
                <Badge variant={userProfile.subscription_plan === 'pro' ? 'pro' : 'brand'}>
                  {userProfile.subscription_plan.toUpperCase()}
                </Badge>
              )}
            </div>

            <Link href="/profile">
              <Button variant="ghost" size="sm" className="space-x-1 px-2.5">
                <UserIcon className="h-4 w-4" />
                <span className="hidden md:inline">Profile</span>
              </Button>
            </Link>

            <Button variant="outline" size="sm" onClick={handleLogout} className="space-x-1 px-2.5 text-slate-600">
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
