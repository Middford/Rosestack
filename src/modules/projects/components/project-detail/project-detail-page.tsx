'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutDashboard, CalendarClock, Wallet, Activity, GitCompareArrows } from 'lucide-react';
import { TabOverview } from './tab-overview';
import { TabPlanned } from './tab-planned';
import { TabBudget } from './tab-budget';
import { TabActuals } from './tab-actuals';
import { TabVariance } from './tab-variance';

// ── Project data shape ──────────────────────────────────────────────────────
export interface ProjectData {
  id: string;
  address: string;
  postcode: string;
  phase: string;
  status: string;
  tariffName: string | null;
  solarKwp: number | null;
  exportLimitKw: number | null;
  monthlyHomeownerPayment: number | null;
  targetInstallDate: string | null;
  dailyConsumptionKwh: number | null;
  hasHeatPump: boolean | null;
  evCount: number | null;
  insuranceCostAnnual: number | null;
  g99ApplicationCost: number | null;
  installationCostOverride: number | null;
  maintenanceCostOverride: number | null;
  solarCostOverride: number | null;
  epcRating: string | null;
  bedrooms: number | null;
  propertyType: string | null;
  // Octopus meter credentials
  octopusApiKey: string | null;
  importMpan: string | null;
  importSerialNumber: string | null;
  exportMpan: string | null;
  exportSerialNumber: string | null;
  octopusAccountNumber: string | null;
  lastMeterSync: string | null;
  // Joined data
  system: {
    totalCapacityKwh: number;
    inverterModel: string;
    installCost: number;
    annualMaintenanceCost: number;
    maxChargeRateKw: number;
    maxDischargeRateKw: number;
    roundTripEfficiency: number;
    batteryChemistry: string;
    solarPvKwp: number | null;
  } | null;
  lead: {
    name: string;
    pipelineStatus: string;
    email: string | null;
    phone: string | null;
  } | null;
}

// ── Tab definition ──────────────────────────────────────────────────────────
interface Tab {
  key: string;
  label: string;
  icon: ReactNode;
}

const TABS: Tab[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'planned', label: 'Planned', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'budget', label: 'Budget', icon: <Wallet className="h-4 w-4" /> },
  { key: 'actuals', label: 'Actuals', icon: <Activity className="h-4 w-4" /> },
  { key: 'variance', label: 'Variance', icon: <GitCompareArrows className="h-4 w-4" /> },
];

// ── Component ───────────────────────────────────────────────────────────────
interface ProjectDetailPageProps {
  project: ProjectData;
}

export function ProjectDetailPage({ project }: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{project.address}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {project.postcode} &middot; {project.phase} &middot; {project.status}
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Project tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium
                  transition-colors border-b-2
                  ${isActive
                    ? 'border-rose text-rose'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <TabOverview project={project} />}
        {activeTab === 'planned' && <TabPlanned project={project} />}
        {activeTab === 'budget' && <TabBudget project={project} />}
        {activeTab === 'actuals' && <TabActuals project={project} />}
        {activeTab === 'variance' && <TabVariance project={project} />}
      </div>
    </div>
  );
}
