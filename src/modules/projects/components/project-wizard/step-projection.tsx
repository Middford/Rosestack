'use client';

import { useMemo } from 'react';
import { Card } from '@/shared/ui/card';
import type { ProjectCapex } from '@/modules/projects/types';
import type { HardwareState, TariffName } from './wizard-shell';

interface StepProjectionProps {
  hardware: HardwareState;
  tariffName: TariffName;
  capex: ProjectCapex;
  systemTotals: {
    totalCapKwh: number;
    totalInverterKw: number;
    efficiency: number;
  };
}

const TARIFF_DAILY_BASE: Record<TariffName, number> = {
  iof: 45,
  flux: 30,
  agile: 11,
};

const REFERENCE_KWH = 322;

const SCENARIO_MULTIPLIERS = {
  best: 1.3,
  likely: 1.0,
  worst: 0.7,
} as const;

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

function fmtDec(n: number, dp: number = 1): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function StepProjection({ hardware, tariffName, capex, systemTotals }: StepProjectionProps) {
  const projection = useMemo(() => {
    const dailyBase = TARIFF_DAILY_BASE[tariffName];
    const scale = systemTotals.totalCapKwh / REFERENCE_KWH;
    const dailyScaled = dailyBase * scale;

    const scenarios = (['best', 'likely', 'worst'] as const).map((s) => {
      const daily = dailyScaled * SCENARIO_MULTIPLIERS[s];
      const annual = daily * 365;
      const monthly = annual / 12;
      const paybackYears = capex.totalCapex > 0 ? capex.totalCapex / annual : 0;
      return { scenario: s, daily, monthly, annual, paybackYears };
    });

    // 10-year cumulative table
    const cumulativeTable = Array.from({ length: 10 }, (_, i) => {
      const year = i + 1;
      return {
        year,
        best: scenarios[0].annual * year,
        likely: scenarios[1].annual * year,
        worst: scenarios[2].annual * year,
        capex: capex.totalCapex,
      };
    });

    return { scenarios, cumulativeTable };
  }, [tariffName, systemTotals.totalCapKwh, capex.totalCapex]);

  const scenarioColors = {
    best: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    likely: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    worst: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  } as const;

  const scenarioLabels = { best: 'Best Case', likely: 'Likely Case', worst: 'Worst Case' } as const;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Revenue Projection</h2>
      <p className="text-sm text-text-secondary">
        Simplified estimate based on {systemTotals.totalCapKwh.toFixed(0)} kWh system on{' '}
        {tariffName.toUpperCase()} tariff. Three-scenario analysis per RoseStack financial standard.
      </p>

      {/* Three scenario cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {projection.scenarios.map((s) => {
          const colors = scenarioColors[s.scenario];
          return (
            <Card
              key={s.scenario}
              className={`p-5 ${colors.bg} border ${colors.border}`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                {scenarioLabels[s.scenario]}
              </p>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-text-tertiary text-xs">Annual Revenue</p>
                  <p className={`text-xl font-bold ${colors.text}`}>
                    &pound;{fmt(s.annual)}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Monthly Revenue</p>
                  <p className="text-sm text-text-primary">&pound;{fmt(s.monthly)}</p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Payback Period</p>
                  <p className="text-sm text-text-primary">{fmtDec(s.paybackYears)} years</p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Daily Average</p>
                  <p className="text-sm text-text-primary">&pound;{fmtDec(s.daily, 2)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 10-year cumulative table */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          10-Year Cumulative Revenue vs CAPEX
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-tertiary uppercase tracking-wide py-2 pr-3">
                  Year
                </th>
                <th className="text-right text-xs text-emerald-400 uppercase tracking-wide py-2 pr-3">
                  Best
                </th>
                <th className="text-right text-xs text-blue-400 uppercase tracking-wide py-2 pr-3">
                  Likely
                </th>
                <th className="text-right text-xs text-red-400 uppercase tracking-wide py-2 pr-3">
                  Worst
                </th>
                <th className="text-right text-xs text-text-tertiary uppercase tracking-wide py-2">
                  CAPEX
                </th>
              </tr>
            </thead>
            <tbody>
              {projection.cumulativeTable.map((row) => {
                const likelyNet = row.likely - row.capex;
                return (
                  <tr key={row.year} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-text-secondary">{row.year}</td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        row.best >= row.capex ? 'text-emerald-400' : 'text-text-secondary'
                      }`}
                    >
                      &pound;{fmt(row.best)}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums font-medium ${
                        row.likely >= row.capex ? 'text-blue-400' : 'text-text-secondary'
                      }`}
                    >
                      &pound;{fmt(row.likely)}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        row.worst >= row.capex ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      &pound;{fmt(row.worst)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-text-tertiary">
                      &pound;{fmt(row.capex)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-tertiary mt-3">
          Row turns green when cumulative revenue exceeds CAPEX (payback achieved).
        </p>
      </Card>
    </div>
  );
}
