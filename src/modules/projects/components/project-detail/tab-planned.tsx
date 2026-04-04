'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import type { ProjectData } from './project-detail-page';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);

// Daily revenue per 322 kWh reference system by tariff
const DAILY_PER_322: Record<string, number> = { iof: 45, flux: 30, agile: 11 };
const SCENARIO_MULTIPLIERS = { best: 1.3, likely: 1.0, worst: 0.7 };
const REVENUE_MIX = [
  { source: 'Arbitrage', pct: 73 },
  { source: 'Solar self-use', pct: 10 },
  { source: 'Saving Sessions', pct: 8 },
  { source: 'SEG Export', pct: 5 },
  { source: 'Piclo Flex', pct: 4 },
];

function getDailyBase(capacityKwh: number, tariff: string | null): number {
  const key = (tariff ?? 'flux').toLowerCase().replace(/[^a-z]/g, '');
  const daily = DAILY_PER_322[key] ?? 30;
  return daily * (capacityKwh / 322);
}

// ── Component ───────────────────────────────────────────────────────────────
interface TabPlannedProps {
  project: ProjectData;
}

export function TabPlanned({ project }: TabPlannedProps) {
  const sys = project.system;
  const capacityKwh = sys?.totalCapacityKwh ?? 0;
  const capex = sys?.installCost ?? 0;

  const dailyBase = getDailyBase(capacityKwh, project.tariffName);

  const scenarios = useMemo(() => {
    const daily = {
      best: dailyBase * SCENARIO_MULTIPLIERS.best,
      likely: dailyBase * SCENARIO_MULTIPLIERS.likely,
      worst: dailyBase * SCENARIO_MULTIPLIERS.worst,
    };
    const monthly = { best: daily.best * 30.44, likely: daily.likely * 30.44, worst: daily.worst * 30.44 };
    const annual = { best: monthly.best * 12, likely: monthly.likely * 12, worst: monthly.worst * 12 };
    return { daily, monthly, annual };
  }, [dailyBase]);

  // Monthly chart data (12 months, slight seasonal variation)
  const monthlyChart = useMemo(() => {
    const seasonalFactor = [0.85, 0.88, 0.95, 1.0, 1.05, 1.1, 1.12, 1.1, 1.05, 0.98, 0.9, 0.85];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => ({
      month,
      likely: Math.round(scenarios.monthly.likely * seasonalFactor[i]),
      best: Math.round(scenarios.monthly.best * seasonalFactor[i]),
      worst: Math.round(scenarios.monthly.worst * seasonalFactor[i]),
    }));
  }, [scenarios]);

  // 10-year table
  const yearTable = useMemo(() => {
    const rows = [];
    let cumBest = 0, cumLikely = 0, cumWorst = 0;
    for (let yr = 1; yr <= 10; yr++) {
      // Small annual degradation (0.5% per year battery degradation)
      const degrad = Math.pow(0.995, yr - 1);
      const best = Math.round(scenarios.annual.best * degrad);
      const likely = Math.round(scenarios.annual.likely * degrad);
      const worst = Math.round(scenarios.annual.worst * degrad);
      cumBest += best;
      cumLikely += likely;
      cumWorst += worst;
      rows.push({
        year: yr,
        best, likely, worst,
        cumBest, cumLikely, cumWorst,
        capexRemaining: Math.max(0, capex - cumLikely),
      });
    }
    return rows;
  }, [scenarios, capex]);

  return (
    <div className="space-y-6">
      {/* Three scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScenarioCard
          label="Best Case"
          color="text-scenario-best"
          bgColor="bg-scenario-best/10"
          borderColor="border-scenario-best/30"
          icon={<TrendingUp className="h-5 w-5" />}
          annual={scenarios.annual.best}
          monthly={scenarios.monthly.best}
          daily={scenarios.daily.best}
        />
        <ScenarioCard
          label="Likely Case"
          color="text-scenario-likely"
          bgColor="bg-scenario-likely/10"
          borderColor="border-scenario-likely/30"
          icon={<Minus className="h-5 w-5" />}
          annual={scenarios.annual.likely}
          monthly={scenarios.monthly.likely}
          daily={scenarios.daily.likely}
          prominent
        />
        <ScenarioCard
          label="Worst Case"
          color="text-scenario-worst"
          bgColor="bg-scenario-worst/10"
          borderColor="border-scenario-worst/30"
          icon={<TrendingDown className="h-5 w-5" />}
          annual={scenarios.annual.worst}
          monthly={scenarios.monthly.worst}
          daily={scenarios.daily.worst}
        />
      </div>

      {/* Monthly revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} tickFormatter={(v) => `\u00A3${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  formatter={(value: number) => [fmt(value), '']}
                />
                <Legend />
                <Area
                  dataKey="best"
                  name="Best / Worst range"
                  fill="var(--color-scenario-best)"
                  fillOpacity={0.08}
                  stroke="none"
                />
                <Area
                  dataKey="worst"
                  name=""
                  fill="var(--color-bg-primary)"
                  fillOpacity={1}
                  stroke="none"
                />
                <Bar dataKey="likely" name="Likely" fill="var(--color-scenario-likely)" radius={[4, 4, 0, 0]} />
                <Line dataKey="best" name="Best" stroke="var(--color-scenario-best)" strokeDasharray="4 4" dot={false} />
                <Line dataKey="worst" name="Worst" stroke="var(--color-scenario-worst)" strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 10-year table */}
      <Card>
        <CardHeader>
          <CardTitle>10-Year Revenue Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-tertiary">
                  <th className="py-2 pr-4 text-left font-medium">Year</th>
                  <th className="py-2 px-3 text-right font-medium text-scenario-best">Best</th>
                  <th className="py-2 px-3 text-right font-medium text-scenario-likely">Likely</th>
                  <th className="py-2 px-3 text-right font-medium text-scenario-worst">Worst</th>
                  <th className="py-2 px-3 text-right font-medium">Cumulative</th>
                  <th className="py-2 pl-3 text-right font-medium">CAPEX Left</th>
                </tr>
              </thead>
              <tbody>
                {yearTable.map((row) => (
                  <tr key={row.year} className="border-b border-border/50 hover:bg-bg-tertiary/50">
                    <td className="py-2 pr-4 font-medium text-text-primary">{row.year}</td>
                    <td className="py-2 px-3 text-right text-scenario-best">{fmt(row.best)}</td>
                    <td className="py-2 px-3 text-right font-medium text-scenario-likely">{fmt(row.likely)}</td>
                    <td className="py-2 px-3 text-right text-scenario-worst">{fmt(row.worst)}</td>
                    <td className="py-2 px-3 text-right text-text-secondary">{fmt(row.cumLikely)}</td>
                    <td className="py-2 pl-3 text-right text-text-secondary">
                      {row.capexRemaining > 0 ? fmt(row.capexRemaining) : (
                        <Badge variant="success">Paid off</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Revenue mix */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Mix Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {REVENUE_MIX.map((item) => (
              <div key={item.source} className="flex items-center gap-3">
                <span className="w-32 text-sm text-text-secondary">{item.source}</span>
                <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose rounded-full transition-all"
                    style={{ width: `${item.pct}%`, opacity: 0.4 + (item.pct / 100) * 0.6 }}
                  />
                </div>
                <span className="w-10 text-sm font-medium text-text-primary text-right">{item.pct}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Scenario card sub-component ─────────────────────────────────────────────
function ScenarioCard({
  label, color, bgColor, borderColor, icon,
  annual, monthly, daily, prominent,
}: {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  annual: number;
  monthly: number;
  daily: number;
  prominent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${bgColor} ${borderColor} ${prominent ? 'ring-2 ring-scenario-likely/40' : ''}`}>
      <div className={`flex items-center gap-2 mb-3 ${color}`}>
        {icon}
        <span className="text-sm font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-text-tertiary">Annual</p>
          <p className={`text-2xl font-bold ${color}`}>{fmt(annual)}</p>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-text-tertiary">Monthly</p>
            <p className={`text-lg font-semibold ${color}`}>{fmt(monthly)}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Daily</p>
            <p className={`text-sm font-medium ${color}`}>{fmt(daily)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
