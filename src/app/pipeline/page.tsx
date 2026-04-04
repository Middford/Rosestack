'use client';

import { useState, useEffect } from 'react';
import { SimpleStatCard } from '@/shared/ui';
import { LeadPipeline } from '@/modules/customers/components/lead-pipeline';
import { LeadScoring } from '@/modules/customers/components/lead-scoring';
import {
  PIPELINE_STAGE_DEFINITIONS,
} from '@/modules/customers/data';
import type { Lead } from '@/modules/customers/types';
import { CashflowModel } from '@/modules/projects/components/cashflow-model';
import { ModelBuilder } from '@/modules/finance/components/model-builder';
import { SensitivityAnalysis } from '@/modules/finance/components/sensitivity-analysis';
import { ScenarioDashboard } from '@/modules/finance/components/scenario-dashboard';
import { InvestorSummary } from '@/modules/finance/components/investor-summary';
import { PoundSterling, Home, ShieldCheck, Clock, TrendingUp, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGE_COLOURS = ['#6B7280', '#3B82F6', '#F59E0B', '#B91C4D', '#8B5CF6', '#10B981'];

const tooltipStyle = {
  backgroundColor: '#1A1D2E',
  border: '1px solid #2A2D3E',
  borderRadius: '8px',
  color: '#F0F1F5',
  fontSize: '12px',
};

type Tab = 'kanban' | 'scoring' | 'funnel' | 'cashflow' | 'model' | 'sensitivity' | 'scenarios' | 'investor';

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch('/api/pipeline')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const mapped = (Array.isArray(data) ? data : []).map((l: Record<string, unknown>) => ({
          ...l,
          createdAt: new Date(l.createdAt as string),
          updatedAt: new Date(l.updatedAt as string),
        })) as Lead[];
        setLeads(mapped);
      })
      .catch(() => {});
  }, []);

  // ── Pipeline metrics ──────────────────────────────────────────────────────────
  const activeLeads = leads.filter(l => l.status !== 'lost' && l.status !== 'on_hold');
  const liveCount = leads.filter(l => l.status === 'live').length;
  const contractedCount = leads.filter(l =>
    ['contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned'].includes(l.status)
  ).length;
  const proposalCount = leads.filter(l =>
    ['proposal_prepared', 'proposal_sent', 'proposal_reviewing'].includes(l.status)
  ).length;
  const discoveryCount = leads.filter(l =>
    ['new_lead', 'initial_contact', 'interested', 'property_assessed', 'visit_scheduled', 'visit_complete'].includes(l.status)
  ).length;

  // Pipeline value (each contracted/live system is ~£56k capital deployment)
  const pipelineValueGbp = (contractedCount + liveCount) * 56850;
  const activeRevenueGbp = liveCount * 15500; // likely scenario annual

  // G99 metrics
  const g99Pending = leads.filter(l => l.status === 'g99_submitted').length;
  const avgG99Prob = activeLeads.length > 0
    ? Math.round(activeLeads.reduce((s, l) => s + (l.g99Assessment?.probability ?? 0.5), 0) / activeLeads.length * 100)
    : 0;

  // Stage funnel data
  const stageFunnelData = PIPELINE_STAGE_DEFINITIONS.map(stage => ({
    name: stage.name,
    count: leads.filter(l => stage.statuses.includes(l.status)).length,
    stageNum: stage.number,
  }));

  // Conversion metrics
  const conversionRates = PIPELINE_STAGE_DEFINITIONS.slice(0, -1).map((stage, i) => {
    const thisCount = stageFunnelData[i]?.count ?? 0;
    const nextCount = stageFunnelData[i + 1]?.count ?? 0;
    const total = thisCount + nextCount;
    return {
      from: stage.name,
      to: PIPELINE_STAGE_DEFINITIONS[i + 1]?.name ?? '',
      rate: total > 0 ? Math.round((nextCount / (thisCount + nextCount + 1)) * 100) : 0,
    };
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'kanban', label: 'Kanban Board' },
    { id: 'funnel', label: 'Funnel & Metrics' },
    { id: 'scoring', label: 'Lead Scoring' },
    { id: 'cashflow', label: 'Cashflow Model' },
    { id: 'model', label: 'Model Builder' },
    { id: 'sensitivity', label: 'Sensitivity' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'investor', label: 'Investor Summary' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Prospecting Pipeline</h1>
        <p className="text-sm text-text-secondary mt-1">
          16-status prospecting pipeline — from new lead to live revenue-generating system
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Live Systems"
          value={liveCount.toString()}
          subtitle={`£${(activeRevenueGbp / 1000).toFixed(0)}k annual revenue`}
          trend="up"
        />
        <SimpleStatCard
          label="Contracted"
          value={contractedCount.toString()}
          subtitle={`£${(pipelineValueGbp / 1000).toFixed(0)}k pipeline value`}
          trend="up"
        />
        <SimpleStatCard
          label="Proposals Out"
          value={proposalCount.toString()}
          subtitle={`${discoveryCount} in discovery`}
        />
        <SimpleStatCard
          label="Avg G99 Probability"
          value={`${avgG99Prob}%`}
          subtitle={`${g99Pending} applications pending`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors rounded-t-[var(--radius-md)] ${
              activeTab === tab.id
                ? 'bg-bg-secondary text-rose-light border-b-2 border-rose'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'kanban' && <LeadPipeline />}

      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {/* Stage funnel chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Funnel by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageFunnelData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} leads`, 'Count']} />
                  <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                    {stageFunnelData.map((entry, i) => (
                      <Cell key={i} fill={STAGE_COLOURS[entry.stageNum] ?? '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stage detail table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-tertiary text-xs">
                      <th className="text-left py-2 pr-4">Stage</th>
                      <th className="text-right py-2 pr-4">Leads</th>
                      <th className="text-right py-2 pr-4">Committed</th>
                      <th className="text-right py-2 pr-4">Pipeline Value</th>
                      <th className="text-right py-2">Statuses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PIPELINE_STAGE_DEFINITIONS.map((stage, i) => {
                      const count = stageFunnelData[i]?.count ?? 0;
                      const value = stage.committed ? count * 56850 : 0;
                      return (
                        <tr key={stage.number} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: STAGE_COLOURS[stage.number] ?? '#6B7280' }}
                              />
                              <span className="text-text-primary font-medium">{stage.name}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono font-bold" style={{ color: STAGE_COLOURS[stage.number] ?? '#6B7280' }}>
                            {count}
                          </td>
                          <td className="py-2 pr-4 text-right text-text-tertiary text-xs">
                            {stage.committed ? (
                              <span className="text-rose-light">Yes</span>
                            ) : (
                              <span className="text-text-tertiary">No</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right text-text-secondary">
                            {value > 0 ? `£${value.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 text-right text-text-tertiary text-xs">
                            {stage.statuses.length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* G99 pipeline snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                G99 Application Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-[var(--radius-md)] bg-bg-tertiary">
                  <div className="text-2xl font-bold text-amber-400">
                    {leads.filter(l => l.status === 'g99_submitted').length}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Submitted</div>
                </div>
                <div className="text-center p-3 rounded-[var(--radius-md)] bg-bg-tertiary">
                  <div className="text-2xl font-bold text-emerald-400">
                    {leads.filter(l => l.status === 'g99_approved').length}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Approved</div>
                </div>
                <div className="text-center p-3 rounded-[var(--radius-md)] bg-bg-tertiary">
                  <div className="text-2xl font-bold text-text-primary">
                    {activeLeads.filter(l => (l.g99Assessment?.probability ?? 0) >= 0.75).length}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">High Prob (&gt;75%)</div>
                </div>
                <div className="text-center p-3 rounded-[var(--radius-md)] bg-bg-tertiary">
                  <div className="text-2xl font-bold text-rose-light">
                    {activeLeads.filter(l => (l.g99Assessment?.probability ?? 0) < 0.50).length}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">At Risk (&lt;50%)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'scoring' && <LeadScoring />}

      {activeTab === 'cashflow' && <CashflowModel />}

      {activeTab === 'model' && <ModelBuilder />}
      {activeTab === 'sensitivity' && <SensitivityAnalysis />}
      {activeTab === 'scenarios' && <ScenarioDashboard />}
      {activeTab === 'investor' && <InvestorSummary />}
    </div>
  );
}
