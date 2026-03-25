'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui';
import { ALL_TARIFFS } from '../data';
import type { TariffWithMeta } from '../data';

interface HourlyRate {
  hour: string;
  importRate: number;
  exportRate: number;
  window: 'charge' | 'hold' | 'discharge';
}

function buildHourlyData(tariff: TariffWithMeta): HourlyRate[] {
  const hours: HourlyRate[] = [];

  for (let h = 0; h < 24; h++) {
    const timeStr = `${h.toString().padStart(2, '0')}:00`;
    const hourMid = h + 0.5;

    // Find matching import rate
    let importRate = 0;
    for (const rate of tariff.importRates) {
      const [sH, sM] = rate.periodStart.split(':').map(Number);
      const [eH, eM] = rate.periodEnd.split(':').map(Number);
      let start = sH + sM / 60;
      let end = eH + eM / 60;

      if (end <= start) {
        // Crosses midnight
        if (hourMid >= start || hourMid < end) {
          importRate = rate.ratePencePerKwh;
          break;
        }
      } else {
        if (hourMid >= start && hourMid < end) {
          importRate = rate.ratePencePerKwh;
          break;
        }
      }
    }

    // Find matching export rate
    let exportRate = 0;
    for (const rate of tariff.exportRates) {
      const [sH, sM] = rate.periodStart.split(':').map(Number);
      const [eH, eM] = rate.periodEnd.split(':').map(Number);
      let start = sH + sM / 60;
      let end = eH + eM / 60;

      if (end <= start) {
        if (hourMid >= start || hourMid < end) {
          exportRate = rate.ratePencePerKwh;
          break;
        }
      } else if (end === 24 && start === 0) {
        exportRate = rate.ratePencePerKwh;
        break;
      } else {
        if (hourMid >= start && hourMid < end) {
          exportRate = rate.ratePencePerKwh;
          break;
        }
      }
    }

    // Determine window
    const cheapestImport = Math.min(...tariff.importRates.map(r => r.ratePencePerKwh));
    const bestExport = Math.max(...tariff.exportRates.map(r => r.ratePencePerKwh));

    let window: 'charge' | 'hold' | 'discharge' = 'hold';
    if (importRate <= cheapestImport * 1.1) window = 'charge';
    else if (exportRate >= bestExport * 0.95) window = 'discharge';

    hours.push({
      hour: timeStr,
      importRate,
      exportRate,
      window,
    });
  }

  return hours;
}

export function RateTimeline() {
  const [selectedTariffId, setSelectedTariffId] = useState(ALL_TARIFFS[0].id);
  const tariff = ALL_TARIFFS.find(t => t.id === selectedTariffId)!;
  const data = buildHourlyData(tariff);

  // Find charge and discharge windows for reference areas
  const chargeHours = data.filter(d => d.window === 'charge');
  const dischargeHours = data.filter(d => d.window === 'discharge');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>24-Hour Rate Timeline</CardTitle>
            <CardDescription>Import/export rates with charge and discharge windows</CardDescription>
          </div>
          <select
            value={selectedTariffId}
            onChange={e => setSelectedTariffId(e.target.value)}
            className="bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
          >
            {ALL_TARIFFS.map(t => (
              <option key={t.id} value={t.id}>
                {t.supplier} — {t.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-6 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#3B82F6]" />
            Import Rate
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#10B981]" />
            Export Rate
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm opacity-20 bg-[#3B82F6]" />
            Charge Window
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm opacity-20 bg-[#10B981]" />
            Discharge Window
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              interval={1}
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
              formatter={(value: number, name: string) => [
                `${value.toFixed(2)}p/kWh`,
                name === 'importRate' ? 'Import' : 'Export',
              ]}
            />
            {chargeHours.length > 0 && (
              <ReferenceArea
                x1={chargeHours[0].hour}
                x2={chargeHours[chargeHours.length - 1].hour}
                fill="#3B82F6"
                fillOpacity={0.08}
                label={{ value: 'CHARGE', position: 'insideTop', fill: '#3B82F6', fontSize: 10 }}
              />
            )}
            {dischargeHours.length > 0 && (
              <ReferenceArea
                x1={dischargeHours[0].hour}
                x2={dischargeHours[dischargeHours.length - 1].hour}
                fill="#10B981"
                fillOpacity={0.08}
                label={{ value: 'DISCHARGE', position: 'insideTop', fill: '#10B981', fontSize: 10 }}
              />
            )}
            <Bar dataKey="importRate" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Import" />
            <Bar dataKey="exportRate" fill="#10B981" radius={[2, 2, 0, 0]} name="Export" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-xs text-text-tertiary">Cheapest Import</p>
            <p className="text-lg font-bold text-info font-mono">
              {Math.min(...tariff.importRates.map(r => r.ratePencePerKwh)).toFixed(2)}p
            </p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-xs text-text-tertiary">Best Export</p>
            <p className="text-lg font-bold text-success font-mono">
              {Math.max(...tariff.exportRates.map(r => r.ratePencePerKwh)).toFixed(2)}p
            </p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-xs text-text-tertiary">Arbitrage Spread</p>
            <p className="text-lg font-bold text-rose-light font-mono">
              {tariff.arbitrageSpreadPence.toFixed(2)}p
            </p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-xs text-text-tertiary">Standing Charge</p>
            <p className="text-lg font-bold text-text-primary font-mono">
              {tariff.standingChargePencePerDay.toFixed(2)}p/day
            </p>
          </div>
        </div>

        {tariff.notes && (
          <div className="mt-4 bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-sm text-text-secondary">
            {tariff.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
