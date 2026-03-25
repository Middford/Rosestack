'use client';

import { useState } from 'react';
import { Button, SimpleStatCard } from '@/shared/ui';
import { LeadPipeline } from '@/modules/customers/components/lead-pipeline';
import { LeadScoring } from '@/modules/customers/components/lead-scoring';
import { ReferralDashboard } from '@/modules/customers/components/referral-dashboard';
import { CampaignTracker } from '@/modules/customers/components/campaign-tracker';
import { ClubPartnerships } from '@/modules/customers/components/club-partnerships';
import { RevenueAttribution } from '@/modules/customers/components/revenue-attribution';
import { SalesMaterials } from '@/modules/customers/components/sales-materials';
import { EmailTemplates } from '@/modules/customers/components/email-templates';
import { leads, referrals, campaigns, clubPartnerships } from '@/modules/customers/data';

type Tab = 'pipeline' | 'scoring' | 'referrals' | 'campaigns' | 'clubs' | 'revenue' | 'materials' | 'emails';

const tabs: { key: Tab; label: string }[] = [
  { key: 'pipeline', label: 'Lead Pipeline' },
  { key: 'scoring', label: 'Lead Scoring' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'clubs', label: 'Clubs' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'materials', label: 'Sales Materials' },
  { key: 'emails', label: 'Email Templates' },
];

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');

  const liveHomes = leads.filter(l => l.stage === 'live').length;
  const contracted = leads.filter(l => l.stage === 'contracted' || l.stage === 'installation-scheduled').length;
  const activePipeline = leads.filter(l => l.stage !== 'live').length;
  const totalReferrals = referrals.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Customer Acquisition</h1>
        <p className="text-sm text-text-secondary mt-1">
          Lead management, sales pipeline, referral engine, and acquisition analytics
        </p>
      </div>

      {/* Top-level Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard label="Live Homes" value={liveHomes.toString()} subtitle="generating revenue" trend="up" />
        <SimpleStatCard label="Contracted" value={contracted.toString()} subtitle="pending installation" trend="up" />
        <SimpleStatCard label="Active Pipeline" value={activePipeline.toString()} subtitle={`${leads.length} total leads`} />
        <SimpleStatCard label="Referrals" value={totalReferrals.toString()} subtitle={`${referrals.filter(r => r.status === 'converted').length} converted`} trend="up" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors rounded-t-[var(--radius-md)] ${
              activeTab === tab.key
                ? 'bg-bg-secondary text-rose-light border-b-2 border-rose'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pipeline' && <LeadPipeline />}
      {activeTab === 'scoring' && <LeadScoring />}
      {activeTab === 'referrals' && <ReferralDashboard />}
      {activeTab === 'campaigns' && <CampaignTracker />}
      {activeTab === 'clubs' && <ClubPartnerships />}
      {activeTab === 'revenue' && <RevenueAttribution />}
      {activeTab === 'materials' && <SalesMaterials />}
      {activeTab === 'emails' && <EmailTemplates />}
    </div>
  );
}
