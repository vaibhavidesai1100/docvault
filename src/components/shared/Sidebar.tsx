'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/lib/constants';
import {
  LayoutDashboard,
  User,
  Users,
  ShieldAlert,
  FileCheck,
  X,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  userProfile?: UserProfile | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userProfile, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userProfile?.role === 'admin';

  // Standard User Navigation
  const userNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Documents', href: '/documents', icon: FileCheck },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  // Admin Dedicated Portal Navigation (Aligned strictly with Sarvadhi Task Spec)
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'All Documents', href: '/admin/documents', icon: ShieldAlert },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const activeNav = isAdmin ? adminNavigation : userNavigation;

  const content = (
    <div className="h-full flex flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between lg:hidden pb-2 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">
            {isAdmin ? 'DocVault Admin Portal' : 'DocVault Menu'}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>{isAdmin ? 'Admin Portal' : 'Main Menu'}</span>
            {isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />}
          </p>
          <nav className="space-y-1">
            {activeNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose && onClose()}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? isAdmin
                        ? 'bg-purple-50 text-purple-700 font-semibold'
                        : 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isActive
                        ? isAdmin
                          ? 'text-purple-600'
                          : 'text-brand-600'
                        : 'text-slate-400'
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {userProfile && (
        <div className="pt-4 border-t border-slate-100">
          <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Account Role</span>
              <span className="font-semibold text-slate-900 capitalize">
                {userProfile.role}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Access Level</span>
              <span className="font-semibold text-slate-900 uppercase">
                {isAdmin ? 'Full Admin' : userProfile.subscription_plan}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-200 bg-white flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile / Tablet Drawer Backdrop & Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50 shadow-xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
