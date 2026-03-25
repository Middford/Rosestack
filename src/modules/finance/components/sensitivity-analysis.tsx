'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/shared/ui';
import { getScenarioHex } from '@/shared/utils/scenarios';
import {
  SYSTEM_OPTIONS,
  TARIFF_OPTIONS,
  calculateSensitivity,
  formatGbp,
} from '../data';

export function SensitivityAnalysis() {
  const [systemIdx, setSystemIdx] = useState(0);
  const [tariffIdx, setTariffIdx] = useState(0);

  const system = SYSTEM_OPTIONS[systemIdx]?.system;
  const tariff = TARIFF_OPTIONS[tariffIdx];

  const points = useMemo(() => {
    if (!system || !tariff) return [];
    return calculateSensitivity(system, tariff);
  }, [systemIdx, tariffIdx]);

  if (!system || !tariff) return null;

  // Group by variable for bar charts
  const grouped = new Map<string, typeof points>();
  for (const p of points) {
    const existing = grouped.get(p.variable) ?? [];
    existing.push(p);
    grouped.set(p.variable, existing);
  }

  // Build radar data — normalise NPV per variable
  const baseNpv = (() => {
    if (points.length === 0) return 1;
    const likelyNpvs = points.map(p => p.tenYearNpv.likely);
    return Math.max(...likelyNpvs.map(Math.abs), 1);
  })();

  const radarData = Array.from(grouped.entries()).map(([variable, pts]) => {
    const midIdx = Math.floor(pts.length / 2);
    return {
      variable,
      best: Math.round((pts[midIdx]?.tenYearNpv.best ?? 0) / baseNpv * 100),
      likely: Math.round((pts[midIdx]?.tenYearNpv.likely ?? 0) / baseNpv * 100),
      worst: Math.round((pts[midIdx]?.tenYearNpv.worst ?? 0) / baseNpv * 100),
    };
  });

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">System</label>
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
          </div>
        </CardContent>
      </Card>

      {/* Spider Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Spider Chart</CardTitle>
          <CardDescription>Relative impact of each variable on NPV across all three scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="variable" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
              <Legend />
              <Radar name="Best" dataKey="best" stroke={getScenarioHex('best')} fill={getScenarioHex('best')} fillOpacity={0.1} />
              <Radar name="Likely" dataKey="likely" stroke={getScenarioHex('likely')} fill={getScenarioHex('likely')} fillOpacity={0.15} />
              <Radar name="Worst" dataKey="worst" stroke={getScenarioHex('worst')} fill={getScenarioHex('worst')} fillOpacity={0.1} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-Variable Detail Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from(grouped.entries()).map(([variable, pts]) => (
          <Card key={variable}>
            <CardHeader>
              <CardTitle>{variable}</CardTitle>
              <CardDescription>10yr NPV impact across scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pts.map(p => ({
                  label: p.label,
                  best: Math.round(p.tenYearNpv.best),
                  likely: Math.round(p.tenYearNpv.likely),
                  worst: Math.round(p.tenYearNpv.worst),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} formatter={(v: number) => formatGbp(v)} />
                  <Bar dataKey="best" fill={getScenarioHex('best')} name="Best" />
                  <Bar dataKey="likely" fill={getScenarioHex('likely')} name="Likely" />
                  <Bar dataKey="worst" fill={getScenarioHex('worst')} name="Worst" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
