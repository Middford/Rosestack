'use client';

import { useState } from 'react';
import { Button, SimpleStatCard } from '@/shared/ui';
import { HardwareCatalogue } from '@/modules/hardware/components/hardware-catalogue';
import { SystemBuilder } from '@/modules/hardware/components/system-builder';
import { ComparisonTool } from '@/modules/hardware/components/comparison-tool';
import { CostTracker } from '@/modules/hardware/components/cost-tracker';
import { CompatibilityMatrix } from '@/modules/hardware/components/compatibility-matrix';
import { batteries, inverters, solarPanels, heatPumps } from '@/modules/hardware/data';

type Tab = 'catalogue' | 'builder' | 'compare' | 'cost' | 'compatibility';

const tabs: { key: Tab; label: string }[] = [
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'builder', label: 'System Builder' },
  { key: 'compare', label: 'Compare' },
  { key: 'cost', label: 'Cost Tracker' },
  { key: 'compatibility', label: 'Compatibility' },
];

export default function HardwarePage() {
  const [activeTab, setActiveTab] = useState<Tab>('catalogue');

  const iofBatteries = batteries.filter(b => b.iofCompatible).length;
  const iofInverters = inverters.filter(i => i.iofCompatible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Hardware</h1>
        <p className="text-sm text-text-secondary mt-1">
          Battery, inverter, solar PV, and heat pump database
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SimpleStatCard label="Batteries" value={String(batteries.length)} subtitle={`${iofBatteries} IOF compatible`} trend="up" />
        <SimpleStatCard label="Inverters" value={String(inverters.length)} subtitle={`${iofInverters} IOF compatible`} trend="up" />
        <SimpleStatCard label="Solar Panels" value={String(solarPanels.length)} />
        <SimpleStatCard label="Heat Pumps" value={String(heatPumps.length)} />
        <SimpleStatCard label="IOF Combos" value={String(iofBatteries + iofInverters)} subtitle="Battery + inverter IOF pairs" trend="up" />
        <SimpleStatCard label="Chemistries" value="3" subtitle="LFP, NMC, NaIon" />
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
        {activeTab === 'catalogue' && <HardwareCatalogue />}
        {activeTab === 'builder' && <SystemBuilder />}
        {activeTab === 'compare' && <ComparisonTool />}
        {activeTab === 'cost' && <CostTracker />}
        {activeTab === 'compatibility' && <CompatibilityMatrix />}
      </div>
    </div>
  );
}
