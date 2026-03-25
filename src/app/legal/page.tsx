'use client';

import { useState } from 'react';
import { cn } from '@/shared/ui';
import { ComplianceDashboard } from '@/modules/legal/compliance-dashboard';
import { G99Pipeline } from '@/modules/legal/g99-pipeline';
import { CertificationTracker } from '@/modules/legal/certification-tracker';
import { ContractLibrary } from '@/modules/legal/contract-library';
import { RiskRegister } from '@/modules/legal/risk-register';
import { RegulatoryCalendar } from '@/modules/legal/regulatory-calendar';
import {
  complianceRequirements,
  g99Applications,
  certifications,
  contractTemplates,
  legalRisks,
  regulatoryEvents,
} from '@/modules/legal/data';

type Tab = 'compliance' | 'g99' | 'certifications' | 'contracts' | 'risks' | 'calendar';

const tabs: { id: Tab; label: string }[] = [
  { id: 'compliance', label: 'Compliance' },
  { id: 'g99', label: 'G99 Pipeline' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'risks', label: 'Risk Register' },
  { id: 'calendar', label: 'Calendar' },
];

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<Tab>('compliance');

  const actionNeeded = complianceRequirements.filter((r) => r.status === 'action-needed').length;
  const pendingG99 = g99Applications.filter(
    (a) => a.stage !== 'connected' && a.stage !== 'rejected',
  ).length;
  const openRisks = legalRisks.filter((r) => r.status === 'open').length;
  const upcomingEvents = regulatoryEvents.filter((e) => !e.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Legal & Compliance</h1>
        <p className="text-sm text-text-secondary mt-1">
          Regulatory compliance, certification pipeline, contract library, and risk register
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-tertiary">Actions Needed</p>
          <p className="text-2xl font-bold text-danger">{actionNeeded}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-tertiary">G99 In Progress</p>
          <p className="text-2xl font-bold text-info">{pendingG99}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-tertiary">Open Risks</p>
          <p className="text-2xl font-bold text-warning">{openRisks}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-tertiary">Upcoming Events</p>
          <p className="text-2xl font-bold text-text-primary">{upcomingEvents}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 min-w-max" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-rose text-rose-light'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'compliance' && (
        <ComplianceDashboard requirements={complianceRequirements} />
      )}
      {activeTab === 'g99' && <G99Pipeline applications={g99Applications} />}
      {activeTab === 'certifications' && (
        <CertificationTracker certifications={certifications} />
      )}
      {activeTab === 'contracts' && <ContractLibrary contracts={contractTemplates} />}
      {activeTab === 'risks' && <RiskRegister risks={legalRisks} />}
      {activeTab === 'calendar' && <RegulatoryCalendar events={regulatoryEvents} />}
    </div>
  );
}
