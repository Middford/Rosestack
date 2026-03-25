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
import type { YearlyProjection, ThreeScenarioProjection } from '@/shared/types';
import { getScenarioHex } from '@/shared/utils/scenarios';

interface ScenarioChartProps {
  projection: ThreeScenarioProjection;
  dataKey?: keyof YearlyProjection;
  title?: string;
  yAxisLabel?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

export function ScenarioChart({
  projection,
  dataKey = 'netRevenue',
  title,
  yAxisLabel,
  height = 300,
  formatValue = (v) => `£${v.toLocaleString()}`,
}: ScenarioChartProps) {
  const data = projection.likely.map((_, i) => ({
    year: `Year ${projection.likely[i].year}`,
    best: projection.best[i]?.[dataKey] ?? 0,
    likely: projection.likely[i]?.[dataKey] ?? 0,
    worst: projection.worst[i]?.[dataKey] ?? 0,
  }));

  return (
    <div>
      {title && <h4 className="text-sm font-medium text-text-secondary mb-3">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="bestGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getScenarioHex('best')} stopOpacity={0.15} />
              <stop offset="95%" stopColor={getScenarioHex('best')} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="likelyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getScenarioHex('likely')} stopOpacity={0.2} />
              <stop offset="95%" stopColor={getScenarioHex('likely')} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="worstGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getScenarioHex('worst')} stopOpacity={0.15} />
              <stop offset="95%" stopColor={getScenarioHex('worst')} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            label={
              yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-text-tertiary)' }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
            }}
            formatter={(value: number, name: string) => [formatValue(value), name.charAt(0).toUpperCase() + name.slice(1)]}
          />
          <Legend
            wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="best"
            stroke={getScenarioHex('best')}
            fill="url(#bestGradient)"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="likely"
            stroke={getScenarioHex('likely')}
            fill="url(#likelyGradient)"
            strokeWidth={2.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="worst"
            stroke={getScenarioHex('worst')}
            fill="url(#worstGradient)"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
