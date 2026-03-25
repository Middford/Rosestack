'use client';

import { useState } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { LenderDatabase } from '@/modules/funding/components/lender-database';
import { DealStructurer } from '@/modules/funding/components/deal-structurer';
import { CovenantTracker } from '@/modules/funding/components/covenant-tracker';
import { InvestorPipeline } from '@/modules/funding/components/investor-pipeline';
import { StressTestDashboard } from '@/modules/funding/components/stress-test-dashboard';
import { DataRoom } from '@/modules/funding/components/data-room';
import {
  lenders,
  investors,
  covenants,
  dataRoomDocuments,
  getTotalPipelineValue,
  getCovenantSummary,
} from '@/modules/funding/data';

type Tab = 'lenders' | 'deals' | 'covenants' | 'pipeline' | 'stress' | 'dataroom';

const tabs: { key: Tab; label: string }[] = [
  { key: 'lenders', label: 'Lender Database' },
  { key: 'deals', label: 'Deal Structurer' },
  { key: 'covenants', label: 'Covenant Tracker' },
  { key: 'pipeline', label: 'Investor Pipeline' },
  { key: 'stress', label: 'Stress Tests' },
  { key: 'dataroom', label: 'Data Room' },
];

export default function FundingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('lenders');

  const pipelineValue = getTotalPipelineValue();
  const covenantSummary = getCovenantSummary();
  const activeInvestors = investors.filter(i => i.stage !== 'declined').length;
  const readyDocs = dataRoomDocuments.filter(
    d => d.status === 'ready' || d.status === 'shared' || d.status === 'signed',
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Funding</h1>
        <p className="text-sm text-text-secondary mt-1">
          Investment readiness, lender targeting, deal structuring, and stress testing
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SimpleStatCard label="Lenders" value={String(lenders.length)} subtitle="In database" />
        <SimpleStatCard label="Investors" value={String(activeInvestors)} subtitle="Active pipeline" />
        <SimpleStatCard
          label="Pipeline Value"
          value={`£${(pipelineValue.interested / 1000).toFixed(0)}k`}
          subtitle="Interested"
        />
        <SimpleStatCard
          label="Covenants"
          value={`${covenantSummary.green}/${covenants.length}`}
          subtitle="Compliant"
          trend={covenantSummary.red > 0 ? 'down' : 'up'}
        />
        <SimpleStatCard
          label="Data Room"
          value={`${readyDocs}/${dataRoomDocuments.length}`}
          subtitle="Docs ready"
        />
        <SimpleStatCard label="Scenarios" value="3" subtitle="Best / Likely / Worst" />
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
        {activeTab === 'lenders' && <LenderDatabase />}
        {activeTab === 'deals' && <DealStructurer />}
        {activeTab === 'covenants' && <CovenantTracker />}
        {activeTab === 'pipeline' && <InvestorPipeline />}
        {activeTab === 'stress' && <StressTestDashboard />}
        {activeTab === 'dataroom' && <DataRoom />}
      </div>
    </div>
  );
}
