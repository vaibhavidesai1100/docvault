import React from 'react';
import { FileX, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ElementType;
}

export function EmptyState({
  title = 'No documents found',
  description = 'Upload your first document to get started.',
  actionLabel,
  onAction,
  className,
  icon: Icon = FolderOpen,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white space-y-4 my-4', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <div className="max-w-xs space-y-1">
        <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
