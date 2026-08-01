import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  iconBgColor?: string;
  iconTextColor?: string;
  badge?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconBgColor = 'bg-brand-50',
  iconTextColor = 'text-brand-600',
  badge,
  href,
  onClick,
  className,
}: StatCardProps) {
  const cardContent = (
    <Card
      onClick={onClick}
      className={cn(
        'overflow-hidden h-full flex flex-col justify-between transition-all duration-200 border-slate-200/80 shadow-xs',
        (href || onClick) && 'cursor-pointer hover:border-purple-300 hover:shadow-md group',
        className
      )}
    >
      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between space-x-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Title Header with fixed line height for pixel-perfect card alignment */}
            <div className="h-8 flex items-center">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug">
                {title}
              </p>
            </div>

            {/* Metric Value & Optional Badge */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {value}
              </span>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
          </div>

          {/* Right Icon Box */}
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold transition-transform group-hover:scale-105 shadow-xs',
              iconBgColor,
              iconTextColor
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Footer Description */}
        {description && (
          <div className="pt-2 border-t border-slate-100/80">
            <p className="text-xs text-slate-400 font-medium truncate">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
