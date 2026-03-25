'use client';

import { useState } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { CellComparison } from '@/modules/product-design/components/cell-comparison';
import { PackDesigner } from '@/modules/product-design/components/pack-designer';
import { CostModel } from '@/modules/product-design/components/cost-model';
import { InverterCompatibility } from '@/modules/product-design/components/inverter-compatibility';
import { RegulatoryRoadmap } from '@/modules/product-design/components/regulatory-roadmap';
import { ManufacturingOptions } from '@/modules/product-design/components/manufacturing-options';
import { sodiumIonCells, inverterOptions, regulatoryMilestones, costModels } from '@/modules/product-design/data';

type Tab = 'cells' | 'pack' | 'cost' | 'inverters' | 'regulatory' | 'manufacturing';

const tabs: { key: Tab; label: string }[] = [
  { key: 'cells', label: 'Cell Comparison' },
  { key: 'pack', label: 'Pack Designer' },
  { key: 'cost', label: 'Cost Model' },
  { key: 'inverters', label: 'Inverter Compatibility' },
  { key: 'regulatory', label: 'Regulatory Roadmap' },
  { key: 'manufacturing', label: 'Manufacturing' },
];

export default function ProductDesignPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cells');

  const massProduction = sodiumIonCells.filter(c => c.status === 'mass-production').length;
  const compatibleInverters = inverterOptions.filter(i => i.sodiumIonCompatibility !== 'incompatible').length;
  const regCost = regulatoryMilestones.reduce((s, m) => s + m.estimatedCostGbp, 0);
  const bestModel = costModels.reduce((best, m) => m.savingsPercent > best.savingsPercent ? m : best, costModels[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Product Design</h1>
        <p className="text-sm text-text-secondary mt-1">
          RoseStack own-brand sodium-ion battery system — Year 5 target (2030)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SimpleStatCard label="Na-ion Suppliers" value={String(sodiumIonCells.length)} subtitle={`${massProduction} in mass production`} trend="up" />
        <SimpleStatCard label="Best Cell" value="CATL" subtitle="175 Wh/kg, 10k cycles" trend="up" />
        <SimpleStatCard label="Compatible Inverters" value={String(compatibleInverters)} subtitle="of 6 evaluated" />
        <SimpleStatCard label="Target Savings" value={`${bestModel.savingsPercent}%`} subtitle="vs Sigenergy £295/kWh" trend="up" />
        <SimpleStatCard label="Cert Budget" value={`£${Math.round(regCost / 1000)}k`} subtitle="9 milestones" />
        <SimpleStatCard label="Target Launch" value="2030" subtitle="Year 5" />
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
        {activeTab === 'cells' && <CellComparison />}
        {activeTab === 'pack' && <PackDesigner />}
        {activeTab === 'cost' && <CostModel />}
        {activeTab === 'inverters' && <InverterCompatibility />}
        {activeTab === 'regulatory' && <RegulatoryRoadmap />}
        {activeTab === 'manufacturing' && <ManufacturingOptions />}
      </div>
    </div>
  );
}
