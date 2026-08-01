import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  label?: string;
  className?: string;
  fullPage?: boolean;
}

export function Loader({ label = 'Loading...', className, fullPage = false }: LoaderProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center p-6 space-y-3 text-slate-500', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
