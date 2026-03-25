'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, StatCard, Badge } from '@/shared/ui';
import { TrafficLight } from '@/shared/ui';
import {
  SYSTEM_OPTIONS,
  TARIFF_OPTIONS,
  compareScenarios,
  formatGbp,
} from '../data';
import type { ScenarioComparison } from '../data';

export function ScenarioDashboard() {
  const comparisons = useMemo(() => {
    // Compare top 3 systems against top 3 tariffs
    const topSystems = SYSTEM_OPTIONS.slice(0, 4);
    const topTariffs = TARIFF_OPTIONS.filter(t => t.bestForBattery || t.type === 'flux' || t.type === 'agile').slice(0, 4);
    return compareScenarios(topSystems, topTariffs);
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        Side-by-side comparison of system/tariff combinations with traffic light scoring. Green = all three scenarios profitable, Amber = worst case marginal, Red = worst case loss-making.
      </p>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisons.map((c, i) => (
          <ScenarioCard key={i} comparison={c} rank={i + 1} />
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Comparison Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">#</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">System</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Tariff</th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">CAPEX</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Payback</th>
                  <th className="text-right py-2 px-3 text-scenario-best font-medium">Best NPV</th>
                  <th className="text-right py-2 px-3 text-scenario-likely font-medium">Likely NPV</th>
                  <th className="text-right py-2 px-3 text-scenario-worst font-medium">Worst NPV</th>
                  <th className="text-right py-2 px-3 text-scenario-likely font-medium">IRR</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-bg-primary/50">
                    <td className="py-2 px-3 text-text-tertiary">{i + 1}</td>
                    <td className="py-2 px-3 text-text-primary text-xs">{c.systemLabel}</td>
                    <td className="py-2 px-3 text-text-primary text-xs">{c.tariffLabel}</td>
                    <td className="py-2 px-3 text-center"><TrafficLight status={c.trafficLight} /></td>
                    <td className="py-2 px-3 text-right text-text-secondary">{formatGbp(c.totalCapex)}</td>
                    <td className="py-2 px-3 text-right text-text-secondary text-xs">{c.paybackRange}</td>
                    <td className="py-2 px-3 text-right text-scenario-best">{formatGbp(c.summary.best.tenYearNpv)}</td>
                    <td className="py-2 px-3 text-right text-scenario-likely font-medium">{formatGbp(c.summary.likely.tenYearNpv)}</td>
                    <td className="py-2 px-3 text-right text-scenario-worst">{formatGbp(c.summary.worst.tenYearNpv)}</td>
                    <td className="py-2 px-3 text-right text-scenario-likely">{c.summary.likely.tenYearIrr.toFixed(1)}%</td>
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

function ScenarioCard({ comparison: c, rank }: { comparison: ScenarioComparison; rank: number }) {
  return (
    <Card className="relative">
      <div className="absolute top-3 right-3">
        <TrafficLight status={c.trafficLight} label={
          c.trafficLight === 'green' ? 'Profitable'
          : c.trafficLight === 'amber' ? 'Marginal'
          : 'Loss-making'
        } />
      </div>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant={rank <= 3 ? 'rose' : 'default'}>#{rank}</Badge>
          <CardTitle className="text-base">{c.tariffLabel}</CardTitle>
        </div>
        <CardDescription className="text-xs">{c.systemLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-scenario-best uppercase tracking-wider">Best</p>
            <p className="text-sm font-medium text-scenario-best">{formatGbp(c.summary.best.tenYearNpv)}</p>
          </div>
          <div>
            <p className="text-[10px] text-scenario-likely uppercase tracking-wider">Likely</p>
            <p className="text-lg font-bold text-scenario-likely">{formatGbp(c.summary.likely.tenYearNpv)}</p>
          </div>
          <div>
            <p className="text-[10px] text-scenario-worst uppercase tracking-wider">Worst</p>
            <p className="text-sm font-medium text-scenario-worst">{formatGbp(c.summary.worst.tenYearNpv)}</p>
          </div>
        </div>
        <div className="border-t border-border pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">CAPEX</span>
            <span className="text-text-primary">{formatGbp(c.totalCapex)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">Payback</span>
            <span className="text-text-primary">{c.paybackRange}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">IRR</span>
            <span className="text-text-primary">{c.summary.likely.tenYearIrr.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">DSCR</span>
            <span className={
              c.summary.likely.dscr >= 1.2 ? 'text-success' : c.summary.likely.dscr >= 1.0 ? 'text-warning' : 'text-danger'
            }>{c.summary.likely.dscr.toFixed(2)}x</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
