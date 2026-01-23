'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
}

export function Card({ children, className, title, subtitle, icon }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm',
        className
      )}
    >
      {(title || icon) && (
        <div className="mb-4 flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              {icon}
            </div>
          )}
          <div>
            {title && (
              <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('', className)} icon={icon}>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </p>
        <p className="text-2xl font-semibold text-white">{value}</p>
        {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 pt-1">
            <span
              className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500">{trend.label}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
