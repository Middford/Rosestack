'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import type { RiskItem, OpportunityItem } from '@/shared/types';
import { calculateNetPosition } from '../scoring';
import { formatGbp } from '@/shared/utils/scenarios';

interface WaterfallChartProps {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  baseRevenue?: number;
}

export function NetPositionWaterfall({ risks, opportunities, baseRevenue = 3200000 }: WaterfallChartProps) {
  const netPosition = calculateNetPosition(baseRevenue, risks, opportunities);

  let running = 0;
  const data = netPosition.map((item) => {
    if (item.type === 'base') {
      running = item.value;
      return { name: item.label, value: item.value, fill: '#3B82F6', bottom: 0 };
    }
    if (item.type === 'net') {
      return { name: item.label, value: item.value, fill: item.value >= 0 ? '#10B981' : '#EF4444', bottom: 0 };
    }
    const bottom = running;
    running += item.value;
    return {
      name: item.label,
      value: Math.abs(item.value),
      fill: item.value >= 0 ? '#10B981' : '#EF4444',
      bottom: item.value >= 0 ? bottom : running,
    };
  });

  const netValue = netPosition.find(p => p.type === 'net')?.value ?? 0;
  const isPositive = netValue >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Net Risk/Opportunity Position</CardTitle>
            <p className="text-xs text-text-tertiary">
              Base case revenue, adjusted for risk impacts and opportunity uplifts
            </p>
          </div>
          <div className={`text-right ${isPositive ? 'text-success' : 'text-danger'}`}>
            <p className="text-xs text-text-tertiary">Net Position</p>
            <p className="text-xl font-bold">{formatGbp(netValue)}</p>
            <p className="text-xs">
              {isPositive ? 'More upside than downside exposure' : 'Downside exceeds upside exposure'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'bottom') return [null, null];
                return [formatGbp(value), 'Amount'];
              }}
            />
            <ReferenceLine y={0} stroke="var(--color-text-tertiary)" strokeDasharray="3 3" />
            <Bar dataKey="bottom" stackId="waterfall" fill="transparent" />
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
