import { SimpleStatCard } from '@/shared/ui';

export default function DashboardPage() {
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
          value="0 / 100"
          subtitle="Target: 100 over 8 years"
        />
        <SimpleStatCard
          label="Monthly Revenue"
          value="--"
          subtitle="Awaiting first deployment"
        />
        <SimpleStatCard
          label="Avg Payback"
          value="--"
          subtitle="Projected: 14-26 months"
        />
        <SimpleStatCard
          label="Pipeline Value"
          value="--"
          subtitle="No active leads yet"
        />
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <a
            key={mod.href}
            href={mod.href}
            className="block rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5 hover:bg-bg-hover transition-colors"
          >
            <h3 className="text-sm font-semibold text-text-primary">{mod.title}</h3>
            <p className="text-xs text-text-tertiary mt-1">{mod.description}</p>
            <p className="text-xs text-rose-light mt-3">{mod.status}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

const modules = [
  { href: '/portfolio', title: 'Portfolio', description: 'Live property register, system assignment, revenue tracking', status: 'Ready for data' },
  { href: '/hardware', title: 'Hardware', description: 'Battery, inverter, solar PV comparison engine', status: 'Catalogue loading...' },
  { href: '/tariffs', title: 'Tariffs', description: 'UK energy tariff database and revenue calculator', status: 'Rates updating...' },
  { href: '/finance', title: 'Finance', description: 'Financial projections and scenario modelling', status: 'Models ready' },
  { href: '/grid', title: 'Grid', description: 'Substation mapping and property prospecting', status: 'Map loading...' },
  { href: '/strategy', title: 'Strategy', description: 'Competitive intelligence and moat building', status: 'Intel gathering...' },
  { href: '/funding', title: 'Funding', description: 'Lender readiness and deal structuring', status: 'Pipeline building...' },
  { href: '/legal', title: 'Legal', description: 'Regulatory compliance and certification pipeline', status: 'Compliance check...' },
  { href: '/risk', title: 'Risk & Opportunities', description: 'Threat and opportunity register with heat maps', status: 'Register seeding...' },
  { href: '/customers', title: 'Customers', description: 'Lead management and referral engine', status: 'CRM ready' },
];
