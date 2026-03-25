'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, StatCard, SimpleStatCard } from '@/shared/ui';
import { TrafficLight } from '@/shared/ui';
import { getScenarioHex } from '@/shared/utils/scenarios';
import {
  SYSTEM_OPTIONS,
  TARIFF_OPTIONS,
  calculatePerHomePnl,
  calculatePortfolioModel,
  formatGbp,
} from '../data';

export function PortfolioModel() {
  const [systemIdx, setSystemIdx] = useState(0);
  const [tariffIdx, setTariffIdx] = useState(0);
  const [targetHomes, setTargetHomes] = useState(50);
  const [deployYears, setDeployYears] = useState(5);
  const [interestRate, setInterestRate] = useState(6);
  const [ltv, setLtv] = useState(70);

  const portfolio = useMemo(() => {
    const system = SYSTEM_OPTIONS[systemIdx]?.system;
    const tariff = TARIFF_OPTIONS[tariffIdx];
    if (!system || !tariff) return null;
    const pnl = calculatePerHomePnl(system, tariff);
    return calculatePortfolioModel(pnl, targetHomes, deployYears, interestRate, 10, ltv);
  }, [systemIdx, tariffIdx, targetHomes, deployYears, interestRate, ltv]);

  if (!portfolio) return null;

  const chartData = portfolio.years.map(y => ({
    year: `Y${y.year}`,
    homes: y.totalHomes,
    capex: y.cumulativeCapex,
    revBest: y.annualRevenue.best,
    revLikely: y.annualRevenue.likely,
    revWorst: y.annualRevenue.worst,
    cfBest: y.cumulativeCashFlow.best,
    cfLikely: y.cumulativeCashFlow.likely,
    cfWorst: y.cumulativeCashFlow.worst,
    dscrBest: y.dscr.best,
    dscrLikely: y.dscr.likely,
    dscrWorst: y.dscr.worst,
    loan: y.loanBalance,
    debtService: y.debtService,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Target Homes</label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={targetHomes}
                onChange={e => setTargetHomes(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-text-tertiary">{targetHomes} homes</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Deploy Over</label>
              <input
                type="range"
                min={1}
                max={10}
                value={deployYears}
                onChange={e => setDeployYears(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-text-tertiary">{deployYears} years</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Interest Rate</label>
              <input
                type="range"
                min={3}
                max={12}
                step={0.5}
                value={interestRate}
                onChange={e => setInterestRate(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-text-tertiary">{interestRate}%</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">LTV</label>
              <input
                type="range"
                min={50}
                max={90}
                step={5}
                value={ltv}
                onChange={e => setLtv(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-text-tertiary">{ltv}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SimpleStatCard label="Total Homes" value={String(portfolio.totalHomesDeployed)} />
        <SimpleStatCard label="Total CAPEX" value={formatGbp(portfolio.totalCapex)} />
        <StatCard
          label="Cash-Flow Positive"
          bestValue={`Year ${portfolio.cashFlowPositiveYear.best}`}
          likelyValue={`Year ${portfolio.cashFlowPositiveYear.likely}`}
          worstValue={`Year ${portfolio.cashFlowPositiveYear.worst}`}
        />
        <StatCard
          label="Portfolio IRR"
          bestValue={`${portfolio.portfolioIrr.best.toFixed(1)}%`}
          likelyValue={`${portfolio.portfolioIrr.likely.toFixed(1)}%`}
          worstValue={`${portfolio.portfolioIrr.worst.toFixed(1)}%`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment & Capex */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Growth</CardTitle>
            <CardDescription>Homes deployed and cumulative CAPEX</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis yAxisId="homes" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis yAxisId="capex" orientation="right" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
                <Legend />
                <Bar yAxisId="homes" dataKey="homes" fill="var(--color-rose)" name="Total Homes" />
                <Line yAxisId="capex" dataKey="capex" stroke="var(--color-text-secondary)" name="Cum. CAPEX" dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Ramp */}
        <Card>
          <CardHeader>
            <CardTitle>Annual Revenue Ramp</CardTitle>
            <CardDescription>Portfolio revenue across three scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} formatter={(v: number) => formatGbp(v)} />
                <Legend />
                <Area type="monotone" dataKey="revBest" stroke={getScenarioHex('best')} fill={getScenarioHex('best')} fillOpacity={0.1} name="Best" dot={false} />
                <Area type="monotone" dataKey="revLikely" stroke={getScenarioHex('likely')} fill={getScenarioHex('likely')} fillOpacity={0.15} name="Likely" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="revWorst" stroke={getScenarioHex('worst')} fill={getScenarioHex('worst')} fillOpacity={0.1} name="Worst" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Cash Flow</CardTitle>
            <CardDescription>When does the portfolio become cash-flow positive?</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} formatter={(v: number) => formatGbp(v)} />
                <Legend />
                <Line type="monotone" dataKey="cfBest" stroke={getScenarioHex('best')} name="Best" dot={false} />
                <Line type="monotone" dataKey="cfLikely" stroke={getScenarioHex('likely')} name="Likely" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="cfWorst" stroke={getScenarioHex('worst')} name="Worst" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* DSCR */}
        <Card>
          <CardHeader>
            <CardTitle>Debt Service Coverage Ratio</CardTitle>
            <CardDescription>DSCR across scenarios (covenant threshold: 1.2x)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
                <Legend />
                <Line type="monotone" dataKey="dscrBest" stroke={getScenarioHex('best')} name="Best" dot={false} />
                <Line type="monotone" dataKey="dscrLikely" stroke={getScenarioHex('likely')} name="Likely" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="dscrWorst" stroke={getScenarioHex('worst')} name="Worst" dot={false} />
                {/* 1.2x covenant line */}
                <Line type="monotone" dataKey={() => 1.2} stroke="var(--color-danger)" strokeDasharray="5 5" name="Covenant (1.2x)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Amortisation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Amortisation Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Year</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Homes</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Cum. CAPEX</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Debt Service</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Loan Balance</th>
                  <th className="text-right py-2 px-3 text-scenario-likely font-medium">DSCR (Likely)</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.years.map(y => (
                  <tr key={y.year} className="border-b border-border/50">
                    <td className="py-2 px-3 text-text-primary">Year {y.year}</td>
                    <td className="py-2 px-3 text-right text-text-primary">{y.totalHomes}</td>
                    <td className="py-2 px-3 text-right text-text-secondary">{formatGbp(y.cumulativeCapex)}</td>
                    <td className="py-2 px-3 text-right text-text-secondary">{formatGbp(y.debtService)}</td>
                    <td className="py-2 px-3 text-right text-text-secondary">{formatGbp(y.loanBalance)}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={
                        y.dscr.likely >= 1.2 ? 'text-success' : y.dscr.likely >= 1.0 ? 'text-warning' : 'text-danger'
                      }>
                        {y.dscr.likely.toFixed(2)}x
                      </span>
                    </td>
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
