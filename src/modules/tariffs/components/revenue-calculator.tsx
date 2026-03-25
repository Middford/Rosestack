'use client';

import { useState, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  StatCard, Badge,
} from '@/shared/ui';
import { ScenarioChart } from '@/shared/ui/scenario-chart';
import { formatGbp } from '@/shared/utils/scenarios';
import { ALL_TARIFFS, DEFAULT_BATTERY_SYSTEM } from '../data';
import { calculateThreeScenarioRevenue, calculateFullProjection } from '../calculator';
import type { BatterySystem } from '@/shared/types';

export function RevenueCalculator() {
  const [tariffId, setTariffId] = useState(ALL_TARIFFS[0].id);
  const [capacityKwh, setCapacityKwh] = useState(10);
  const [chargeRateKw, setChargeRateKw] = useState(5);
  const [efficiency, setEfficiency] = useState(92);
  const [solarKwp, setSolarKwp] = useState(5);

  const tariff = ALL_TARIFFS.find(t => t.id === tariffId)!;

  const system: BatterySystem = useMemo(() => ({
    ...DEFAULT_BATTERY_SYSTEM,
    totalCapacityKwh: capacityKwh,
    maxChargeRateKw: chargeRateKw,
    maxDischargeRateKw: chargeRateKw,
    roundTripEfficiency: efficiency / 100,
    solarPvKwp: solarKwp || undefined,
  }), [capacityKwh, chargeRateKw, efficiency, solarKwp]);

  const revenue = useMemo(() => calculateThreeScenarioRevenue(system, tariff), [system, tariff]);
  const { projection, summary } = useMemo(() => calculateFullProjection(system, tariff), [system, tariff]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Calculator</CardTitle>
          <CardDescription>Configure system and tariff to see revenue projections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Tariff</label>
              <select
                value={tariffId}
                onChange={e => setTariffId(e.target.value)}
                className="w-full bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              >
                {ALL_TARIFFS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Battery Capacity (kWh)</label>
              <input
                type="number"
                value={capacityKwh}
                onChange={e => setCapacityKwh(Number(e.target.value) || 0)}
                min={1}
                max={100}
                className="w-full bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Charge Rate (kW)</label>
              <input
                type="number"
                value={chargeRateKw}
                onChange={e => setChargeRateKw(Number(e.target.value) || 0)}
                min={1}
                max={25}
                step={0.5}
                className="w-full bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Efficiency (%)</label>
              <input
                type="number"
                value={efficiency}
                onChange={e => setEfficiency(Number(e.target.value) || 0)}
                min={70}
                max={100}
                className="w-full bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Solar PV (kWp)</label>
              <input
                type="number"
                value={solarKwp}
                onChange={e => setSolarKwp(Number(e.target.value) || 0)}
                min={0}
                max={30}
                step={0.5}
                className="w-full bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Daily Revenue"
          bestValue={formatGbp(revenue.best.totalDailyGbp, 2)}
          likelyValue={formatGbp(revenue.likely.totalDailyGbp, 2)}
          worstValue={formatGbp(revenue.worst.totalDailyGbp, 2)}
        />
        <StatCard
          label="Monthly Revenue"
          bestValue={formatGbp(revenue.best.totalMonthlyGbp)}
          likelyValue={formatGbp(revenue.likely.totalMonthlyGbp)}
          worstValue={formatGbp(revenue.worst.totalMonthlyGbp)}
        />
        <StatCard
          label="Annual Revenue"
          bestValue={formatGbp(revenue.best.totalAnnualGbp)}
          likelyValue={formatGbp(revenue.likely.totalAnnualGbp)}
          worstValue={formatGbp(revenue.worst.totalAnnualGbp)}
        />
        <StatCard
          label="Payback Period"
          bestValue={`${summary.best.paybackMonths} months`}
          likelyValue={`${summary.likely.paybackMonths} months`}
          worstValue={`${summary.worst.paybackMonths} months`}
        />
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown (Likely Case)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <RevenueItem label="Arbitrage" value={revenue.likely.annualArbitrageGbp} color="text-chart-1" />
            <RevenueItem label="Saving Sessions" value={revenue.likely.annualSavingSessionsGbp} color="text-chart-2" />
            <RevenueItem label="Flexibility" value={revenue.likely.annualFlexibilityGbp} color="text-chart-3" />
            <RevenueItem label="SEG Export" value={revenue.likely.annualSegGbp} color="text-chart-4" />
            <RevenueItem label="Grid Services" value={revenue.likely.annualGridServicesGbp} color="text-chart-5" />
          </div>
        </CardContent>
      </Card>

      {/* 10-Year Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle>10-Year Net Revenue Projection</CardTitle>
          <CardDescription>Best / Likely / Worst scenarios with energy inflation and degradation</CardDescription>
        </CardHeader>
        <CardContent>
          <ScenarioChart
            projection={projection}
            dataKey="netRevenue"
            yAxisLabel="Net Revenue (GBP)"
            height={350}
          />
        </CardContent>
      </Card>

      {/* Cumulative Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ScenarioChart
            projection={projection}
            dataKey="cumulativeRevenue"
            yAxisLabel="Cumulative (GBP)"
            height={300}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{formatGbp(value)}/yr</p>
    </div>
  );
}
