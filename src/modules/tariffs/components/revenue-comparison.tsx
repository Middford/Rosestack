'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
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

// RoseStack reference stacks with accurate discharge rates
const ROSESTACK_SIZES = [
  { label: 'Single-Phase Starter (54 kWh)', kwh: 54, dischargeKw: 11.5 },
  { label: 'Quiet Neighbour (80 kWh)', kwh: 80, dischargeKw: 20 },
  { label: 'Garden Standard (160 kWh) ★', kwh: 160, dischargeKw: 40 },
  { label: 'Garage King (192 kWh)', kwh: 192, dischargeKw: 96 },
  { label: 'Full Package (192 kWh + solar)', kwh: 192, dischargeKw: 96 },
];

export function RevenueComparison() {
  const [sizeIdx, setSizeIdx] = useState(2); // default Garden Standard

  const selectedSize = ROSESTACK_SIZES[sizeIdx];

  const system: BatterySystem = useMemo(() => ({
    ...DEFAULT_BATTERY_SYSTEM,
    totalCapacityKwh: selectedSize.kwh,
    maxDischargeRateKw: selectedSize.dischargeKw,
  }), [selectedSize]);

  const comparisons = useMemo(() => compareTariffs(system, ALL_TARIFFS), [system]);

  const chartData = comparisons.map(c => ({
    name: c.tariff.name.length > 20 ? c.tariff.name.substring(0, 18) + '...' : c.tariff.name,
    fullName: c.tariff.name,
    best: c.revenue.best.totalAnnualGbp,
    likely: c.revenue.likely.totalAnnualGbp,
    worst: c.revenue.worst.totalAnnualGbp,
  }));

  // IOF vs Flux direct comparison for the selected size
  const fluxData = comparisons.find(c => c.tariff.id === 'octopus-flux');
  const iofData = comparisons.find(c => c.tariff.id === 'octopus-iof');
  const agileData = comparisons.find(c => c.tariff.id === 'octopus-agile');

  return (
    <div className="space-y-6">

      {/* IOF vs Flux vs Agile Banner */}
      {fluxData && iofData && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg">⚠️</span>
              <div className="text-sm">
                <p className="font-semibold text-text-primary mb-1">IOF vs Flux for standalone BESS — Key Finding (March 2026)</p>
                <p className="text-text-secondary mb-2">
                  IOF (Intelligent Octopus Flux) uses <strong>equal import/export rates</strong>: 24.27p off-peak and 32.36p peak — both in and out.
                  For a solar+battery home, IOF is superior (high export rates all day). For a <strong>standalone BESS without solar</strong>, IOF
                  has a smaller arbitrage spread (8.09p) vs Flux (12.78p) because the off-peak import rate is 24.27p vs Flux&apos;s 17.90p.
                  Also: IOF signups are currently paused.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[
                    { label: 'Octopus Flux', data: fluxData, highlight: true },
                    { label: 'Intelligent Flux (IOF)', data: iofData, highlight: false },
                    { label: 'Octopus Agile', data: agileData ?? null, highlight: false },
                  ].map(({ label, data, highlight }) => data && (
                    <div key={label} className={`rounded-lg p-3 border ${highlight ? 'border-blue-500/40 bg-blue-500/10' : 'border-border bg-bg-secondary'}`}>
                      <p className="text-xs font-semibold text-text-primary mb-1">{label}</p>
                      <p className="text-xs text-text-secondary">Spread: <span className="font-mono text-text-primary">{data.spreadPence.toFixed(2)}p/kWh</span></p>
                      <p className="text-xs text-text-secondary">Likely/yr: <span className="font-mono text-scenario-likely font-bold">{formatGbp(data.revenue.likely.totalAnnualGbp)}</span></p>
                      <p className="text-xs text-text-secondary">Daily arb: <span className="font-mono text-text-primary">{formatGbp(data.revenue.likely.dailyArbitrageGbp, 2)}</span></p>
                      {label === 'Intelligent Flux (IOF)' && <p className="text-[10px] text-amber-400 mt-1">⚠ Signups paused</p>}
                      {label === 'Octopus Flux' && <p className="text-[10px] text-blue-400 mt-1">✓ Recommended for BESS</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Revenue Comparison Across Tariffs</CardTitle>
              <CardDescription>Same system configuration, different tariffs — annual net revenue (3-scenario)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary">Stack:</label>
              <select
                value={sizeIdx}
                onChange={e => setSizeIdx(Number(e.target.value))}
                className="bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              >
                {ROSESTACK_SIZES.map((s, i) => (
                  <option key={s.kwh + s.label} value={i}>{s.label}</option>
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
