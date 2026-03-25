'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui';
import { HISTORICAL_RATES } from '../data';

export function HistoricalRates() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historical Import & Export Rates</CardTitle>
          <CardDescription>Monthly averages for Agile import/export and Flux/IOF peak export</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={HISTORICAL_RATES} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickFormatter={v => `${v}p`}
                label={{ value: 'p/kWh', angle: -90, position: 'insideLeft', fill: 'var(--color-text-tertiary)', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}p/kWh`, name]}
              />
              <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="agileAvgImport"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Agile Avg Import"
              />
              <Line
                type="monotone"
                dataKey="agileAvgExport"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Agile Avg Export"
              />
              <Line
                type="monotone"
                dataKey="fluxPeakExport"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Flux Peak Export"
              />
              <Line
                type="monotone"
                dataKey="iofPeakExport"
                stroke="#EC4899"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="IOF Peak Export"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saving Sessions Rate History</CardTitle>
          <CardDescription>Monthly session rates (0 = no sessions that month, typically Oct-Mar season)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={HISTORICAL_RATES} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickFormatter={v => `${v}p`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
                formatter={(value: number) => [`${value}p/kWh`, 'Saving Session Rate']}
              />
              <Line
                type="monotone"
                dataKey="savingSessionRate"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#F59E0B' }}
                name="Saving Session Rate"
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-text-tertiary">Peak Rate</p>
              <p className="text-lg font-bold text-warning font-mono">
                {Math.max(...HISTORICAL_RATES.filter(r => r.savingSessionRate > 0).map(r => r.savingSessionRate))}p/kWh
              </p>
            </div>
            <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-text-tertiary">Average Rate</p>
              <p className="text-lg font-bold text-info font-mono">
                {Math.round(
                  HISTORICAL_RATES.filter(r => r.savingSessionRate > 0)
                    .reduce((sum, r) => sum + r.savingSessionRate, 0) /
                  HISTORICAL_RATES.filter(r => r.savingSessionRate > 0).length
                )}p/kWh
              </p>
            </div>
            <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-text-tertiary">Active Months</p>
              <p className="text-lg font-bold text-success font-mono">
                {HISTORICAL_RATES.filter(r => r.savingSessionRate > 0).length} / {HISTORICAL_RATES.length}
              </p>
            </div>
            <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-text-tertiary">Season</p>
              <p className="text-lg font-bold text-text-primary">Oct - Mar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
