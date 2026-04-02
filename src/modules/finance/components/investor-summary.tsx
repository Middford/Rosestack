'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, StatCard, SimpleStatCard, Badge } from '@/shared/ui';
import { TrafficLight } from '@/shared/ui';
import {
  SYSTEM_OPTIONS,
  TARIFF_OPTIONS,
  calculatePerHomePnl,
  calculatePortfolioModel,
  calculateBreakEven,
  formatGbp,
} from '../data';

export function InvestorSummary() {
  const data = useMemo(() => {
    const system = SYSTEM_OPTIONS[0]?.system;
    const tariff = TARIFF_OPTIONS[0]; // IOF
    if (!system || !tariff) return null;

    const pnl = calculatePerHomePnl(system, tariff);
    const portfolio = calculatePortfolioModel(pnl, 50, 5, 6, 10, 70);
    const breakEven = calculateBreakEven(system, tariff);

    return { pnl, portfolio, breakEven, system, tariff };
  }, []);

  if (!data) return null;
  const { pnl, portfolio, breakEven } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-bg-secondary to-bg-primary border-rose/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">RoseStack Energy — Investor Summary</h2>
              <p className="text-sm text-text-secondary mt-1">
                Residential battery storage portfolio — Lancashire, UK
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Model: {data.system.inverterModel} + {data.system.totalCapacityKwh}kWh | Tariff: {data.tariff.name}
              </p>
            </div>
            <TrafficLight status={pnl.trafficLight} label={
              pnl.trafficLight === 'green' ? 'All Scenarios Profitable'
              : pnl.trafficLight === 'amber' ? 'Worst Case Marginal'
              : 'Worst Case Challenged'
            } />
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">Per-Home Unit Economics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SimpleStatCard label="Capital Cost" value={formatGbp(pnl.totalCapex)} subtitle="Hardware + install" />
          <StatCard
            label="Annual Net Revenue"
            bestValue={formatGbp(pnl.summary.best.annualNetRevenue)}
            likelyValue={formatGbp(pnl.summary.likely.annualNetRevenue)}
            worstValue={formatGbp(pnl.summary.worst.annualNetRevenue)}
          />
          <StatCard
            label="Payback Period"
            bestValue={`${pnl.summary.best.paybackMonths}m`}
            likelyValue={`${pnl.summary.likely.paybackMonths}m`}
            worstValue={`${pnl.summary.worst.paybackMonths}m`}
          />
          <StatCard
            label="10yr IRR"
            bestValue={`${pnl.summary.best.tenYearIrr.toFixed(1)}%`}
            likelyValue={`${pnl.summary.likely.tenYearIrr.toFixed(1)}%`}
            worstValue={`${pnl.summary.worst.tenYearIrr.toFixed(1)}%`}
          />
          <StatCard
            label="10yr NPV (8%)"
            bestValue={formatGbp(pnl.summary.best.tenYearNpv)}
            likelyValue={formatGbp(pnl.summary.likely.tenYearNpv)}
            worstValue={formatGbp(pnl.summary.worst.tenYearNpv)}
          />
          <StatCard
            label="DSCR"
            bestValue={`${pnl.summary.best.dscr.toFixed(2)}x`}
            likelyValue={`${pnl.summary.likely.dscr.toFixed(2)}x`}
            worstValue={`${pnl.summary.worst.dscr.toFixed(2)}x`}
          />
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">50-Home Portfolio (5yr deploy)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SimpleStatCard label="Total Investment" value={formatGbp(portfolio.totalCapex)} subtitle={`${portfolio.totalHomesDeployed} homes`} />
          <StatCard
            label="Cash-Flow Positive"
            bestValue={`Year ${portfolio.cashFlowPositiveYear.best}`}
            likelyValue={`Year ${portfolio.cashFlowPositiveYear.likely}`}
            worstValue={`Year ${portfolio.cashFlowPositiveYear.worst}`}
          />
          <StatCard
            label="Year 5 Revenue (pa)"
            bestValue={formatGbp(portfolio.years[4]?.annualRevenue.best ?? 0)}
            likelyValue={formatGbp(portfolio.years[4]?.annualRevenue.likely ?? 0)}
            worstValue={formatGbp(portfolio.years[4]?.annualRevenue.worst ?? 0)}
          />
          <StatCard
            label="Year 5 DSCR"
            bestValue={`${(portfolio.years[4]?.dscr.best ?? 0).toFixed(2)}x`}
            likelyValue={`${(portfolio.years[4]?.dscr.likely ?? 0).toFixed(2)}x`}
            worstValue={`${(portfolio.years[4]?.dscr.worst ?? 0).toFixed(2)}x`}
          />
        </div>
      </div>

      {/* Stress Test / Break-Even */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">Downside Protection</h3>
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-text-secondary">Break-Even Thresholds</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Min energy inflation for break-even</span>
                    <Badge variant="default">{breakEven.breakEvenElectricityPricePence}%/yr</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Max tolerable degradation</span>
                    <Badge variant="default">{breakEven.breakEvenDegradationPercent}%/yr</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Max tariff spread decline</span>
                    <Badge variant="default">{breakEven.breakEvenSpreadPence}%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Min viable portfolio size</span>
                    <Badge variant="default">{breakEven.breakEvenPortfolioSize} homes</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-text-secondary">Key Assumptions</h4>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>Energy inflation: 2-8% range (UK forecasts: 3-6%)</p>
                  <p>LFP degradation: 1.5-3% (manufacturer spec: 1.5%)</p>
                  <p>Tariff: Intelligent Octopus Flux (best available)</p>
                  <p>Homeowner payment: £100/month ESA</p>
                  <p>Loan: 70% LTV at 6% over 10 years</p>
                  <p>Warranty: 15 years (battery), 10 years (inverter)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Sources (Per Home, Likely Case, Year 1)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: 'Agile Arbitrage (charge cheap, sell peak)', value: 5600, pct: 73 },
              { label: 'Solar Self-Use', value: 760, pct: 10 },
              { label: 'Saving Sessions', value: 620, pct: 8, tooltip: 'Conservative modelling: 6 peak sessions @ £10 + 4 non-peak sessions @ £140. See Saving Sessions model (March 2026) for full breakdown.' },
              { label: 'SEG Export', value: 380, pct: 5 },
              { label: 'ENWL Flexibility (estimate)', value: 310, pct: 4, tooltip: 'Estimate only — Piclo Flex integration planned for a future phase.' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary" title={'tooltip' in item ? item.tooltip : undefined}>
                      {item.label}{'tooltip' in item ? ' ⓘ' : ''}
                    </span>
                    <span className="text-text-primary font-medium">{formatGbp(item.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-primary overflow-hidden">
                    <div className="h-full rounded-full bg-rose" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            Based on Agile tariff (Octopus Flux/IOF paused March 2026). Total £7,670/year likely case.
            ENWL Flexibility revenue shown as estimate only — Piclo Flex integration planned for future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
