'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/shared/ui';
import type { PortfolioProperty } from '../types';

interface PortfolioRevenueChartProps {
  properties: PortfolioProperty[];
}

export function PortfolioRevenueChart({ properties }: PortfolioRevenueChartProps) {
  // Build monthly revenue data showing growth as homes come online
  const months = [
    'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26',
    'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26',
  ];

  const data = months.map((month, i) => {
    // Simulate homes coming online at different points
    let activeProperties: PortfolioProperty[] = [];

    if (i >= 0) {
      // port-001 live from Oct 25
      const p1 = properties.find(p => p.id === 'port-001');
      if (p1) activeProperties.push(p1);
    }
    if (i >= 3) {
      // port-002 live from Jan 26
      const p2 = properties.find(p => p.id === 'port-002');
      if (p2) activeProperties.push(p2);
    }
    if (i >= 5) {
      // port-003 installed from Mar 26 (not yet earning but projected)
      const p3 = properties.find(p => p.id === 'port-003');
      if (p3) activeProperties.push(p3);
    }

    const best = activeProperties.reduce((sum, p) => sum + p.summary.best.annualNetRevenue / 12, 0);
    const likely = activeProperties.reduce((sum, p) => sum + p.summary.likely.annualNetRevenue / 12, 0);
    const worst = activeProperties.reduce((sum, p) => sum + p.summary.worst.annualNetRevenue / 12, 0);

    return {
      month,
      best: Math.round(best),
      likely: Math.round(likely),
      worst: Math.round(worst),
      homes: activeProperties.length,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Revenue Growth</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revBestGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="revLikelyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="revWorstGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(v) => `£${v.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
            }}
            formatter={(value: number, name: string) => [`£${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
          />
          <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }} />
          <Area type="monotone" dataKey="best" stroke="#10B981" fill="url(#revBestGrad)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="likely" stroke="#3B82F6" fill="url(#revLikelyGrad)" strokeWidth={2.5} dot={false} />
          <Area type="monotone" dataKey="worst" stroke="#F59E0B" fill="url(#revWorstGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
