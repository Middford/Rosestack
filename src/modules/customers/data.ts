// ============================================================
// Customer Acquisition — Data Layer
//
// All seeded demo data removed. Leads are now created via the
// Projects wizard (POST /api/projects) and read from the DB.
//
// Retained: pipeline definitions, email templates, helper functions
// ============================================================

import type {
  CrmLead,
  Lead,
  Referral,
  ReferrerProfile,
  Campaign,
  ClubPartnership,
  EmailTemplate,
  PipelineStage,
  PipelineStatus,
  PipelineStageDefinition,
} from './types';
import type { LeadSource } from '@/shared/types';

// ── Pipeline stage definitions (6-stage model) ──────────────────────────────

export const PIPELINE_STAGE_DEFINITIONS: PipelineStageDefinition[] = [
  {
    number: 0,
    name: 'Discovery',
    description: 'Initial lead capture through to property assessment',
    statuses: ['new_lead', 'initial_contact', 'interested', 'property_assessed'],
    color: 'bg-slate-500',
    committed: false,
    variant: 'default' as const,
  },
  {
    number: 1,
    name: 'Site Visit',
    description: 'Physical property survey and assessment',
    statuses: ['visit_scheduled', 'visit_complete'],
    color: 'bg-blue-500',
    committed: false,
    variant: 'info' as const,
  },
  {
    number: 2,
    name: 'Proposal',
    description: 'Financial proposal prepared and sent',
    statuses: ['proposal_prepared', 'proposal_sent', 'proposal_reviewing'],
    color: 'bg-amber-500',
    committed: false,
    variant: 'warning' as const,
  },
  {
    number: 3,
    name: 'Contract',
    description: 'Agreement negotiation and signing',
    statuses: ['verbal_agreement', 'contract_sent', 'contracted'],
    color: 'bg-rose',
    committed: true,
    variant: 'rose' as const,
  },
  {
    number: 4,
    name: 'Installation',
    description: 'G99, hardware procurement, installation',
    statuses: ['g99_submitted', 'g99_approved', 'installation_scheduled'],
    color: 'bg-violet-500',
    committed: true,
    variant: 'info' as const,
  },
  {
    number: 5,
    name: 'Live',
    description: 'Installed, commissioned, and generating revenue',
    statuses: ['installed', 'commissioned', 'live'],
    color: 'bg-emerald-500',
    committed: true,
    variant: 'success' as const,
  },
];

export const STATUS_LABELS: Record<PipelineStatus, string> = {
  new_lead: 'New Lead',
  initial_contact: 'Initial Contact',
  interested: 'Interested',
  property_assessed: 'Property Assessed',
  visit_scheduled: 'Visit Scheduled',
  visit_complete: 'Visit Complete',
  proposal_prepared: 'Proposal Prepared',
  proposal_sent: 'Proposal Sent',
  proposal_reviewing: 'Proposal Reviewing',
  verbal_agreement: 'Verbal Agreement',
  contract_sent: 'Contract Sent',
  contracted: 'Contracted',
  g99_submitted: 'G99 Submitted',
  g99_approved: 'G99 Approved',
  installation_scheduled: 'Installation Scheduled',
  installed: 'Installed',
  commissioned: 'Commissioned',
  live: 'Live',
  on_hold: 'On Hold',
  lost: 'Lost',
};

// ── Empty data arrays (populated from DB via /api/projects) ──────────────────

export const leads: CrmLead[] = [];
export const newLeads: Lead[] = [];
export const referrals: Referral[] = [];
export const campaigns: Campaign[] = [];
export const clubPartnerships: ClubPartnership[] = [];

// ── Email Templates (retained — these are templates, not data) ──────────────

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'tpl-welcome',
    name: 'Welcome Pack',
    type: 'welcome',
    subject: 'Welcome to RoseStack Energy — Your Installation Guide',
    sections: [
      { heading: 'Welcome to RoseStack', content: 'Congratulations on your new RoseStack energy system! This email contains everything you need to know about what happens next.' },
      { heading: 'What to Expect', content: 'Your battery system has been installed and is now being optimised for your energy tariff. Over the next few days, our team will fine-tune the charging and discharging schedule to maximise your savings.' },
      { heading: 'How It Works', content: 'Your battery charges when electricity is cheapest (typically overnight) and discharges when it is most expensive. You do not need to do anything — our system handles this automatically.' },
      { heading: 'Your Monthly Payment', content: 'Your fixed monthly payment of [AMOUNT] covers everything: the battery system, maintenance, insurance, and monitoring. No hidden costs.' },
      { heading: 'Need Help?', content: 'Contact us at hello@rosestack.co.uk or call 01200 200 300. We aim to respond within 24 hours.' },
      { heading: 'Refer a Friend', content: 'Know someone who could benefit? Share your unique referral link: rosestack.co.uk/refer/[CODE].' },
    ],
  },
  {
    id: 'tpl-monthly',
    name: 'Monthly Statement',
    type: 'monthly-statement',
    subject: 'Your RoseStack Monthly Statement — [MONTH] [YEAR]',
    sections: [
      { heading: 'Monthly Summary', content: 'Here is your RoseStack energy statement for [MONTH] [YEAR].' },
      { heading: 'Payment', content: 'Monthly payment received: [AMOUNT]. Cumulative payments to date: [CUMULATIVE].' },
      { heading: 'System Performance', content: 'System status: [STATUS]. Energy arbitraged this month: [KWH] kWh. Estimated savings generated: [SAVINGS].', showScenarios: true },
      { heading: 'Referral Balance', content: 'Referral rewards earned: [REWARDS]. Share your link: rosestack.co.uk/refer/[CODE].' },
    ],
  },
  {
    id: 'tpl-annual',
    name: 'Annual Summary',
    type: 'annual-summary',
    subject: 'Your RoseStack Annual Summary — [YEAR]',
    sections: [
      { heading: 'Year in Review', content: 'Here is your annual summary for [YEAR] with your RoseStack energy system.' },
      { heading: 'Financial Summary', content: 'Total payments received: [TOTAL]. System value to date: [VALUE].', showScenarios: true },
      { heading: 'Environmental Impact', content: 'Estimated CO2 saved: [CO2] kg. Equivalent to [TREES] trees planted.' },
      { heading: 'System Health', content: 'Battery health: [HEALTH]%. Maintenance visits: [VISITS]. Next scheduled maintenance: [NEXT_MAINT].' },
      { heading: 'Contract Update', content: 'Contract anniversary: [ANNIVERSARY]. Remaining term: [REMAINING] years.' },
    ],
  },
  {
    id: 'tpl-referral',
    name: 'Referral Invite',
    type: 'referral-invite',
    subject: '[REFERRER_NAME] thinks you would love RoseStack Energy',
    sections: [
      { heading: 'You Have Been Referred', content: '[REFERRER_NAME] is a RoseStack homeowner and thought you might be interested.' },
      { heading: 'What Is RoseStack?', content: 'We install a battery storage system in your home at no upfront cost. You pay a fixed monthly amount and we handle everything.' },
      { heading: 'Get in Touch', content: 'Interested? Reply to this email or call us on 01200 200 300. No obligation, no pressure.' },
    ],
  },
];

// ── Helper functions (work with empty arrays, will work with DB data later) ──

export function getLeadsByStage(stage: PipelineStage): CrmLead[] {
  return leads.filter(l => l.stage === stage);
}

export function getLeadsByStatus(status: PipelineStatus): Lead[] {
  return newLeads.filter(l => l.status === status);
}

export function getLeadsByStageNumber(stageNum: number): Lead[] {
  return newLeads.filter(l => {
    const stage = PIPELINE_STAGE_DEFINITIONS.find(s => s.statuses.includes(l.status as PipelineStatus));
    return stage?.number === stageNum;
  });
}

export function getLeadById(id: string): CrmLead | undefined {
  return leads.find(l => l.id === id);
}

export function getNewLeadById(id: string): Lead | undefined {
  return newLeads.find(l => l.id === id);
}

export function getReferrerProfiles(): ReferrerProfile[] {
  return [];
}

export function getRevenueAttribution(): import('./types').RevenueAttribution[] {
  return [];
}

export function calculateReferralReward(referralNumber: number): number {
  if (referralNumber <= 1) return 200;
  if (referralNumber === 2) return 250;
  return 300;
}
