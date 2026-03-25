'use client';

import { useState } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { ModelBuilder } from '@/modules/finance/components/model-builder';
import { PortfolioModel } from '@/modules/finance/components/portfolio-model';
import { SensitivityAnalysis } from '@/modules/finance/components/sensitivity-analysis';
import { ScenarioDashboard } from '@/modules/finance/components/scenario-dashboard';
import { BreakEvenAnalysis } from '@/modules/finance/components/break-even';
import { AssumptionEditor } from '@/modules/finance/components/assumption-editor';
import { InvestorSummary } from '@/modules/finance/components/investor-summary';
import { PortfolioTracker } from '@/modules/finance/components/portfolio-tracker';
import { SYSTEM_OPTIONS, TARIFF_OPTIONS } from '@/modules/finance/data';

type Tab = 'model' | 'portfolio' | 'sensitivity' | 'scenarios' | 'breakeven' | 'assumptions' | 'investor' | 'tracker';

const tabs: { key: Tab; label: string }[] = [
  { key: 'model', label: 'Model Builder' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'sensitivity', label: 'Sensitivity' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'breakeven', label: 'Break-Even' },
  { key: 'assumptions', label: 'Assumptions' },
  { key: 'investor', label: 'Investor Summary' },
  { key: 'tracker', label: 'Tracker' },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('model');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Finance</h1>
        <p className="text-sm text-text-secondary mt-1">
          Financial projections, scenario modelling, and sensitivity analysis
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SimpleStatCard label="System Configs" value={String(SYSTEM_OPTIONS.length)} subtitle="Battery + inverter combos" />
        <SimpleStatCard label="Tariffs" value={String(TARIFF_OPTIONS.length)} subtitle="UK energy tariffs" />
        <SimpleStatCard label="Scenarios" value="3" subtitle="Best / Likely / Worst" />
        <SimpleStatCard label="Projection" value="10-20yr" subtitle="Financial models" />
        <SimpleStatCard label="Sensitivity" value="7" subtitle="Variable categories" />
        <SimpleStatCard label="Portfolio" value="10-100" subtitle="Homes modelled" />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-rose text-rose-light'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'model' && <ModelBuilder />}
        {activeTab === 'portfolio' && <PortfolioModel />}
        {activeTab === 'sensitivity' && <SensitivityAnalysis />}
        {activeTab === 'scenarios' && <ScenarioDashboard />}
        {activeTab === 'breakeven' && <BreakEvenAnalysis />}
        {activeTab === 'assumptions' && <AssumptionEditor />}
        {activeTab === 'investor' && <InvestorSummary />}
        {activeTab === 'tracker' && <PortfolioTracker />}
      </div>
    </div>
  );
}
