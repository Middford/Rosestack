'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, SimpleStatCard, Badge } from '@/shared/ui';
import {
  SYSTEM_OPTIONS,
  TARIFF_OPTIONS,
  calculateBreakEven,
} from '../data';

export function BreakEvenAnalysis() {
  const [systemIdx, setSystemIdx] = useState(0);
  const [tariffIdx, setTariffIdx] = useState(0);

  const system = SYSTEM_OPTIONS[systemIdx]?.system;
  const tariff = TARIFF_OPTIONS[tariffIdx];

  const result = useMemo(() => {
    if (!system || !tariff) return null;
    return calculateBreakEven(system, tariff);
  }, [systemIdx, tariffIdx]);

  if (!system || !tariff || !result) return null;

  const items = [
    {
      label: 'Break-Even Energy Inflation',
      value: `${result.breakEvenElectricityPricePence >= 0 ? '+' : ''}${result.breakEvenElectricityPricePence}%`,
      description: 'Annual energy price inflation needed for NPV = 0. Lower means safer.',
      status: result.breakEvenElectricityPricePence <= 2 ? 'green' as const : result.breakEvenElectricityPricePence <= 5 ? 'amber' as const : 'red' as const,
    },
    {
      label: 'Max Tolerable Degradation',
      value: `${result.breakEvenDegradationPercent}%/yr`,
      description: 'Degradation rate where NPV turns negative. Higher means more buffer.',
      status: result.breakEvenDegradationPercent >= 4 ? 'green' as const : result.breakEvenDegradationPercent >= 2.5 ? 'amber' as const : 'red' as const,
    },
    {
      label: 'Min Portfolio for Viability',
      value: `${result.breakEvenPortfolioSize} homes`,
      description: 'Minimum homes needed for annual profit above £50k.',
      status: result.breakEvenPortfolioSize <= 20 ? 'green' as const : result.breakEvenPortfolioSize <= 50 ? 'amber' as const : 'red' as const,
    },
    {
      label: 'Break-Even Spread Change',
      value: `${result.breakEvenSpreadPence >= 0 ? '+' : ''}${result.breakEvenSpreadPence}%`,
      description: 'How much tariff spread can drop before NPV turns negative.',
      status: result.breakEvenSpreadPence <= -15 ? 'green' as const : result.breakEvenSpreadPence <= -5 ? 'amber' as const : 'red' as const,
    },
  ];

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

      {/* Break-Even Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{item.label}</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">{item.value}</p>
                  <p className="text-xs text-text-tertiary mt-2">{item.description}</p>
                </div>
                <Badge variant={item.status === 'green' ? 'success' : item.status === 'amber' ? 'warning' : 'danger'}>
                  {item.status === 'green' ? 'Safe' : item.status === 'amber' ? 'Monitor' : 'At Risk'}
                </Badge>
              </div>
              {/* Visual bar */}
              <div className="mt-4 h-2 rounded-full bg-bg-primary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.status === 'green' ? 'bg-success' : item.status === 'amber' ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ width: item.status === 'green' ? '85%' : item.status === 'amber' ? '50%' : '25%' }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Break-Even Summary</CardTitle>
          <CardDescription>
            Key thresholds where the financial model transitions from profitable to loss-making
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              This system/tariff combination requires a minimum energy inflation of{' '}
              <strong>{result.breakEvenElectricityPricePence}%</strong> per year to break even on a 10-year NPV basis.
              Current UK energy inflation forecasts range from 2-8% annually, placing the likely case comfortably above break-even.
            </p>
            <p className="text-sm text-text-primary">
              Battery degradation can reach <strong>{result.breakEvenDegradationPercent}%/yr</strong> before the model
              becomes unprofitable. LFP chemistry typically degrades at 1.5-2%/yr, providing significant buffer.
            </p>
            <p className="text-sm text-text-primary">
              A portfolio of at least <strong>{result.breakEvenPortfolioSize} homes</strong> is needed to generate
              £50k+ annual profit, making the business viable as a primary income source.
            </p>
            <p className="text-sm text-text-primary">
              The tariff arbitrage spread can decline by up to <strong>{Math.abs(result.breakEvenSpreadPence)}%</strong> from
              current levels before the model breaks even. Historical trends show spreads widening, not narrowing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
