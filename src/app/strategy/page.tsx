'use client';

import { useState } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { CompetitorMap } from '@/modules/strategy/components/competitor-map';
import { PartnershipPipeline } from '@/modules/strategy/components/partnership-pipeline';
import { TechnologyRadar } from '@/modules/strategy/components/technology-radar';
import { MoatScorecard } from '@/modules/strategy/components/moat-scorecard';
import { StrategyTimeline } from '@/modules/strategy/components/strategy-timeline';
import {
  competitors,
  partnerships,
  emergingTech,
  moatActions,
  strategyInitiatives,
} from '@/modules/strategy/data';

type Tab = 'competitors' | 'partnerships' | 'tech' | 'moat' | 'timeline';

const tabs: { key: Tab; label: string }[] = [
  { key: 'competitors', label: 'Competitor Map' },
  { key: 'partnerships', label: 'Partnership Pipeline' },
  { key: 'tech', label: 'Technology Radar' },
  { key: 'moat', label: 'Moat Scorecard' },
  { key: 'timeline', label: 'Strategy Timeline' },
];

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('competitors');

  const criticalThreats = competitors.filter(c => c.threat === 'critical').length;
  const activePartnerships = partnerships.filter(p => p.stage === 'active' || p.stage === 'agreed').length;
  const criticalTech = emergingTech.filter(t => t.relevance === 'critical').length;
  const moatDone = moatActions.filter(a => a.status === 'done').length;
  const moatInProgress = moatActions.filter(a => a.status === 'in-progress').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Strategy & Moat</h1>
        <p className="text-sm text-text-secondary mt-1">
          Competitive intelligence, partnerships, emerging tech tracking, and strategic moat building
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SimpleStatCard label="Competitors" value={String(competitors.length)} subtitle={`${criticalThreats} critical threat`} trend="down" />
        <SimpleStatCard label="Partnerships" value={String(partnerships.length)} subtitle={`${activePartnerships} active/agreed`} trend="up" />
        <SimpleStatCard label="Emerging Tech" value={String(emergingTech.length)} subtitle={`${criticalTech} critical relevance`} trend="neutral" />
        <SimpleStatCard label="Moat Actions" value={String(moatActions.length)} subtitle={`${moatDone} done, ${moatInProgress} in progress`} trend="up" />
        <SimpleStatCard label="Initiatives" value={String(strategyInitiatives.length)} subtitle="Across 4 phases" />
        <SimpleStatCard
          label="Potential Homes"
          value={partnerships.reduce((s, p) => s + (p.potentialHomes ?? 0), 0).toLocaleString()}
          subtitle="From partnerships"
          trend="up"
        />
      </div>

      {/* Tab navigation */}
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

      {/* Tab content */}
      <div>
        {activeTab === 'competitors' && <CompetitorMap />}
        {activeTab === 'partnerships' && <PartnershipPipeline />}
        {activeTab === 'tech' && <TechnologyRadar />}
        {activeTab === 'moat' && <MoatScorecard />}
        {activeTab === 'timeline' && <StrategyTimeline />}
      </div>
    </div>
  );
}
