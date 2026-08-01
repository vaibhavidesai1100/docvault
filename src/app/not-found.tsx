import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home, FileSearch } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 shadow-inner">
          <FileSearch className="h-10 w-10 text-brand-600" />
        </div>

        {/* 404 Header */}
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 ring-1 ring-inset ring-rose-500/20">
            ERROR 404
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full space-x-2 bg-brand-600 shadow-xs">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full space-x-2">
              <Home className="h-4 w-4" />
              <span>Go to Home</span>
            </Button>
          </Link>
        </div>

        {/* Footer Brand Branding */}
        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium">
          DocVault Security Systems • 256-bit Encryption
        </div>
      </div>
    </div>
  );
}
