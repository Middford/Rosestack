'use client';

import { cn } from './utils';
import { Card } from './card';

interface StatCardProps {
  label: string;
  bestValue: string;
  likelyValue: string;
  worstValue: string;
  className?: string;
}

export function StatCard({ label, bestValue, likelyValue, worstValue, className }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <p className="text-sm font-medium text-text-secondary mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-scenario-best">Best</span>
          <span className="text-sm text-scenario-best">{bestValue}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-scenario-likely font-medium">Likely</span>
          <span className="text-xl font-bold text-scenario-likely">{likelyValue}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-scenario-worst">Worst</span>
          <span className="text-sm text-scenario-worst">{worstValue}</span>
        </div>
      </div>
    </Card>
  );
}

interface SimpleStatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function SimpleStatCard({ label, value, subtitle, trend, className }: SimpleStatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
      {subtitle && (
        <p className={cn(
          'text-xs mt-1',
          trend === 'up' && 'text-success',
          trend === 'down' && 'text-danger',
          trend === 'neutral' && 'text-text-tertiary',
          !trend && 'text-text-tertiary',
        )}>
          {subtitle}
        </p>
      )}
    </Card>
  );
}
