'use client';

import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard, SimpleStatCard } from '@/shared/ui';
import { batteries, inverters } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs';
import { substations } from '@/modules/grid/substation-data';
import { leads } from '@/modules/customers/data';
import { SEEDED_RISKS, SEEDED_OPPORTUNITIES } from '@/modules/risk/data';
import { calculateRiskStats, calculateOpportunityStats, calculateNetPosition } from '@/modules/risk/scoring';
import { formatGbp } from '@/shared/utils/scenarios';
import {
  Battery, Zap, PoundSterling, Map, Lightbulb, Landmark, Shield, Users, Building2,
  AlertTriangle, TrendingUp, Home, ChevronRight, Activity,
} from 'lucide-react';

// --- Chart colour palette (vibrant Eclipse-inspired) ---
const COLORS = {
  rose: '#B91C4D',
  roseLight: '#E0366E',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  violet: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
  red: '#EF4444',
  indigo: '#6366F1',
};

const SCENARIO_COLORS = { best: '#10B981', likely: '#3B82F6', worst: '#F59E0B' };

export default function DashboardPage() {
  const liveHomes = leads.filter(l => l.stage === 'live').length;
  const contracted = leads.filter(l => l.stage === 'contracted' || l.stage === 'installation-scheduled').length;
  const pipelineLeads = leads.filter(l => l.stage !== 'live').length;
  const bestSpread = Math.max(...ALL_TARIFFS.map(t => t.arbitrageSpreadPence));
  const riskStats = calculateRiskStats(SEEDED_RISKS);
  const oppStats = calculateOpportunityStats(SEEDED_OPPORTUNITIES);
  const netPosition = calculateNetPosition(3200000, SEEDED_RISKS, SEEDED_OPPORTUNITIES);
  const netValue = netPosition.find(p => p.type === 'net')?.value ?? 0;

  // --- Portfolio Growth Projection (10 years) ---
  const growthData = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const homesB = Math.min(100, Math.round(year * 12));
    const homesL = Math.min(100, Math.round(5 + (year - 1) * 10.5));
    const homesW = Math.min(100, Math.round(3 + (year - 1) * 5));
    return {
      year: `Y${year}`,
      best: homesB * 7500,
      likely: homesL * 6500,
      worst: homesW * 4800,
      homes: homesL,
    };
  });

  // --- Revenue Breakdown Donut ---
  const revenueStreams = [
    { name: 'Agile Arbitrage', value: 65, color: COLORS.cyan },
    { name: 'Saving Sessions', value: 8, color: COLORS.violet },
    { name: 'ENWL Flexibility', value: 12, color: COLORS.emerald },
    { name: 'SEG Export', value: 5, color: COLORS.amber },
    { name: 'Solar Self-Use', value: 10, color: COLORS.orange },
  ];

  // --- Tariff Spread Comparison ---
  const tariffData = ALL_TARIFFS
    .filter(t => t.arbitrageSpreadPence > 0)
    .sort((a, b) => b.arbitrageSpreadPence - a.arbitrageSpreadPence)
    .slice(0, 6)
    .map(t => ({
      name: t.name.length > 15 ? t.name.slice(0, 15) + '...' : t.name,
      spread: t.arbitrageSpreadPence,
      fill: t.name.includes('Agile') ? COLORS.cyan : t.name.includes('Flux') ? COLORS.violet : COLORS.blue,
    }));

  // --- Pipeline Funnel ---
  const stages = [
    { name: 'New', count: leads.filter(l => l.stage === 'new').length, color: COLORS.blue },
    { name: 'Contacted', count: leads.filter(l => l.stage === 'contacted').length, color: COLORS.cyan },
    { name: 'Qualified', count: leads.filter(l => l.stage === 'qualified').length, color: COLORS.teal },
    { name: 'Proposal', count: leads.filter(l => l.stage === 'proposal-sent').length, color: COLORS.violet },
    { name: 'Contracted', count: leads.filter(l => l.stage === 'contracted').length, color: COLORS.emerald },
    { name: 'Installing', count: leads.filter(l => l.stage === 'installation-scheduled').length, color: COLORS.amber },
    { name: 'Live', count: leads.filter(l => l.stage === 'live').length, color: COLORS.rose },
  ];

  // --- Risk Heat Summary (aggregated by rating) ---
  const riskByRating = [
    { name: 'Critical', value: riskStats.critical, color: COLORS.red },
    { name: 'High', value: riskStats.high, color: COLORS.orange },
    { name: 'Medium', value: riskStats.medium, color: COLORS.amber },
    { name: 'Low', value: riskStats.low, color: COLORS.emerald },
  ];
  const oppByRating = [
    { name: 'Transformative', value: oppStats.transformative, color: '#FFD700' },
    { name: 'High', value: oppStats.high, color: COLORS.emerald },
    { name: 'Medium', value: oppStats.medium, color: COLORS.teal },
    { name: 'Low', value: oppStats.low, color: COLORS.blue },
  ];

  // --- Deployment Progress Radial ---
  const deploymentProgress = [
    { name: 'Deployed', value: (liveHomes / 100) * 100, fill: COLORS.rose },
  ];

  const tooltipStyle = {
    backgroundColor: '#232636',
    border: '1px solid #2A2D3E',
    borderRadius: '8px',
    color: '#F0F1F5',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">RoseStack Energy</h1>
          <p className="text-sm text-text-secondary mt-1">Fleet Dashboard — East Lancashire</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-subtle px-3 py-1 text-xs font-medium text-rose-light">
            <Activity className="h-3 w-3" /> Live
          </span>
        </div>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-subtle">
            <Home className="h-6 w-6 text-rose-light" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{liveHomes}<span className="text-sm text-text-tertiary font-normal"> / 100</span></p>
            <p className="text-xs text-text-secondary">Homes Deployed</p>
          </div>
        </div>

        <StatCard
          label="Monthly Revenue / Home"
          bestValue={formatGbp(833)}
          likelyValue={formatGbp(625)}
          worstValue={formatGbp(400)}
        />

        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">Best Tariff Spread</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{bestSpread.toFixed(1)}p<span className="text-sm font-normal">/kWh</span></p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Agile peak spread</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">Pipeline</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{pipelineLeads}</p>
          <p className="text-xs text-violet-400 mt-1">{contracted} contracted, {liveHomes} live</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">Net R&O Position</p>
          <p className={`text-2xl font-bold mt-1 ${netValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatGbp(netValue)}</p>
          <p className="text-xs text-text-tertiary mt-1">{SEEDED_RISKS.length} risks / {SEEDED_OPPORTUNITIES.length} opps</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Portfolio Revenue Projection — Full width on mobile, 2/3 on desktop */}
        <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Portfolio Revenue Projection (10yr)</h3>
            <Link href="/finance" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
              View Models <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradBest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCENARIO_COLORS.best} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SCENARIO_COLORS.best} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLikely" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCENARIO_COLORS.likely} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SCENARIO_COLORS.likely} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWorst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCENARIO_COLORS.worst} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={SCENARIO_COLORS.worst} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
              <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGbp(v), '']} />
              <Area type="monotone" dataKey="best" stroke={SCENARIO_COLORS.best} fill="url(#gradBest)" strokeWidth={1.5} dot={false} name="Best Case" />
              <Area type="monotone" dataKey="likely" stroke={SCENARIO_COLORS.likely} fill="url(#gradLikely)" strokeWidth={2.5} dot={false} name="Likely Case" />
              <Area type="monotone" dataKey="worst" stroke={SCENARIO_COLORS.worst} fill="url(#gradWorst)" strokeWidth={1.5} dot={false} name="Worst Case" />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown Donut */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Revenue Streams</h3>
            <Link href="/tariffs" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
              Tariffs <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={revenueStreams}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {revenueStreams.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {revenueStreams.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[11px] text-text-secondary truncate">{s.name}</span>
                <span className="text-[11px] text-text-primary font-medium ml-auto">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Tariff Spreads + Pipeline Funnel + R&O */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tariff Spread Comparison */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Tariff Arbitrage Spreads</h3>
            <Link href="/tariffs" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
              Compare <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tariffData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `${v}p`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9BA1B0', fontSize: 10 }} axisLine={false} width={100} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}p/kWh`, 'Spread']} />
              <Bar dataKey="spread" radius={[0, 4, 4, 0]} barSize={18}>
                {tariffData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Pipeline */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Sales Pipeline</h3>
            <Link href="/customers" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
              CRM <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stages.map(stage => {
              const maxCount = Math.max(...stages.map(s => s.count), 1);
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="text-[11px] text-text-secondary w-16 text-right">{stage.name}</span>
                  <div className="flex-1 h-5 rounded-full bg-bg-tertiary overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: stage.color }}
                    />
                  </div>
                  <span className="text-xs font-bold text-text-primary w-6 text-right">{stage.count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs">
            <span className="text-text-tertiary">Total pipeline</span>
            <span className="text-text-primary font-semibold">{leads.length} leads</span>
          </div>
        </div>

        {/* Risk & Opportunity Snapshot */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Risk & Opportunity</h3>
            <Link href="/risk" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
              Register <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Risks</p>
              <div className="space-y-1.5">
                {riskByRating.map(r => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-xs text-text-secondary">{r.name}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Opportunities</p>
              <div className="space-y-1.5">
                {oppByRating.map(o => (
                  <div key={o.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
                      <span className="text-xs text-text-secondary">{o.name}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: o.color }}>{o.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Net Expected Position</p>
            <p className={`text-xl font-bold mt-1 ${netValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatGbp(netValue)}</p>
          </div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-bg-secondary px-4 py-3 hover:bg-bg-hover hover:border-border-hover transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: `${link.color}20`, color: link.color }}>
              <link.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{link.title}</p>
              <p className="text-[10px] text-text-tertiary truncate">{link.stat}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const quickLinks = [
  { href: '/portfolio', title: 'Portfolio', icon: Building2, stat: '3 properties', color: COLORS.rose },
  { href: '/hardware', title: 'Hardware', icon: Battery, stat: '14 batteries', color: COLORS.cyan },
  { href: '/grid', title: 'Grid Map', icon: Map, stat: '15 substations', color: COLORS.emerald },
  { href: '/funding', title: 'Funding', icon: Landmark, stat: '13 lenders', color: COLORS.violet },
  { href: '/legal', title: 'Legal', icon: Shield, stat: '23 requirements', color: COLORS.amber },
];
