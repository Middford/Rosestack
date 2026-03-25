'use client';

import { useState, useMemo } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { SEEDED_RISKS, SEEDED_OPPORTUNITIES } from '@/modules/risk/data';
import { calculateRiskStats, calculateOpportunityStats, calculateNetPosition } from '@/modules/risk/scoring';
import {
  RiskOpportunityHeatMap,
  RegisterTable,
  RiskDetailPanel,
  OpportunityDetailPanel,
  ScenarioDashboard,
  NetPositionWaterfall,
  RiskOpportunityTimeline,
  TariffChangeModeller,
  EnergyPriceModeller,
  TechnologyFailureModeller,
  RegulatoryChangeModeller,
  HardwareCostModeller,
  RevenueEnhancementModeller,
  MarketExpansionModeller,
  CombinedStressTest,
  MitigationCaptureRegister,
  PdfExportSection,
} from '@/modules/risk/components';
import { formatGbp } from '@/shared/utils/scenarios';

type Tab = 'overview' | 'register' | 'risk-modelling' | 'opportunity-modelling' | 'scenarios' | 'mitigation' | 'export';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'register', label: 'Register' },
  { key: 'risk-modelling', label: 'Risk Models' },
  { key: 'opportunity-modelling', label: 'Opp Models' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'mitigation', label: 'Mitigation' },
  { key: 'export', label: 'Export' },
];

export default function RiskPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const risks = SEEDED_RISKS;
  const opportunities = SEEDED_OPPORTUNITIES;

  const riskStats = useMemo(() => calculateRiskStats(risks), [risks]);
  const oppStats = useMemo(() => calculateOpportunityStats(opportunities), [opportunities]);
  const netPosition = useMemo(() => calculateNetPosition(3200000, risks, opportunities), [risks, opportunities]);
  const netValue = netPosition.find(p => p.type === 'net')?.value ?? 0;

  const selectedRisk = selectedRiskId ? risks.find(r => r.id === selectedRiskId) : null;
  const selectedOpp = selectedOppId ? opportunities.find(o => o.id === selectedOppId) : null;

  function handleSelectRisk(id: string) {
    setSelectedRiskId(id);
    setSelectedOppId(null);
  }

  function handleSelectOpp(id: string) {
    setSelectedOppId(id);
    setSelectedRiskId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Risk & Opportunities</h1>
        <p className="text-sm text-text-secondary mt-1">
          Threat and opportunity identification, impact modelling, and scenario stress testing
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SimpleStatCard
          label="Total Risks"
          value={String(riskStats.total)}
          subtitle={`${riskStats.critical + riskStats.high} high/critical`}
          trend="neutral"
        />
        <SimpleStatCard
          label="Avg Risk Score"
          value={String(riskStats.averageScore)}
          subtitle={`Top: ${riskStats.topRisk?.name ?? '-'}`}
          trend="neutral"
        />
        <SimpleStatCard
          label="Total Opportunities"
          value={String(oppStats.total)}
          subtitle={`${oppStats.transformative + oppStats.high} high/transformative`}
          trend="up"
        />
        <SimpleStatCard
          label="Expected Upside"
          value={formatGbp(oppStats.totalExpectedValue)}
          subtitle="total annual"
          trend="up"
        />
        <SimpleStatCard
          label="Net Position"
          value={formatGbp(netValue)}
          subtitle={netValue >= 0 ? 'Net positive' : 'Net negative'}
          trend={netValue >= 0 ? 'up' : 'down'}
        />
        <SimpleStatCard
          label="Avg Opp Score"
          value={String(oppStats.averageScore)}
          subtitle={`Top: ${oppStats.topOpportunity?.name ?? '-'}`}
          trend="neutral"
        />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-rose border-rose'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <RiskOpportunityHeatMap
            risks={risks}
            opportunities={opportunities}
            onSelectRisk={handleSelectRisk}
            onSelectOpportunity={handleSelectOpp}
          />
          <NetPositionWaterfall risks={risks} opportunities={opportunities} />
          <RiskOpportunityTimeline />

          {/* Detail panels (side sheet style) */}
          {selectedRisk && (
            <RiskDetailPanel risk={selectedRisk} onClose={() => setSelectedRiskId(null)} />
          )}
          {selectedOpp && (
            <OpportunityDetailPanel opportunity={selectedOpp} onClose={() => setSelectedOppId(null)} />
          )}
        </div>
      )}

      {activeTab === 'register' && (
        <div className="space-y-6">
          <RegisterTable
            risks={risks}
            opportunities={opportunities}
            onSelectRisk={handleSelectRisk}
            onSelectOpportunity={handleSelectOpp}
          />
          {selectedRisk && (
            <RiskDetailPanel risk={selectedRisk} onClose={() => setSelectedRiskId(null)} />
          )}
          {selectedOpp && (
            <OpportunityDetailPanel opportunity={selectedOpp} onClose={() => setSelectedOppId(null)} />
          )}
        </div>
      )}

      {activeTab === 'risk-modelling' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TariffChangeModeller />
            <EnergyPriceModeller />
            <TechnologyFailureModeller />
            <RegulatoryChangeModeller />
          </div>
          <CombinedStressTest />
        </div>
      )}

      {activeTab === 'opportunity-modelling' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HardwareCostModeller />
            <RevenueEnhancementModeller />
          </div>
          <MarketExpansionModeller />
        </div>
      )}

      {activeTab === 'scenarios' && <ScenarioDashboard />}

      {activeTab === 'mitigation' && (
        <MitigationCaptureRegister risks={risks} opportunities={opportunities} />
      )}

      {activeTab === 'export' && (
        <PdfExportSection risks={risks} opportunities={opportunities} />
      )}
    </div>
  );
}
