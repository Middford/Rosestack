'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { substations, flexibilityTenders } from '@/modules/grid/substation-data';
import { targetProperties } from '@/modules/grid/property-data';
import { scoreAndRankProperties } from '@/modules/grid/scoring';
import { PropertyFinder } from './property-finder';
import { SubstationDashboard } from './substation-dashboard';
import { DeploymentPlannerView } from './deployment-planner-view';

// Leaflet must be loaded client-side only (no SSR)
const GridMap = dynamic(() => import('./grid-map').then(m => ({ default: m.GridMap })), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-[var(--radius-lg)] border border-border bg-bg-secondary flex items-center justify-center">
      <p className="text-text-tertiary">Loading map...</p>
    </div>
  ),
});

const tabs = [
  { id: 'map', label: 'Grid Map' },
  { id: 'properties', label: 'Property Finder' },
  { id: 'substations', label: 'Substations' },
  { id: 'deployment', label: 'Deployment Planner' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function GridPage() {
  const [activeTab, setActiveTab] = useState<TabId>('map');

  const scored = scoreAndRankProperties(targetProperties);
  const constrainedCount = substations.filter(s => s.constraintStatus === 'constrained').length;
  const approachingCount = substations.filter(s => s.constraintStatus === 'approaching').length;
  const activeTenders = Object.values(flexibilityTenders).filter(t => t.status === 'open').length;
  const totalFlexValue = Object.values(flexibilityTenders).reduce((s, t) => s + t.totalAnnualValue, 0);
  const excellentProperties = scored.filter(s => s.totalScore >= 75).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Grid Intelligence</h1>
        <p className="text-sm text-text-secondary mt-1">
          ENWL substation mapping, property prospecting, and flexibility market opportunities across East Lancashire
        </p>
      </div>

      {/* DEMO DATA Banner */}
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-blue-400">ℹ DEMO DATA</p>
        <p className="text-xs text-blue-300/90 mt-1">
          Substation names, constraint statuses, and flexibility tender values on this page are modelled estimates,
          not live ENWL data. Property EPC data is real (DLUHC Open Data). Grid data sources are labelled per record
          (ENWL Open Data / PACE Call / Site Survey / Modelled Estimate).
          Live ENWL substation data integration is planned for Phase 2.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SimpleStatCard
          label="Substations"
          value={substations.length.toString()}
          subtitle={`${constrainedCount} constrained, ${approachingCount} approaching`}
        />
        <SimpleStatCard
          label="Target Properties"
          value={targetProperties.length.toString()}
          subtitle={`${excellentProperties} excellent targets`}
          trend="up"
        />
        <SimpleStatCard
          label="Active Flex Tenders"
          value={activeTenders.toString()}
          subtitle="Open for bidding"
          trend="up"
        />
        <SimpleStatCard
          label="Total Flex Value"
          value={`£${(totalFlexValue / 1000).toFixed(0)}k/yr`}
          subtitle="Combined annual"
          trend="up"
        />
        <SimpleStatCard
          label="Avg Property Score"
          value={`${Math.round(scored.reduce((s, r) => s + r.totalScore, 0) / scored.length)}/100`}
          subtitle="Across all BB postcodes"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-rose text-rose-light'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'map' && <GridMap />}
        {activeTab === 'properties' && <PropertyFinder />}
        {activeTab === 'substations' && <SubstationDashboard />}
        {activeTab === 'deployment' && <DeploymentPlannerView />}
      </div>
    </div>
  );
}
