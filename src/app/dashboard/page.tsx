'use client';

import Link from 'next/link';
import { SimpleStatCard, StatCard } from '@/shared/ui';
import { batteries, inverters } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs';
import { substations } from '@/modules/grid/substation-data';
import { leads } from '@/modules/customers/data';
import { lenders } from '@/modules/funding/data';
import { SEEDED_RISKS, SEEDED_OPPORTUNITIES } from '@/modules/risk/data';
import { calculateNetPosition } from '@/modules/risk/scoring';
import { competitors, partnerships } from '@/modules/strategy/data';
import { formatGbp } from '@/shared/utils/scenarios';
import {
  Battery,
  Zap,
  PoundSterling,
  Map,
  Lightbulb,
  Landmark,
  Shield,
  Users,
  Building2,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const pipelineLeads = leads.filter(l => l.stage !== 'live').length;
  const liveHomes = leads.filter(l => l.stage === 'live').length;
  const bestSpread = Math.max(...ALL_TARIFFS.map(t => t.arbitrageSpreadPence));
  const netPosition = calculateNetPosition(3200000, SEEDED_RISKS, SEEDED_OPPORTUNITIES);
  const netValue = netPosition.find(p => p.type === 'net')?.value ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          RoseStack Energy — Fleet Overview
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Homes Deployed"
          value={`${liveHomes} / 100`}
          subtitle="Target: 100 over 8 years"
          trend={liveHomes > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Monthly Revenue (per home)"
          bestValue={formatGbp(3180)}
          likelyValue={formatGbp(2667)}
          worstValue={formatGbp(1890)}
        />
        <SimpleStatCard
          label="Best IOF Spread"
          value={`${bestSpread.toFixed(1)}p/kWh`}
          subtitle="Peak export vs cheap import"
          trend="up"
        />
        <SimpleStatCard
          label="Pipeline"
          value={`${pipelineLeads} leads`}
          subtitle={`${leads.filter(l => l.stage === 'contracted' || l.stage === 'installation-scheduled').length} contracted`}
          trend="up"
        />
      </div>

      {/* Module Cards */}
      <h2 className="text-lg font-semibold text-text-primary">Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="group block rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5 hover:bg-bg-hover hover:border-border-hover transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-bg-tertiary text-text-secondary group-hover:bg-rose-subtle group-hover:text-rose-light transition-colors">
                <mod.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">{mod.title}</h3>
            </div>
            <p className="text-xs text-text-tertiary">{mod.description}</p>
            <p className="text-xs text-rose-light mt-3 font-medium">{mod.stat}</p>
          </Link>
        ))}
      </div>

      {/* R&O Summary */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Risk & Opportunity Position</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-danger">{SEEDED_RISKS.length}</p>
            <p className="text-xs text-text-tertiary">Tracked Risks</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${netValue >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatGbp(netValue)}
            </p>
            <p className="text-xs text-text-tertiary">Net Expected Position</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-success">{SEEDED_OPPORTUNITIES.length}</p>
            <p className="text-xs text-text-tertiary">Tracked Opportunities</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const modules = [
  { href: '/portfolio', title: 'Portfolio', icon: Building2, description: 'Live property register, system assignment, revenue tracking', stat: `3 sample properties loaded` },
  { href: '/hardware', title: 'Hardware', icon: Battery, description: 'Battery, inverter, solar PV comparison engine', stat: `${14} batteries, ${9} inverters catalogued` },
  { href: '/tariffs', title: 'Tariffs', icon: Zap, description: 'UK energy tariff database and revenue calculator', stat: `${9} tariffs tracked` },
  { href: '/finance', title: 'Finance', icon: PoundSterling, description: 'Financial projections and scenario modelling', stat: 'Models ready — Best/Likely/Worst' },
  { href: '/grid', title: 'Grid', icon: Map, description: 'Substation mapping and property prospecting', stat: `${15} substations mapped` },
  { href: '/strategy', title: 'Strategy', icon: Lightbulb, description: 'Competitive intelligence and moat building', stat: `${4} competitors, ${6} partnerships tracked` },
  { href: '/funding', title: 'Funding', icon: Landmark, description: 'Lender readiness and deal structuring', stat: `${12} lenders in database` },
  { href: '/legal', title: 'Legal', icon: Shield, description: 'Regulatory compliance and certification pipeline', stat: '23 compliance requirements tracked' },
  { href: '/risk', title: 'Risk & Opps', icon: AlertTriangle, description: 'Threat and opportunity register with heat maps', stat: `${35}+ risks, ${30}+ opportunities seeded` },
  { href: '/customers', title: 'Customers', icon: Users, description: 'Lead management and referral engine', stat: 'CRM with pipeline + referral engine' },
];
