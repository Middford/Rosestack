'use client';

import { useState } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { PORTFOLIO_PROPERTIES, calculatePortfolioStats, generateAlerts, formatGbp } from '../data';
import { PropertyTable } from './property-table';
import { PortfolioMap } from './portfolio-map';
import { PortfolioRevenueChart } from './portfolio-revenue-chart';
import { AlertsPanel } from './alerts-panel';
import { BulkOperations } from './bulk-operations';
import type { PortfolioProperty, PropertyStatusFilter } from '../types';

export function PortfolioDashboard() {
  const [properties] = useState<PortfolioProperty[]>(PORTFOLIO_PROPERTIES);
  const [activeTab, setActiveTab] = useState<'overview' | 'bulk'>('overview');

  const stats = calculatePortfolioStats(properties);
  const alerts = generateAlerts(properties);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Portfolio Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Live property register, system assignment, and revenue tracking
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm rounded-[var(--radius-md)] transition-colors ${
              activeTab === 'overview'
                ? 'bg-rose text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 text-sm rounded-[var(--radius-md)] transition-colors ${
              activeTab === 'bulk'
                ? 'bg-rose text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            Bulk Operations
          </button>
          <a
            href="/portfolio/add"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-rose text-white hover:bg-rose-light transition-colors"
          >
            + Add Property
          </a>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Summary Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SimpleStatCard
              label="Total Homes"
              value={`${stats.totalLive} live / ${stats.totalInstalled} installed`}
              subtitle={`${stats.totalPipeline} in pipeline`}
            />
            <SimpleStatCard
              label="Portfolio Capacity"
              value={`${stats.totalCapacityKwh} kWh`}
              subtitle="Total deployed"
            />
            <SimpleStatCard
              label="Monthly Revenue"
              value={formatGbp(stats.monthlyRevenueLikely)}
              subtitle="Projected (likely)"
              trend="up"
            />
            <SimpleStatCard
              label="Avg Payback Progress"
              value={`${stats.avgPaybackProgress}%`}
              subtitle="Across live portfolio"
            />
            <SimpleStatCard
              label="Portfolio DSCR"
              value={stats.portfolioDscr.toFixed(2)}
              subtitle={stats.portfolioDscr >= 1.2 ? 'Above covenant' : 'Below covenant'}
              trend={stats.portfolioDscr >= 1.2 ? 'up' : 'down'}
            />
          </div>

          {/* Property Table */}
          <PropertyTable properties={properties} />

          {/* Map + Revenue Chart side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioMap properties={properties} />
            <PortfolioRevenueChart properties={properties} />
          </div>

          {/* Alerts Panel */}
          <AlertsPanel alerts={alerts} />
        </>
      ) : (
        <BulkOperations properties={properties} />
      )}
    </div>
  );
}
