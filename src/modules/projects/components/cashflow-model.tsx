'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Settings, TrendingUp, FolderOpen } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Badge } from '@/shared/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui/table';

/* ---------- Types ---------- */

interface CashflowMonth {
  month: string; // YYYY-MM
  capex: number;
  revenueLikely: number;
  cumulativeBest: number;
  cumulativeLikely: number;
  cumulativeWorst: number;
}

interface ScenarioSummary {
  peakBorrowing: number;
  breakEvenMonth: number | null;
}

interface ProjectTimeline {
  id: string;
  address: string;
  targetInstallDate: string | null;
  capex: number;
  monthlyRevenueLikely: number;
  financialPhase: string;
}

interface CashflowData {
  months: CashflowMonth[];
  best: ScenarioSummary;
  likely: ScenarioSummary;
  worst: ScenarioSummary;
  totalCapex: number;
  liveCount: number;
  totalCount: number;
  projects: ProjectTimeline[];
}

interface CashflowSettings {
  facilitySize: number;
  interestRate: number;
  horizonMonths: number;
}

/* ---------- Tooltip ---------- */

const tooltipStyle = {
  backgroundColor: '#1A1D2E',
  border: '1px solid #2A2D3E',
  borderRadius: '8px',
  color: '#F0F1F5',
  fontSize: '12px',
};

function formatCurrency(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v.toFixed(0)}`;
}

/* ---------- Component ---------- */

export function CashflowModel() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [settings, setSettings] = useState<CashflowSettings>({
    facilitySize: 500_000,
    interestRate: 8,
    horizonMonths: 96,
  });
  const [localSettings, setLocalSettings] = useState<CashflowSettings>(settings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/cashflow');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // empty state will render
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/settings');
      if (res.ok) {
        const json = await res.json();
        setSettings(json);
        setLocalSettings(json);
      }
    } catch {
      // use defaults
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [fetchData, fetchSettings]);

  async function handleUpdateSettings() {
    setSaving(true);
    try {
      await fetch('/api/projects/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      });
      setSettings(localSettings);
      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Empty / Loading ---------- */

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <p className="text-text-secondary">Loading cashflow model...</p>
      </Card>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <FolderOpen className="w-12 h-12 text-text-tertiary" />
        <div>
          <p className="text-lg font-semibold text-text-primary">
            Add projects to see cashflow forecast
          </p>
          <p className="text-sm text-text-secondary mt-1">
            The cashflow model will populate once you have at least one project.
          </p>
        </div>
        <Link href="/projects/add">
          <Button>Add your first project</Button>
        </Link>
      </Card>
    );
  }

  const phaseVariant = (phase: string): 'default' | 'info' | 'warning' | 'success' | 'danger' => {
    if (phase === 'pre_capex') return 'default';
    if (phase === 'capex_deployed') return 'info';
    if (phase === 'revenue_generating') return 'success';
    if (phase === 'break_even') return 'success';
    return 'default';
  };

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* Settings bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Model Settings</span>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-text-secondary">Facility Size</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                    £
                  </span>
                  <input
                    type="number"
                    value={localSettings.facilitySize}
                    onChange={(e) =>
                      setLocalSettings((s) => ({ ...s, facilitySize: Number(e.target.value) }))
                    }
                    className="w-full h-9 pl-7 pr-3 rounded-md bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose"
                  />
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-text-secondary">Interest Rate</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={localSettings.interestRate}
                    onChange={(e) =>
                      setLocalSettings((s) => ({ ...s, interestRate: Number(e.target.value) }))
                    }
                    className="w-full h-9 pl-3 pr-7 rounded-md bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                    %
                  </span>
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-text-secondary">Horizon</span>
                <select
                  value={localSettings.horizonMonths}
                  onChange={(e) =>
                    setLocalSettings((s) => ({ ...s, horizonMonths: Number(e.target.value) }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose"
                >
                  <option value={60}>60 months (5 yr)</option>
                  <option value={96}>96 months (8 yr)</option>
                  <option value={120}>120 months (10 yr)</option>
                </select>
              </label>
            </div>

            <Button size="sm" onClick={handleUpdateSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Update'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Peak Borrowing"
          value={formatCurrency(data.likely.peakBorrowing)}
          subtitle="Likely case"
        />
        <SimpleStatCard
          label="Break-Even"
          value={
            data.likely.breakEvenMonth != null
              ? `Month ${data.likely.breakEvenMonth}`
              : 'N/A'
          }
          subtitle="Likely case"
        />
        <SimpleStatCard
          label="Total CAPEX Deployed"
          value={formatCurrency(data.totalCapex)}
        />
        <SimpleStatCard
          label="Projects"
          value={`${data.liveCount} / ${data.totalCount}`}
          subtitle="Live / Total"
        />
      </div>

      {/* Main chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose" />
            Cashflow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data.months} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2D3E' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2D3E' }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />

              <ReferenceLine y={0} stroke="#4B5563" strokeDasharray="4 4" />
              <ReferenceLine
                y={-settings.facilitySize}
                stroke="#EF4444"
                strokeDasharray="6 3"
                label={{
                  value: 'Facility Limit',
                  position: 'insideTopLeft',
                  fill: '#EF4444',
                  fontSize: 11,
                }}
              />

              {/* CAPEX drawdowns (negative bars) */}
              <Bar dataKey="capex" name="CAPEX" fill="#EF4444" opacity={0.8} />

              {/* Revenue (positive bars) */}
              <Bar dataKey="revenueLikely" name="Revenue (Likely)" fill="#10B981" opacity={0.8} />

              {/* Cumulative lines */}
              <Line
                type="monotone"
                dataKey="cumulativeLikely"
                name="Cumulative (Likely)"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeBest"
                name="Cumulative (Best)"
                stroke="#10B981"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeWorst"
                name="Cumulative (Worst)"
                stroke="#EF4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Three-scenario summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-emerald-400">Best Case</p>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Peak Borrowing</span>
              <span className="text-text-primary">{formatCurrency(data.best.peakBorrowing)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Break-Even</span>
              <span className="text-text-primary">
                {data.best.breakEvenMonth != null ? `Month ${data.best.breakEvenMonth}` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-400">Likely Case</p>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Peak Borrowing</span>
              <span className="text-text-primary font-medium">
                {formatCurrency(data.likely.peakBorrowing)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Break-Even</span>
              <span className="text-text-primary font-medium">
                {data.likely.breakEvenMonth != null
                  ? `Month ${data.likely.breakEvenMonth}`
                  : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-red-400">Worst Case</p>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Peak Borrowing</span>
              <span className="text-text-primary">{formatCurrency(data.worst.peakBorrowing)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Break-Even</span>
              <span className="text-text-primary">
                {data.worst.breakEvenMonth != null ? `Month ${data.worst.breakEvenMonth}` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project timeline table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Target Install</TableHead>
                <TableHead>CAPEX</TableHead>
                <TableHead>Monthly Revenue</TableHead>
                <TableHead>Phase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-rose hover:underline font-medium"
                    >
                      {p.address}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {p.targetInstallDate
                      ? new Date(p.targetInstallDate).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(p.capex)}</TableCell>
                  <TableCell>{formatCurrency(p.monthlyRevenueLikely)}</TableCell>
                  <TableCell>
                    <Badge variant={phaseVariant(p.financialPhase)}>
                      {p.financialPhase?.replace(/_/g, ' ') ?? '-'}
                    </Badge>
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
