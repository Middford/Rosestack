'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import { runDownsideScenarios, runUpsideScenarios, type ScenarioResult } from '../modelling';
import { formatGbp } from '@/shared/utils/scenarios';

function ScenarioCard({ scenario }: { scenario: ScenarioResult }) {
  const isUpside = scenario.type === 'upside';

  return (
    <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-4 border border-border">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-text-primary">{scenario.name}</h4>
        <Badge variant={isUpside ? 'success' : scenario.severity === 'critical' ? 'danger' : 'warning'}>
          {scenario.severity}
        </Badge>
      </div>
      <p className="text-xs text-text-tertiary mb-3">{scenario.description}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">Revenue Impact</p>
          <p className={`text-sm font-bold ${scenario.revenueImpact >= 0 ? 'text-success' : 'text-danger'}`}>
            {scenario.revenueImpact >= 0 ? '+' : ''}{formatGbp(scenario.revenueImpact)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">DSCR Impact</p>
          <p className={`text-sm font-bold ${scenario.dscrImpact >= 0 ? 'text-success' : 'text-danger'}`}>
            {scenario.dscrImpact >= 0 ? '+' : ''}{scenario.dscrImpact.toFixed(2)}x
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">Payback Change</p>
          <p className={`text-sm font-bold ${scenario.paybackChange <= 0 ? 'text-success' : 'text-danger'}`}>
            {scenario.paybackChange >= 0 ? '+' : ''}{scenario.paybackChange} months
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">Valuation Change</p>
          <p className={`text-sm font-bold ${scenario.portfolioValuationChange >= 0 ? 'text-success' : 'text-danger'}`}>
            {scenario.portfolioValuationChange >= 0 ? '+' : ''}{formatGbp(scenario.portfolioValuationChange)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScenarioComparisonChart({ scenarios }: { scenarios: ScenarioResult[] }) {
  const data = scenarios.map(s => ({
    name: s.name,
    revenue: s.revenueImpact,
    valuation: s.portfolioValuationChange,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} />
        <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
          formatter={(value: number) => [formatGbp(value), '']}
        />
        <Bar dataKey="valuation" name="Valuation Impact" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.valuation >= 0 ? '#10B981' : '#EF4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScenarioDashboard() {
  const downside = runDownsideScenarios();
  const upside = runUpsideScenarios();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-danger">Downside Scenarios</CardTitle>
            <p className="text-xs text-text-tertiary">What could go wrong — and how bad would it be?</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {downside.map(s => <ScenarioCard key={s.name} scenario={s} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-success">Upside Scenarios</CardTitle>
            <p className="text-xs text-text-tertiary">What could go right — and how good would it be?</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {upside.map(s => <ScenarioCard key={s.name} scenario={s} />)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario Comparison — Portfolio Valuation Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <ScenarioComparisonChart scenarios={[...downside, ...upside]} />
        </CardContent>
      </Card>
    </div>
  );
}
