'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, SimpleStatCard, Badge } from '@/shared/ui';
import { getScenarioHex } from '@/shared/utils/scenarios';
import { getPortfolioTrackerData, formatGbp } from '../data';

export function PortfolioTracker() {
  const data = useMemo(() => getPortfolioTrackerData(), []);

  const actualMonths = data.filter(d => d.actual > 0);
  const totalActual = actualMonths.reduce((s, d) => s + d.actual, 0);
  const totalLikely = actualMonths.reduce((s, d) => s + d.likely, 0);
  const variance = totalActual - totalLikely;
  const variancePct = totalLikely > 0 ? ((variance / totalLikely) * 100).toFixed(1) : '0';

  const isAboveLikely = totalActual >= totalLikely;
  const isBelowWorst = actualMonths.some(d => d.actual < d.worst);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SimpleStatCard label="Actual YTD Revenue" value={formatGbp(totalActual)} subtitle={`${actualMonths.length} months tracked`} />
        <SimpleStatCard label="Expected (Likely)" value={formatGbp(totalLikely)} subtitle="Likely case projection" />
        <SimpleStatCard
          label="Variance"
          value={`${variance >= 0 ? '+' : ''}${formatGbp(variance)}`}
          subtitle={`${variancePct}% vs likely`}
          trend={variance >= 0 ? 'up' : 'down'}
        />
        <SimpleStatCard
          label="Performance"
          value={isAboveLikely ? 'On Track' : isBelowWorst ? 'Below Worst' : 'Below Likely'}
          subtitle={isAboveLikely ? 'Above likely case' : 'Needs attention'}
          trend={isAboveLikely ? 'up' : 'down'}
        />
      </div>

      {/* Main Chart: Actual vs Projected */}
      <Card>
        <CardHeader>
          <CardTitle>Actual vs Projected Revenue</CardTitle>
          <CardDescription>Monthly revenue plotted against Best/Likely/Worst range</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={getScenarioHex('best')} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={getScenarioHex('worst')} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
                formatter={(value: number, name: string) => [formatGbp(value), name]}
              />
              <Legend />
              {/* Scenario range */}
              <Area
                type="monotone"
                dataKey="best"
                stroke={getScenarioHex('best')}
                fill="url(#rangeGradient)"
                strokeWidth={1}
                strokeDasharray="4 4"
                name="Best"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="likely"
                stroke={getScenarioHex('likely')}
                strokeWidth={2}
                strokeDasharray="6 3"
                name="Likely"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="worst"
                stroke={getScenarioHex('worst')}
                fill="transparent"
                strokeWidth={1}
                strokeDasharray="4 4"
                name="Worst"
                dot={false}
              />
              {/* Actual bars */}
              <Bar
                dataKey="actual"
                fill="var(--color-rose)"
                name="Actual"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Month</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Actual</th>
                  <th className="text-right py-2 px-3 text-scenario-best font-medium">Best</th>
                  <th className="text-right py-2 px-3 text-scenario-likely font-medium">Likely</th>
                  <th className="text-right py-2 px-3 text-scenario-worst font-medium">Worst</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">vs Likely</th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(d => {
                  const diff = d.actual > 0 ? d.actual - d.likely : 0;
                  const status = d.actual === 0 ? 'pending' : d.actual >= d.likely ? 'on-track' : d.actual >= d.worst ? 'below' : 'concern';
                  return (
                    <tr key={d.month} className="border-b border-border/50">
                      <td className="py-2 px-3 text-text-primary">{d.month}</td>
                      <td className="py-2 px-3 text-right font-medium text-text-primary">
                        {d.actual > 0 ? formatGbp(d.actual) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-scenario-best">{formatGbp(d.best)}</td>
                      <td className="py-2 px-3 text-right text-scenario-likely">{formatGbp(d.likely)}</td>
                      <td className="py-2 px-3 text-right text-scenario-worst">{formatGbp(d.worst)}</td>
                      <td className="py-2 px-3 text-right">
                        {d.actual > 0 ? (
                          <span className={diff >= 0 ? 'text-success' : 'text-danger'}>
                            {diff >= 0 ? '+' : ''}{formatGbp(diff)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={
                          status === 'on-track' ? 'success'
                          : status === 'below' ? 'warning'
                          : status === 'concern' ? 'danger'
                          : 'default'
                        }>
                          {status === 'pending' ? 'Pending' : status === 'on-track' ? 'On Track' : status === 'below' ? 'Below Likely' : 'Concern'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
