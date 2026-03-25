'use client';

import { useState } from 'react';
import { cn } from '@/shared/ui/utils';
import { SimpleStatCard } from '@/shared/ui';
import { ALL_TARIFFS, GRID_SERVICES, TARIFF_ALERTS } from '@/modules/tariffs';
import {
  TariffDatabase,
  RateTimeline,
  RevenueCalculator,
  RevenueComparison,
  TariffMonitor,
  HistoricalRates,
  PortfolioSweep,
} from '@/modules/tariffs/components';

const TABS = [
  { id: 'database', label: 'Tariff Database' },
  { id: 'timeline', label: 'Rate Timeline' },
  { id: 'calculator', label: 'Revenue Calculator' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'historical', label: 'Historical' },
  { id: 'sweep', label: 'Portfolio Sweep' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function TariffsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('database');

  const bestSpread = Math.max(...ALL_TARIFFS.map(t => t.arbitrageSpreadPence));
  const totalGridServices = GRID_SERVICES.reduce((sum, s) => sum + (s.historicalEarningsPerHomePerYear ?? 0), 0);
  const activeAlerts = TARIFF_ALERTS.filter(a => a.severity === 'warning' || a.severity === 'critical').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Tariffs</h1>
        <p className="text-sm text-text-secondary mt-1">
          UK energy tariff database, revenue calculator, and portfolio optimisation
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Tariffs Tracked"
          value={ALL_TARIFFS.length.toString()}
          subtitle="All major UK suppliers"
        />
        <SimpleStatCard
          label="Best Arbitrage Spread"
          value={`${bestSpread.toFixed(1)}p/kWh`}
          subtitle="Octopus IOF peak spread"
          trend="up"
        />
        <SimpleStatCard
          label="Grid Services Revenue"
          value={`£${totalGridServices}/yr`}
          subtitle="Combined est. per home"
          trend="up"
        />
        <SimpleStatCard
          label="Active Alerts"
          value={activeAlerts.toString()}
          subtitle={`${TARIFF_ALERTS.length} total alerts`}
          trend={activeAlerts > 2 ? 'down' : 'neutral'}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'border-b-2 focus:outline-none',
                activeTab === tab.id
                  ? 'border-rose text-rose-light'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border-hover',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'database' && <TariffDatabase />}
        {activeTab === 'timeline' && <RateTimeline />}
        {activeTab === 'calculator' && <RevenueCalculator />}
        {activeTab === 'comparison' && <RevenueComparison />}
        {activeTab === 'monitor' && <TariffMonitor />}
        {activeTab === 'historical' && <HistoricalRates />}
        {activeTab === 'sweep' && <PortfolioSweep />}
      </div>
    </div>
  );
}
