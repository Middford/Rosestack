'use client';

import { cn } from './utils';

interface TrafficLightProps {
  status: 'green' | 'amber' | 'red';
  label?: string;
  className?: string;
}

const statusConfig = {
  green: { bg: 'bg-success', text: 'text-success', icon: '●' },
  amber: { bg: 'bg-warning', text: 'text-warning', icon: '●' },
  red: { bg: 'bg-danger', text: 'text-danger', icon: '●' },
};

export function TrafficLight({ status, label, className }: TrafficLightProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('inline-block w-3 h-3 rounded-full', config.bg)} />
      {label && <span className={cn('text-sm', config.text)}>{label}</span>}
    </div>
  );
}
