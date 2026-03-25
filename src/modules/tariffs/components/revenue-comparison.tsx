'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge,
} from '@/shared/ui';
import { formatGbp } from '@/shared/utils/scenarios';
import { ALL_TARIFFS, DEFAULT_BATTERY_SYSTEM } from '../data';
import { compareTariffs } from '../calculator';
import type { BatterySystem } from '@/shared/types';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444', '#84CC16', '#F97316'];

export function RevenueComparison() {
  const [capacityKwh, setCapacityKwh] = useState(10);

  const system: BatterySystem = useMemo(() => ({
    ...DEFAULT_BATTERY_SYSTEM,
    totalCapacityKwh: capacityKwh,
  }), [capacityKwh]);

  const comparisons = useMemo(() => compareTariffs(system, ALL_TARIFFS), [system]);

  const chartData = comparisons.map(c => ({
    name: c.tariff.name.length > 20 ? c.tariff.name.substring(0, 18) + '...' : c.tariff.name,
    fullName: c.tariff.name,
    best: c.revenue.best.totalAnnualGbp,
    likely: c.revenue.likely.totalAnnualGbp,
    worst: c.revenue.worst.totalAnnualGbp,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Revenue Comparison Across Tariffs</CardTitle>
              <CardDescription>Same system configuration, different tariffs</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary">Battery Size:</label>
              <select
                value={capacityKwh}
                onChange={e => setCapacityKwh(Number(e.target.value))}
                className="bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              >
                {[5, 10, 13.5, 15, 20, 25].map(v => (
                  <option key={v} value={v}>{v} kWh</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                angle={-35}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickFormatter={v => `£${v.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
                formatter={(value: number, name: string) => [
                  formatGbp(value),
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
              />
              <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }} />
              <Bar dataKey="best" fill="#10B981" radius={[2, 2, 0, 0]} name="Best" />
              <Bar dataKey="likely" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Likely" />
              <Bar dataKey="worst" fill="#F59E0B" radius={[2, 2, 0, 0]} name="Worst" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Tariff</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Spread</TableHead>
                <TableHead className="text-right">Annual (Best)</TableHead>
                <TableHead className="text-right">Annual (Likely)</TableHead>
                <TableHead className="text-right">Annual (Worst)</TableHead>
                <TableHead className="text-right">Daily Arb (Likely)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((c, i) => (
                <TableRow key={c.tariff.id}>
                  <TableCell>
                    <Badge variant={i === 0 ? 'success' : i < 3 ? 'info' : 'default'}>
                      #{c.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{c.tariff.name}</TableCell>
                  <TableCell className="text-text-secondary">{c.tariff.supplier}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={c.spreadPence > 10 ? 'text-success' : 'text-warning'}>
                      {c.spreadPence.toFixed(2)}p
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-scenario-best">
                    {formatGbp(c.revenue.best.totalAnnualGbp)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-scenario-likely">
                    {formatGbp(c.revenue.likely.totalAnnualGbp)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-scenario-worst">
                    {formatGbp(c.revenue.worst.totalAnnualGbp)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatGbp(c.revenue.likely.dailyArbitrageGbp, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
