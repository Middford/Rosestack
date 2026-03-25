'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, StatCard, Badge } from '@/shared/ui';
import { ScenarioChart, TrafficLight } from '@/shared/ui';
import {
  SYSTEM_OPTIONS,
  TARIFF_OPTIONS,
  calculatePerHomePnl,
  formatGbp,
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
} from '../data';
import type { ScenarioAssumptions } from '@/shared/types';

export function ModelBuilder() {
  const [systemIdx, setSystemIdx] = useState(0);
  const [tariffIdx, setTariffIdx] = useState(0);
  const [years, setYears] = useState<10 | 20>(10);

  const system = SYSTEM_OPTIONS[systemIdx]?.system;
  const tariff = TARIFF_OPTIONS[tariffIdx];

  const pnl = useMemo(() => {
    if (!system || !tariff) return null;
    return calculatePerHomePnl(system, tariff);
  }, [systemIdx, tariffIdx]);

  if (!system || !tariff || !pnl) {
    return <div className="text-text-tertiary p-8 text-center">Select a system and tariff to begin.</div>;
  }

  const projection = years === 10 ? pnl.projection : pnl.twentyYearProjection;
  const summary = years === 10 ? pnl.summary : pnl.twentyYearSummary;

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">System Configuration</label>
              <select
                value={systemIdx}
                onChange={e => setSystemIdx(Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              >
                {SYSTEM_OPTIONS.map((opt, i) => (
                  <option key={opt.id} value={i}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Tariff</label>
              <select
                value={tariffIdx}
                onChange={e => setTariffIdx(Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              >
                {TARIFF_OPTIONS.map((t, i) => (
                  <option key={t.id} value={i}>{t.supplier} — {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Projection Period</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setYears(10)}
                  className={`flex-1 px-3 py-2 text-sm rounded-[var(--radius-md)] border transition-colors ${
                    years === 10
                      ? 'border-rose bg-rose/10 text-rose-light'
                      : 'border-border text-text-secondary hover:border-border-hover'
                  }`}
                >
                  10 Year
                </button>
                <button
                  onClick={() => setYears(20)}
                  className={`flex-1 px-3 py-2 text-sm rounded-[var(--radius-md)] border transition-colors ${
                    years === 20
                      ? 'border-rose bg-rose/10 text-rose-light'
                      : 'border-border text-text-secondary hover:border-border-hover'
                  }`}
                >
                  20 Year
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total CAPEX"
          bestValue={formatGbp(pnl.totalCapex)}
          likelyValue={formatGbp(pnl.totalCapex)}
          worstValue={formatGbp(pnl.totalCapex)}
        />
        <StatCard
          label="Payback Period"
          bestValue={`${summary.best.paybackMonths}m`}
          likelyValue={`${summary.likely.paybackMonths}m`}
          worstValue={`${summary.worst.paybackMonths}m`}
        />
        <StatCard
          label={`${years}yr IRR`}
          bestValue={`${(years === 10 ? summary.best.tenYearIrr : pnl.irr20Year.best).toFixed(1)}%`}
          likelyValue={`${(years === 10 ? summary.likely.tenYearIrr : pnl.irr20Year.likely).toFixed(1)}%`}
          worstValue={`${(years === 10 ? summary.worst.tenYearIrr : pnl.irr20Year.worst).toFixed(1)}%`}
        />
        <StatCard
          label={`${years}yr NPV (8%)`}
          bestValue={formatGbp(summary.best.tenYearNpv)}
          likelyValue={formatGbp(summary.likely.tenYearNpv)}
          worstValue={formatGbp(summary.worst.tenYearNpv)}
        />
        <StatCard
          label="Annual Net Revenue"
          bestValue={formatGbp(summary.best.annualNetRevenue)}
          likelyValue={formatGbp(summary.likely.annualNetRevenue)}
          worstValue={formatGbp(summary.worst.annualNetRevenue)}
        />
        <Card className="p-4 flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
          <TrafficLight status={pnl.trafficLight} label={
            pnl.trafficLight === 'green' ? 'All profitable'
            : pnl.trafficLight === 'amber' ? 'Worst marginal'
            : 'Worst loss-making'
          } />
          <p className="text-xs text-text-tertiary mt-2">{pnl.paybackRange}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Net Revenue Over Time</CardTitle>
            <CardDescription>Annual net revenue across three scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioChart projection={projection} dataKey="netRevenue" formatValue={v => formatGbp(v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumulative Cash Flow</CardTitle>
            <CardDescription>Running total of net revenue vs CAPEX</CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioChart projection={projection} dataKey="cumulativeRevenue" formatValue={v => formatGbp(v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gross Revenue</CardTitle>
            <CardDescription>Total revenue before costs</CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioChart projection={projection} dataKey="grossRevenue" formatValue={v => formatGbp(v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Battery Capacity Remaining</CardTitle>
            <CardDescription>Degradation impact over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioChart projection={projection} dataKey="batteryCapacityRemaining" formatValue={v => `${v.toFixed(1)}%`} />
          </CardContent>
        </Card>
      </div>

      {/* NPV Table */}
      <Card>
        <CardHeader>
          <CardTitle>NPV at Various Discount Rates (20yr)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Discount Rate</th>
                  <th className="text-right py-2 px-3 text-scenario-best font-medium">Best</th>
                  <th className="text-right py-2 px-3 text-scenario-likely font-medium">Likely</th>
                  <th className="text-right py-2 px-3 text-scenario-worst font-medium">Worst</th>
                </tr>
              </thead>
              <tbody>
                {pnl.npvAtRates.map(row => (
                  <tr key={row.rate} className="border-b border-border/50">
                    <td className="py-2 px-3 text-text-primary">{row.rate}%</td>
                    <td className="py-2 px-3 text-right text-scenario-best">{formatGbp(row.best)}</td>
                    <td className="py-2 px-3 text-right text-scenario-likely font-medium">{formatGbp(row.likely)}</td>
                    <td className="py-2 px-3 text-right text-scenario-worst">{formatGbp(row.worst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
