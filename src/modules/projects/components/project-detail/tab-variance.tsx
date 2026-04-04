'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Loader2, BarChart3, Calendar,
} from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import type { ProjectData } from './project-detail-page';

// ── Types ───────────────────────────────────────────────────────────────────
interface ActualsRow {
  month: string;
  importKwh: number;
  exportKwh: number;
  importCostGbp: number;
  exportRevenueGbp: number;
  netRevenueGbp: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);

const gbp2 = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);

const pct = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const DAILY_PER_322: Record<string, number> = { iof: 45, flux: 30, agile: 11 };
const SEASONAL = [0.85, 0.88, 0.95, 1.0, 1.05, 1.1, 1.12, 1.1, 1.05, 0.98, 0.9, 0.85];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Component ───────────────────────────────────────────────────────────────
interface TabVarianceProps {
  project: ProjectData;
}

export function TabVariance({ project }: TabVarianceProps) {
  const [actuals, setActuals] = useState<ActualsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const sys = project.system;
  const capacityKwh = sys?.totalCapacityKwh ?? 0;
  const capex = sys?.installCost ?? 0;
  const tariffKey = (project.tariffName ?? 'flux').toLowerCase().replace(/[^a-z]/g, '');
  const dailyBase = DAILY_PER_322[tariffKey] ?? 30;
  const monthlyPlanned = dailyBase * (capacityKwh / 322) * 30.44;

  // Fetch actuals
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${project.id}/actuals`);
        if (res.ok) {
          const data = await res.json();
          setActuals(data.months ?? []);
        }
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [project.id]);

  // Build comparison data
  const comparison = useMemo(() => {
    if (actuals.length === 0) return [];
    return actuals.map((row) => {
      // Parse month to get seasonal index (assumes "YYYY-MM" or "Jan 2026" format)
      let monthIdx = 0;
      const parts = row.month.split('-');
      if (parts.length === 2) {
        monthIdx = parseInt(parts[1], 10) - 1;
      } else {
        const found = MONTH_NAMES.findIndex((m) => row.month.startsWith(m));
        if (found >= 0) monthIdx = found;
      }
      const planned = monthlyPlanned * (SEASONAL[monthIdx] ?? 1.0);
      const actual = row.netRevenueGbp;
      const varianceGbp = actual - planned;
      const variancePct = planned !== 0 ? ((actual - planned) / planned) * 100 : 0;
      return {
        month: row.month,
        planned: Math.round(planned),
        actual: Math.round(actual),
        varianceGbp: Math.round(varianceGbp),
        variancePct,
      };
    });
  }, [actuals, monthlyPlanned]);

  // Cumulative data
  const cumulativeData = useMemo(() => {
    let cumPlanned = 0;
    let cumActual = 0;
    return comparison.map((row) => {
      cumPlanned += row.planned;
      cumActual += row.actual;
      return {
        month: row.month,
        cumPlanned,
        cumActual,
        cumVariance: cumActual - cumPlanned,
      };
    });
  }, [comparison]);

  // Overall status
  const totalVariance = cumulativeData.length > 0
    ? cumulativeData[cumulativeData.length - 1].cumVariance
    : 0;
  const totalPlanned = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1].cumPlanned : 1;
  const overallPct = (totalVariance / totalPlanned) * 100;

  let statusLabel: string;
  let statusVariant: 'success' | 'warning' | 'danger';
  let StatusIcon: typeof TrendingUp;
  if (overallPct >= 5) {
    statusLabel = 'Ahead of Plan';
    statusVariant = 'success';
    StatusIcon = TrendingUp;
  } else if (overallPct >= -5) {
    statusLabel = 'On Track';
    statusVariant = 'success';
    StatusIcon = Minus;
  } else if (overallPct >= -15) {
    statusLabel = 'Slightly Behind';
    statusVariant = 'warning';
    StatusIcon = AlertTriangle;
  } else {
    statusLabel = 'Behind Plan';
    statusVariant = 'danger';
    StatusIcon = TrendingDown;
  }

  // Revised payback from actual run rate
  const avgMonthlyActual = actuals.length > 0
    ? actuals.reduce((s, r) => s + r.netRevenueGbp, 0) / actuals.length
    : 0;
  const revisedPaybackMonths = avgMonthlyActual > 0 ? Math.ceil(capex / avgMonthlyActual) : Infinity;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (actuals.length === 0) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Actuals Data</h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Sync meter data from the Actuals tab to see performance comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${
        statusVariant === 'success' ? 'border-success/30 bg-success-subtle/20' :
        statusVariant === 'warning' ? 'border-warning/30 bg-warning-subtle/20' :
        'border-danger/30 bg-danger-subtle/20'
      }`}>
        <StatusIcon className={`h-6 w-6 ${
          statusVariant === 'success' ? 'text-success' :
          statusVariant === 'warning' ? 'text-warning' :
          'text-danger'
        }`} />
        <div>
          <p className="text-sm font-semibold text-text-primary">{statusLabel}</p>
          <p className="text-xs text-text-secondary">
            Cumulative variance: {gbp(totalVariance)} ({pct(overallPct)})
          </p>
        </div>
        <Badge variant={statusVariant} className="ml-auto">
          {pct(overallPct)}
        </Badge>
      </div>

      {/* Monthly comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-rose" />
            Monthly Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-tertiary">
                  <th className="py-2 pr-4 text-left font-medium">Month</th>
                  <th className="py-2 px-3 text-right font-medium">Planned</th>
                  <th className="py-2 px-3 text-right font-medium">Actual</th>
                  <th className="py-2 px-3 text-right font-medium">Variance</th>
                  <th className="py-2 px-3 text-right font-medium">%</th>
                  <th className="py-2 pl-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => {
                  const isGood = row.variancePct >= -5;
                  const isGreat = row.variancePct >= 5;
                  return (
                    <tr key={row.month} className="border-b border-border/50 hover:bg-bg-tertiary/50">
                      <td className="py-2 pr-4 font-medium text-text-primary">{row.month}</td>
                      <td className="py-2 px-3 text-right text-text-secondary">{gbp(row.planned)}</td>
                      <td className="py-2 px-3 text-right font-medium text-text-primary">{gbp(row.actual)}</td>
                      <td className={`py-2 px-3 text-right ${row.varianceGbp >= 0 ? 'text-scenario-best' : 'text-scenario-worst'}`}>
                        {row.varianceGbp >= 0 ? '+' : ''}{gbp(row.varianceGbp)}
                      </td>
                      <td className={`py-2 px-3 text-right ${row.variancePct >= 0 ? 'text-scenario-best' : 'text-scenario-worst'}`}>
                        {pct(row.variancePct)}
                      </td>
                      <td className="py-2 pl-3 text-center">
                        {isGreat ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-success" title="Ahead" />
                        ) : isGood ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-scenario-likely" title="On track" />
                        ) : row.variancePct >= -15 ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-warning" title="Slightly behind" />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-danger" title="Behind" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly variance chart */}
      <Card>
        <CardHeader>
          <CardTitle>Planned vs Actual (Monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} tickFormatter={(v) => `\u00A3${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  formatter={(value: number, name: string) => [gbp(value), name]}
                />
                <Legend />
                <Line
                  dataKey="planned"
                  name="Planned"
                  stroke="var(--color-scenario-likely)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  dataKey="actual"
                  name="Actual"
                  stroke="var(--color-rose)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Bar
                  dataKey="varianceGbp"
                  name="Variance"
                  fill="var(--color-text-tertiary)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.4}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Revenue: Planned vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} tickFormatter={(v) => `\u00A3${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  formatter={(value: number, name: string) => [gbp(value), name]}
                />
                <Legend />
                <Line
                  dataKey="cumPlanned"
                  name="Planned (cumulative)"
                  stroke="var(--color-scenario-likely)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                />
                <Line
                  dataKey="cumActual"
                  name="Actual (cumulative)"
                  stroke="var(--color-rose)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revised payback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-rose" />
            Revised Payback Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Original Payback</p>
              <p className="text-xl font-bold text-text-primary mt-1">
                {monthlyPlanned > 0 ? `${(capex / (monthlyPlanned * 12)).toFixed(1)} yrs` : '--'}
              </p>
              <p className="text-xs text-text-tertiary">Based on planned revenue</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Avg Monthly Actual</p>
              <p className="text-xl font-bold text-rose mt-1">{gbp2(avgMonthlyActual)}</p>
              <p className="text-xs text-text-tertiary">Over {actuals.length} months</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Revised Payback</p>
              <p className={`text-xl font-bold mt-1 ${
                revisedPaybackMonths !== Infinity && revisedPaybackMonths < (capex / (monthlyPlanned * 12)) * 12
                  ? 'text-scenario-best'
                  : 'text-scenario-worst'
              }`}>
                {revisedPaybackMonths === Infinity ? '--' : `${(revisedPaybackMonths / 12).toFixed(1)} yrs`}
              </p>
              <p className="text-xs text-text-tertiary">Based on actual run rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
