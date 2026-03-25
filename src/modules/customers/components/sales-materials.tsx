'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, StatCard } from '@/shared/ui';
import { leads } from '../data';
import type { CrmLead, ProposalData } from '../types';
import { FileText, Download, Eye, Home, Zap, PoundSterling } from 'lucide-react';

function generateProposal(lead: CrmLead): ProposalData {
  const isLargeSystem = lead.estimatedSystemSize === '13.5 kWh';
  const baseRevenue = lead.estimatedAnnualRevenue;

  return {
    leadName: lead.name,
    address: lead.address,
    postcode: lead.postcode,
    systemSize: lead.estimatedSystemSize,
    batteryCapacity: isLargeSystem ? '13.5 kWh (3 x 4.5 kWh modules)' : lead.estimatedSystemSize === '10.0 kWh' ? '10.0 kWh (2 x 5.0 kWh modules)' : '5.0 kWh (1 x 5.0 kWh module)',
    monthlyPayment: 100,
    bestAnnualSaving: Math.round(baseRevenue * 1.25),
    likelyAnnualSaving: baseRevenue,
    worstAnnualSaving: Math.round(baseRevenue * 0.75),
    bestPaybackYears: isLargeSystem ? 5.2 : 6.1,
    likelyPaybackYears: isLargeSystem ? 6.8 : 7.5,
    worstPaybackYears: isLargeSystem ? 8.5 : 9.2,
    co2SavedPerYear: isLargeSystem ? 1850 : 1200,
    referralLink: `rosestack.co.uk/refer/${lead.name.split(' ')[1]?.toUpperCase() ?? 'REF'}${lead.address.match(/\d+/)?.[0] ?? ''}`,
  };
}

function ProposalPreview({ proposal }: { proposal: ProposalData }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[var(--radius-lg)] bg-gradient-to-r from-rose/20 to-rose/5 border border-rose/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose">
            <span className="text-lg font-bold text-white">R</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">RoseStack Energy Proposal</h3>
            <p className="text-sm text-text-secondary">Personalised for {proposal.leadName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-tertiary">Property</p>
            <p className="text-text-primary font-medium">{proposal.address}</p>
            <p className="text-text-secondary">{proposal.postcode}</p>
          </div>
          <div>
            <p className="text-text-tertiary">Proposed System</p>
            <p className="text-text-primary font-medium">{proposal.batteryCapacity}</p>
            <p className="text-text-secondary">Battery storage + smart cycling</p>
          </div>
        </div>
      </div>

      {/* Financial Projections - Best/Likely/Worst */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Annual Energy Savings"
          bestValue={`£${proposal.bestAnnualSaving.toLocaleString()}`}
          likelyValue={`£${proposal.likelyAnnualSaving.toLocaleString()}`}
          worstValue={`£${proposal.worstAnnualSaving.toLocaleString()}`}
        />
        <StatCard
          label="System Payback Period"
          bestValue={`${proposal.bestPaybackYears} years`}
          likelyValue={`${proposal.likelyPaybackYears} years`}
          worstValue={`${proposal.worstPaybackYears} years`}
        />
        <StatCard
          label="Monthly Payment"
          bestValue={`£${proposal.monthlyPayment}`}
          likelyValue={`£${proposal.monthlyPayment}`}
          worstValue={`£${proposal.monthlyPayment}`}
        />
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How RoseStack Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose/20 text-xs font-bold text-rose-light">1</div>
            <p><span className="text-text-primary font-medium">We install a battery system</span> in your home at no upfront cost. The system is owned and maintained by RoseStack.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose/20 text-xs font-bold text-rose-light">2</div>
            <p><span className="text-text-primary font-medium">You pay £{proposal.monthlyPayment}/month</span> — a fixed, predictable amount. No hidden costs, no surprises.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose/20 text-xs font-bold text-rose-light">3</div>
            <p><span className="text-text-primary font-medium">We optimise your energy</span> automatically. The battery charges when electricity is cheap and discharges when expensive. You do not need to do anything.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose/20 text-xs font-bold text-rose-light">4</div>
            <p><span className="text-text-primary font-medium">You save on energy bills</span> while contributing to a greener grid. Estimated CO2 reduction: {proposal.co2SavedPerYear.toLocaleString()} kg/year.</p>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison: Buy Your Own vs RoseStack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium"></th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">Buy Your Own</th>
                  <th className="text-center py-2 px-3 text-rose-light font-medium">RoseStack</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Upfront cost</td>
                  <td className="py-2 px-3 text-center text-text-primary">£8,000 - £12,000</td>
                  <td className="py-2 px-3 text-center text-emerald-400 font-medium">£0</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Monthly cost</td>
                  <td className="py-2 px-3 text-center text-text-primary">£0 (but upfront invested)</td>
                  <td className="py-2 px-3 text-center text-text-primary">£{proposal.monthlyPayment}/month</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Maintenance</td>
                  <td className="py-2 px-3 text-center text-text-primary">Your responsibility</td>
                  <td className="py-2 px-3 text-center text-emerald-400 font-medium">Included</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Insurance</td>
                  <td className="py-2 px-3 text-center text-text-primary">Your responsibility</td>
                  <td className="py-2 px-3 text-center text-emerald-400 font-medium">Included</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Tariff optimisation</td>
                  <td className="py-2 px-3 text-center text-text-primary">Manual / DIY</td>
                  <td className="py-2 px-3 text-center text-emerald-400 font-medium">Automated by RoseStack</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-text-secondary">Technology risk</td>
                  <td className="py-2 px-3 text-center text-text-primary">Yours</td>
                  <td className="py-2 px-3 text-center text-emerald-400 font-medium">Ours</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Referral */}
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-primary p-4 text-center">
        <p className="text-sm text-text-secondary mb-1">Your unique referral link</p>
        <p className="text-base font-mono font-medium text-rose-light">{proposal.referralLink}</p>
        <p className="text-xs text-text-tertiary mt-1">Earn £200+ for every successful referral</p>
      </div>
    </div>
  );
}

export function SalesMaterials() {
  const qualifiedLeads = leads.filter(l =>
    l.stage === 'qualified' || l.stage === 'proposal-sent' || l.stage === 'contacted'
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>(qualifiedLeads[0]?.id ?? '');
  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const proposal = selectedLead ? generateProposal(selectedLead) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Sales Materials</h2>
          <p className="text-sm text-text-secondary">Homeowner pack and proposal builder</p>
        </div>
      </div>

      {/* Lead Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-text-secondary whitespace-nowrap">Generate proposal for:</label>
          <select
            value={selectedLeadId}
            onChange={e => setSelectedLeadId(e.target.value)}
            className="flex-1 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
          >
            {leads.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.postcode} ({l.stage})
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      </Card>

      {/* Proposal Preview */}
      {proposal && <ProposalPreview proposal={proposal} />}
    </div>
  );
}
